import http from "http";
import path from "path";
import express, { type Request, type Response, type NextFunction } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import { config as dotenvConfig } from "dotenv";
import { RoomManager, type Room } from "./rooms";
import { MESSAGE_TYPES } from "./protocol";

try {
  dotenvConfig({ path: path.join(__dirname, "..", ".env") });
} catch {
  /* opcional */
}

const PORT = Number(process.env.PORT) || 3777;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

const app = express();
/** Raiz do repositório (bang.html, assets) — `dist/index.js` → sobe dois níveis até a raiz do jogo */
const repoRoot = path.join(__dirname, "..", "..");

app.use((req: Request, res: Response, next: NextFunction) => {
  if (CORS_ORIGIN) res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  else {
    const requestOrigin = req.headers.origin;
    if (requestOrigin) res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(repoRoot));

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(repoRoot, "bang.html"));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new RoomManager();

const wsToId = new Map<WebSocket, string>();
let nextSocketId = 1;

function getSocketId(webSocketClient: WebSocket): string {
  let socketId = wsToId.get(webSocketClient);
  if (!socketId) {
    socketId = `s${nextSocketId++}`;
    wsToId.set(webSocketClient, socketId);
  }
  return socketId;
}

function sendJson(webSocketClient: WebSocket, payload: object): void {
  if (webSocketClient.readyState === 1) webSocketClient.send(JSON.stringify(payload));
}

function logIncomingMessage(socketId: string, payload: unknown): void {
  const now = new Date().toISOString();
  let serializedPayload = "";
  try {
    serializedPayload = JSON.stringify(payload);
  } catch {
    serializedPayload = "[unserializable-payload]";
  }
  console.log(`[${now}] [ws:incoming] socket=${socketId} payload=${serializedPayload}`);
}

type ClientMessage = {
  type?: string;
  sessionToken?: string;
  roomId?: string;
  displayName?: string;
  action?: unknown;
};

function broadcastToRoom(room: Room, makePayload: (recipientSocketId: string) => object): void {
  for (const socketId of room.players.keys()) {
    wss.clients.forEach((client) => {
      const ws = client as WebSocket;
      if (wsToId.get(ws) === socketId) sendJson(ws, makePayload(socketId));
    });
  }
}

function roomPayloadFor(room: Room, socketId: string) {
  return {
    ...room.getRoomUpdatePayload(socketId),
    sessionToken: room.getSessionToken(socketId),
  };
}

function handleMessage(webSocketClient: WebSocket, message: ClientMessage): void {
  const socketId = getSocketId(webSocketClient);
  const messageType = message.type;

  if (messageType === MESSAGE_TYPES.RECONNECT && message.sessionToken && message.roomId) {
    const reconnectOutcome = rooms.reconnectSocket(message.roomId, message.sessionToken, socketId);
    if ("error" in reconnectOutcome)
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: reconnectOutcome.error });
    const { room } = reconnectOutcome;
    sendJson(webSocketClient, { type: MESSAGE_TYPES.RECONNECTED, roomId: room.roomId });
    sendJson(webSocketClient, roomPayloadFor(room, socketId));
    if (room.started && room.engine) {
      const gameSnapshot = room.getSnapshotFor(socketId);
      if (gameSnapshot) sendJson(webSocketClient, { type: MESSAGE_TYPES.GAME_STATE, ...gameSnapshot });
    }
    return;
  }

  if (messageType === MESSAGE_TYPES.CREATE_ROOM) {
    const room = rooms.createRoom(socketId, message.displayName || "Anfitrião");
    return sendJson(webSocketClient, roomPayloadFor(room, socketId));
  }

  if (messageType === MESSAGE_TYPES.JOIN_ROOM) {
    const joinOutcome = rooms.joinRoom(message.roomId!, socketId, message.displayName);
    if ("error" in joinOutcome)
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: joinOutcome.error });
    broadcastToRoom(joinOutcome.room, (recipientSocketId) =>
      roomPayloadFor(joinOutcome.room, recipientSocketId),
    );
    return sendJson(webSocketClient, roomPayloadFor(joinOutcome.room, socketId));
  }

  if (messageType === MESSAGE_TYPES.LEAVE_ROOM) {
    const room = rooms.getRoomForSocket(socketId);
    rooms.leaveRoom(socketId);
    if (room)
      broadcastToRoom(room, (recipientSocketId) => roomPayloadFor(room, recipientSocketId));
    return;
  }

  if (messageType === MESSAGE_TYPES.START_GAME) {
    const room = rooms.getRoomForSocket(socketId);
    if (!room)
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: "Não está em uma sala" });
    const startOutcome = room.startGame(socketId);
    if (startOutcome.error)
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: startOutcome.error });
    broadcastToRoom(room, (recipientSocketId) => roomPayloadFor(room, recipientSocketId));
    broadcastToRoom(room, (recipientSocketId) => {
      const gameSnapshot = room.getSnapshotFor(recipientSocketId);
      return { type: MESSAGE_TYPES.GAME_STATE, ...gameSnapshot };
    });
    return;
  }

  if (messageType === MESSAGE_TYPES.GAME_ACTION) {
    const room = rooms.getRoomForSocket(socketId);
    if (!room)
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: "Não está em uma sala" });
    const actionOutcome = room.applyGameAction(
      socketId,
      message.action as import("./game/types").ClientGameAction,
    );
    if (actionOutcome.error != null && actionOutcome.error !== "")
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: actionOutcome.error });
    broadcastToRoom(room, (recipientSocketId) => {
      const gameSnapshot = room.getSnapshotFor(recipientSocketId);
      return { type: MESSAGE_TYPES.GAME_STATE, ...gameSnapshot };
    });
    return;
  }

  sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: "Tipo de mensagem desconhecido" });
}

wss.on("connection", (webSocketClient: WebSocket) => {
  const socketId = getSocketId(webSocketClient);
  console.log(`[${new Date().toISOString()}] [ws:connect] socket=${socketId}`);
  webSocketClient.on("message", (rawData) => {
    const messageSocketId = getSocketId(webSocketClient);
    let parsedMessage: ClientMessage;
    try {
      parsedMessage = JSON.parse(rawData.toString()) as ClientMessage;
    } catch {
      console.warn(
        `[${new Date().toISOString()}] [ws:invalid-json] socket=${messageSocketId} raw=${String(rawData)}`,
      );
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: "JSON inválido" });
    }
    logIncomingMessage(messageSocketId, parsedMessage);
    if (parsedMessage.type === MESSAGE_TYPES.PING) {
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.PONG, serverTimeMs: Date.now() });
    }
    try {
      handleMessage(webSocketClient, parsedMessage);
    } catch (error: unknown) {
      console.error(error);
      const messageText = error instanceof Error ? error.message : "Erro no servidor";
      sendJson(webSocketClient, {
        type: MESSAGE_TYPES.ERROR,
        message: messageText,
      });
    }
  });
  webSocketClient.on("close", () => {
    const disconnectedSocketId = wsToId.get(webSocketClient);
    if (disconnectedSocketId) {
      console.log(`[${new Date().toISOString()}] [ws:close] socket=${disconnectedSocketId}`);
      rooms.handleDisconnect(disconnectedSocketId);
      wsToId.delete(webSocketClient);
    }
  });
});

server.listen(PORT, () => {
  console.log(`BANG! servidor em http://localhost:${PORT}`);
});

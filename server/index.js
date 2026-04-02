"use strict";

const http = require("http");
const path = require("path");
const express = require("express");
const { WebSocketServer } = require("ws");
const { RoomManager } = require("./rooms");
const { MESSAGE_TYPES } = require("./protocol");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  /* optional */
}

const PORT = Number(process.env.PORT) || 3777;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

const app = express();
const repoRoot = path.join(__dirname, "..");

app.use((req, res, next) => {
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

app.get("/", (_req, res) => {
  res.sendFile(path.join(repoRoot, "bang.html"));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new RoomManager();

/** @type {Map<object, string>} */
const wsToId = new Map();
let nextSocketId = 1;

function getSocketId(webSocketClient) {
  let socketId = wsToId.get(webSocketClient);
  if (!socketId) {
    socketId = `s${nextSocketId++}`;
    wsToId.set(webSocketClient, socketId);
  }
  return socketId;
}

function sendJson(webSocketClient, payload) {
  if (webSocketClient.readyState === 1) webSocketClient.send(JSON.stringify(payload));
}

function logIncomingMessage(socketId, payload) {
  const now = new Date().toISOString();
  let serializedPayload = "";
  try {
    serializedPayload = JSON.stringify(payload);
  } catch {
    serializedPayload = "[unserializable-payload]";
  }
  console.log(`[${now}] [ws:incoming] socket=${socketId} payload=${serializedPayload}`);
}

function broadcastToRoom(room, makePayload) {
  for (const socketId of room.players.keys()) {
    wss.clients.forEach((client) => {
      if (wsToId.get(client) === socketId) sendJson(client, makePayload(socketId));
    });
  }
}

function roomPayloadFor(room, socketId) {
  return {
    ...room.getRoomUpdatePayload(socketId),
    sessionToken: room.getSessionToken(socketId),
  };
}

function handleMessage(webSocketClient, message) {
  const socketId = getSocketId(webSocketClient);
  const messageType = message.type;

  if (messageType === MESSAGE_TYPES.RECONNECT && message.sessionToken && message.roomId) {
    const reconnectOutcome = rooms.reconnectSocket(message.roomId, message.sessionToken, socketId);
    if (reconnectOutcome.error)
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
    const joinOutcome = rooms.joinRoom(message.roomId, socketId, message.displayName);
    if (joinOutcome.error)
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
    if (!room) return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: "Não está em uma sala" });
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
    if (!room) return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: "Não está em uma sala" });
    const actionOutcome = room.applyGameAction(socketId, message.action);
    if (actionOutcome.error)
      return sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: actionOutcome.error });
    broadcastToRoom(room, (recipientSocketId) => {
      const gameSnapshot = room.getSnapshotFor(recipientSocketId);
      return { type: MESSAGE_TYPES.GAME_STATE, ...gameSnapshot };
    });
    return;
  }

  sendJson(webSocketClient, { type: MESSAGE_TYPES.ERROR, message: "Tipo de mensagem desconhecido" });
}

wss.on("connection", (webSocketClient) => {
  const socketId = getSocketId(webSocketClient);
  console.log(`[${new Date().toISOString()}] [ws:connect] socket=${socketId}`);
  webSocketClient.on("message", (rawData) => {
    const messageSocketId = getSocketId(webSocketClient);
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(rawData.toString());
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
    } catch (error) {
      console.error(error);
      sendJson(webSocketClient, {
        type: MESSAGE_TYPES.ERROR,
        message: error.message || "Erro no servidor",
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

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
    const o = req.headers.origin;
    if (o) res.setHeader("Access-Control-Allow-Origin", o);
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

function getSocketId(ws) {
  let id = wsToId.get(ws);
  if (!id) {
    id = `s${nextSocketId++}`;
    wsToId.set(ws, id);
  }
  return id;
}

function sendJson(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
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

function handleMessage(ws, msg) {
  const socketId = getSocketId(ws);
  const t = msg.type;

  if (t === MESSAGE_TYPES.RECONNECT && msg.sessionToken && msg.roomId) {
    const r = rooms.reconnectSocket(msg.roomId, msg.sessionToken, socketId);
    if (r.error) return sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: r.error });
    const { room } = r;
    sendJson(ws, { type: MESSAGE_TYPES.RECONNECTED, roomId: room.roomId });
    sendJson(ws, roomPayloadFor(room, socketId));
    if (room.started && room.engine) {
      const snap = room.getSnapshotFor(socketId);
      if (snap) sendJson(ws, { type: MESSAGE_TYPES.GAME_STATE, ...snap });
    }
    return;
  }

  if (t === MESSAGE_TYPES.CREATE_ROOM) {
    const room = rooms.createRoom(socketId, msg.displayName || "Anfitrião");
    return sendJson(ws, roomPayloadFor(room, socketId));
  }

  if (t === MESSAGE_TYPES.JOIN_ROOM) {
    const r = rooms.joinRoom(msg.roomId, socketId, msg.displayName);
    if (r.error) return sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: r.error });
    broadcastToRoom(r.room, (sid) => roomPayloadFor(r.room, sid));
    return sendJson(ws, roomPayloadFor(r.room, socketId));
  }

  if (t === MESSAGE_TYPES.LEAVE_ROOM) {
    const room = rooms.getRoomForSocket(socketId);
    rooms.leaveRoom(socketId);
    if (room) broadcastToRoom(room, (sid) => roomPayloadFor(room, sid));
    return;
  }

  if (t === MESSAGE_TYPES.START_GAME) {
    const room = rooms.getRoomForSocket(socketId);
    if (!room) return sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: "Não está em uma sala" });
    const result = room.startGame(socketId);
    if (result.error) return sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: result.error });
    broadcastToRoom(room, (sid) => roomPayloadFor(room, sid));
    broadcastToRoom(room, (sid) => {
      const snap = room.getSnapshotFor(sid);
      return { type: MESSAGE_TYPES.GAME_STATE, ...snap };
    });
    return;
  }

  if (t === MESSAGE_TYPES.GAME_ACTION) {
    const room = rooms.getRoomForSocket(socketId);
    if (!room) return sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: "Não está em uma sala" });
    const res = room.applyGameAction(socketId, msg.action);
    if (res.error) return sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: res.error });
    broadcastToRoom(room, (sid) => {
      const snap = room.getSnapshotFor(sid);
      return { type: MESSAGE_TYPES.GAME_STATE, ...snap };
    });
    return;
  }

  sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: "Tipo de mensagem desconhecido" });
}

wss.on("connection", (ws) => {
  const socketId = getSocketId(ws);
  console.log(`[${new Date().toISOString()}] [ws:connect] socket=${socketId}`);
  ws.on("message", (raw) => {
    const sid = getSocketId(ws);
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      console.warn(
        `[${new Date().toISOString()}] [ws:invalid-json] socket=${sid} raw=${String(raw)}`,
      );
      return sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: "JSON inválido" });
    }
    logIncomingMessage(sid, msg);
    if (msg.type === MESSAGE_TYPES.PING) {
      return sendJson(ws, { type: MESSAGE_TYPES.PONG, t: Date.now() });
    }
    try {
      handleMessage(ws, msg);
    } catch (e) {
      console.error(e);
      sendJson(ws, { type: MESSAGE_TYPES.ERROR, message: e.message || "Erro no servidor" });
    }
  });
  ws.on("close", () => {
    const id = wsToId.get(ws);
    if (id) {
      console.log(`[${new Date().toISOString()}] [ws:close] socket=${id}`);
      rooms.handleDisconnect(id);
      wsToId.delete(ws);
    }
  });
});

server.listen(PORT, () => {
  console.log(`BANG! servidor em http://localhost:${PORT}`);
});

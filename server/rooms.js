"use strict";

const crypto = require("crypto");
const { createBangEngine } = require("./game/engine");
const { buildGameSnapshot } = require("./game/snapshot");
const { MESSAGE_TYPES } = require("./protocol");

const MAX_PLAYERS = 7;

function createRoomId() {
  return crypto.randomBytes(4).toString("hex");
}

function createSessionToken() {
  return crypto.randomBytes(16).toString("hex");
}

class Room {
  constructor(hostSocketId, hostName) {
    this.roomId = createRoomId();
    this.hostId = hostSocketId;
    this.players = new Map(); // socketId -> { displayName, playerId, sessionToken }
    this.players.set(hostSocketId, {
      displayName: hostName || "Anfitrião",
      playerId: null,
      sessionToken: createSessionToken(),
    });
    this.engine = null;
    this.started = false;
  }

  addPlayer(socketId, displayName) {
    if (this.players.size >= MAX_PLAYERS) return false;
    if (this.started) return false;
    this.players.set(socketId, {
      displayName: displayName || `Jogador ${this.players.size + 1}`,
      playerId: null,
      sessionToken: createSessionToken(),
    });
    return true;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (socketId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
  }

  isHost(socketId) {
    return socketId === this.hostId;
  }

  getRoomUpdatePayload(forSocketId) {
    const lobbyRows = [];
    for (const [socketId, seat] of this.players) {
      lobbyRows.push({
        socketId,
        displayName: seat.displayName,
        isHost: socketId === this.hostId,
        isYou: forSocketId != null && socketId === forSocketId,
        ready: true,
      });
    }
    return {
      type: MESSAGE_TYPES.ROOM_UPDATE,
      roomId: this.roomId,
      hostId: this.hostId,
      started: this.started,
      players: lobbyRows,
      maxPlayers: MAX_PLAYERS,
      youAreHost: forSocketId != null && this.isHost(forSocketId),
    };
  }

  startGame(hostSocketId) {
    if (!this.isHost(hostSocketId)) return { error: "Apenas o anfitrião pode iniciar" };
    if (this.players.size < 4) return { error: "Mínimo 4 jogadores" };
    if (this.started) return { error: "Partida já iniciada" };

    const engine = createBangEngine();
    const names = [];
    const socketOrder = [];
    for (const [socketId, seat] of this.players) {
      socketOrder.push(socketId);
      names.push(seat.displayName);
    }
    const gamePlayers = engine.createOnlinePlayers(names);
    socketOrder.forEach((socketId, tableIndex) => {
      const seat = this.players.get(socketId);
      seat.playerId = gamePlayers[tableIndex].id;
    });
    engine.launchNetworkGame(gamePlayers);
    this.engine = engine;
    this.started = true;
    return { ok: true };
  }

  applyGameAction(socketId, action) {
    if (!this.engine || !this.started) return { error: "Partida não iniciada" };
    const seat = this.players.get(socketId);
    if (!seat || seat.playerId == null) return { error: "Jogador não encontrado" };
    return this.engine.applyAction(seat.playerId, action);
  }

  getSnapshotFor(socketId) {
    if (!this.engine) return null;
    const seat = this.players.get(socketId);
    if (!seat || seat.playerId == null) return null;
    return buildGameSnapshot(this.engine.getState(), seat.playerId);
  }

  /**
   * @returns {{ ok: boolean, oldSocketId?: string }}
   */
  reconnectSession(sessionToken, newSocketId) {
    for (const [previousSocketId, seat] of this.players) {
      if (seat.sessionToken === sessionToken) {
        if (previousSocketId === newSocketId) return { ok: true };
        this.players.delete(previousSocketId);
        this.players.set(newSocketId, seat);
        if (this.hostId === previousSocketId) this.hostId = newSocketId;
        return { ok: true, oldSocketId: previousSocketId };
      }
    }
    return { ok: false };
  }

  getSessionToken(socketId) {
    return this.players.get(socketId)?.sessionToken;
  }
}

class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Map<string, string>} socketId -> roomId */
    this.socketToRoom = new Map();
  }

  getRoomById(roomId) {
    return this.rooms.get(roomId);
  }

  reconnectSocket(roomId, sessionToken, newSocketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Sala não encontrada" };
    const sessionOutcome = room.reconnectSession(sessionToken, newSocketId);
    if (!sessionOutcome.ok) return { error: "Sessão inválida" };
    if (sessionOutcome.oldSocketId) this.socketToRoom.delete(sessionOutcome.oldSocketId);
    this.socketToRoom.set(newSocketId, roomId);
    return { room };
  }

  createRoom(hostSocketId, hostName) {
    this.leaveRoom(hostSocketId);
    const room = new Room(hostSocketId, hostName);
    this.rooms.set(room.roomId, room);
    this.socketToRoom.set(hostSocketId, room.roomId);
    return room;
  }

  joinRoom(roomId, socketId, displayName) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Sala não encontrada" };
    if (room.started) return { error: "Partida já em andamento" };
    this.leaveRoom(socketId);
    if (!room.addPlayer(socketId, displayName)) return { error: "Sala cheia ou indisponível" };
    this.socketToRoom.set(socketId, roomId);
    return { room };
  }

  leaveRoom(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.removePlayer(socketId);
    this.socketToRoom.delete(socketId);
    if (room.players.size === 0) this.rooms.delete(roomId);
  }

  /** Desconexão de rede: mantém assento se a partida já começou (reconexão). */
  handleDisconnect(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (room && room.started) return;
    this.leaveRoom(socketId);
  }

  getRoomForSocket(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId);
  }

  broadcastRoom(room, sendFn) {
    for (const socketId of room.players.keys()) {
      sendFn(socketId, room.getRoomUpdatePayload());
    }
  }

  broadcastGameState(room, sendFn) {
    if (!room.engine) return;
    for (const socketId of room.players.keys()) {
      const gameSnapshot = room.getSnapshotFor(socketId);
      if (!gameSnapshot) continue;
      sendFn(socketId, {
        type: MESSAGE_TYPES.GAME_STATE,
        ...gameSnapshot,
      });
    }
  }
}

module.exports = { RoomManager, MAX_PLAYERS };

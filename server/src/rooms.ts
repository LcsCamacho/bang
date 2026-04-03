import crypto from "crypto";
import { createBangEngine, type BangEngine } from "./game/engine";
import { buildGameSnapshot } from "./game/snapshot";
import { MESSAGE_TYPES } from "./protocol";
import type { ClientGameAction } from "./game/types";

export const MAX_PLAYERS = 7;

function createRoomId(): string {
  return crypto.randomBytes(4).toString("hex");
}

function createSessionToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export interface LobbySeat {
  displayName: string;
  playerId: number | null;
  sessionToken: string;
}

export interface LobbyPlayerRow {
  socketId: string;
  displayName: string;
  isHost: boolean;
  isYou: boolean;
  ready: boolean;
}

export class Room {
  roomId: string;
  hostId: string;
  players = new Map<string, LobbySeat>();
  engine: BangEngine | null = null;
  started = false;

  constructor(hostSocketId: string, hostName: string | undefined) {
    this.roomId = createRoomId();
    this.hostId = hostSocketId;
    this.players.set(hostSocketId, {
      displayName: hostName || "Anfitrião",
      playerId: null,
      sessionToken: createSessionToken(),
    });
  }

  addPlayer(socketId: string, displayName: string | undefined): boolean {
    if (this.players.size >= MAX_PLAYERS) return false;
    if (this.started) return false;
    this.players.set(socketId, {
      displayName: displayName || `Jogador ${this.players.size + 1}`,
      playerId: null,
      sessionToken: createSessionToken(),
    });
    return true;
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    if (socketId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value!;
    }
  }

  isHost(socketId: string): boolean {
    return socketId === this.hostId;
  }

  getRoomUpdatePayload(forSocketId: string | null | undefined) {
    const lobbyRows: LobbyPlayerRow[] = [];
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

  startGame(hostSocketId: string): { ok?: true; error?: string } {
    if (!this.isHost(hostSocketId)) return { error: "Apenas o anfitrião pode iniciar" };
    if (this.players.size < 4) return { error: "Mínimo 4 jogadores" };
    if (this.started) return { error: "Partida já iniciada" };

    const engine = createBangEngine();
    const names: string[] = [];
    const socketOrder: string[] = [];
    for (const [socketId, seat] of this.players) {
      socketOrder.push(socketId);
      names.push(seat.displayName);
    }
    const gamePlayers = engine.createOnlinePlayers(names);
    socketOrder.forEach((socketId, tableIndex) => {
      const seat = this.players.get(socketId)!;
      seat.playerId = gamePlayers[tableIndex]!.id;
    });
    engine.launchNetworkGame(gamePlayers);
    this.engine = engine;
    this.started = true;
    return { ok: true };
  }

  applyGameAction(socketId: string, action: ClientGameAction) {
    if (!this.engine || !this.started) return { error: "Partida não iniciada" };
    const seat = this.players.get(socketId);
    if (!seat || seat.playerId == null) return { error: "Jogador não encontrado" };
    return this.engine.applyAction(seat.playerId, action);
  }

  getSnapshotFor(socketId: string) {
    if (!this.engine) return null;
    const seat = this.players.get(socketId);
    if (!seat || seat.playerId == null) return null;
    return buildGameSnapshot(this.engine.getState(), seat.playerId);
  }

  reconnectSession(
    sessionToken: string,
    newSocketId: string,
  ): { ok: true; oldSocketId?: string } | { ok: false } {
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

  getSessionToken(socketId: string): string | undefined {
    return this.players.get(socketId)?.sessionToken;
  }
}

export class RoomManager {
  rooms = new Map<string, Room>();
  /** socketId -> roomId */
  socketToRoom = new Map<string, string>();

  getRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  reconnectSocket(
    roomId: string,
    sessionToken: string,
    newSocketId: string,
  ): { room: Room } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Sala não encontrada" };
    const sessionOutcome = room.reconnectSession(sessionToken, newSocketId);
    if (!sessionOutcome.ok) return { error: "Sessão inválida" };
    if (sessionOutcome.oldSocketId) this.socketToRoom.delete(sessionOutcome.oldSocketId);
    this.socketToRoom.set(newSocketId, roomId);
    return { room };
  }

  createRoom(hostSocketId: string, hostName: string | undefined): Room {
    this.leaveRoom(hostSocketId);
    const room = new Room(hostSocketId, hostName);
    this.rooms.set(room.roomId, room);
    this.socketToRoom.set(hostSocketId, room.roomId);
    return room;
  }

  joinRoom(
    roomId: string,
    socketId: string,
    displayName: string | undefined,
  ): { room: Room } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Sala não encontrada" };
    if (room.started) return { error: "Partida já em andamento" };
    this.leaveRoom(socketId);
    if (!room.addPlayer(socketId, displayName)) return { error: "Sala cheia ou indisponível" };
    this.socketToRoom.set(socketId, roomId);
    return { room };
  }

  leaveRoom(socketId: string): void {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.removePlayer(socketId);
    this.socketToRoom.delete(socketId);
    if (room.players.size === 0) this.rooms.delete(roomId);
  }

  /** Desconexão: mantém assento se a partida já começou (reconexão). */
  handleDisconnect(socketId: string): void {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (room && room.started) return;
    this.leaveRoom(socketId);
  }

  getRoomForSocket(socketId: string): Room | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) ?? null;
  }
}

/**
 * Contrato JSON cliente ↔ servidor (Bang multiplayer).
 * Ver comentários no tipo de cada mensagem em runtime.
 */

export const MESSAGE_TYPES = {
  CREATE_ROOM: "createRoom",
  JOIN_ROOM: "joinRoom",
  LEAVE_ROOM: "leaveRoom",
  START_GAME: "startGame",
  GAME_ACTION: "gameAction",
  PING: "ping",
  RECONNECT: "reconnect",

  ROOM_UPDATE: "roomUpdate",
  GAME_STATE: "gameState",
  ERROR: "error",
  /** Resposta a PING; corpo típico: `{ type, serverTimeMs }` */
  PONG: "pong",
  RECONNECTED: "reconnected",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

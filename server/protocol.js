/**
 * Contrato JSON cliente ↔ servidor (Bang multiplayer).
 * @typedef {Object} GamePublicPlayer
 * @property {number} id
 * @property {string} name
 * @property {boolean} alive
 * @property {number} life
 * @property {number} maxLife
 * @property {string} charName
 * @property {string} charAbility
 * @property {number} handCount
 * @property {boolean} jailed
 * @property {boolean} hasDynamite
 * @property {boolean} usedBang
 * @property {string} role - "hidden" | "sheriff" | "outlaw" | "renegade" | "deputy" (sheriff sempre visível)
 * @property {{ weaponKey: string, barrel: boolean, mustang: boolean, scope: boolean }} equipment
 *
 * @typedef {Object} GamePublicState
 * @property {string} mode
 * @property {number} current
 * @property {string} phase
 * @property {boolean} gameOver
 * @property {GamePublicPlayer[]} players
 * @property {number} drawPileCount
 * @property {number} discardPileCount
 * @property {{ msg: string, type?: string }[]} log
 * @property {object|null} pending - escolha pendente (alvo, loja, etc.)
 * @property {object|null} winInfo
 *
 * @typedef {Object} PlayerPrivateSnapshot
 * @property {number} playerId
 * @property {object[]} hand
 * @property {string} [role] - papel completo só para o dono
 */

const MESSAGE_TYPES = {
  // cliente → servidor
  CREATE_ROOM: "createRoom",
  JOIN_ROOM: "joinRoom",
  LEAVE_ROOM: "leaveRoom",
  START_GAME: "startGame",
  GAME_ACTION: "gameAction",
  PING: "ping",
  RECONNECT: "reconnect",

  // servidor → cliente
  ROOM_UPDATE: "roomUpdate",
  GAME_STATE: "gameState",
  ERROR: "error",
  PONG: "pong",
  RECONNECTED: "reconnected",
};

module.exports = { MESSAGE_TYPES };

"use strict";

const { GAME_LIMITS } = require("./constants");

/**
 * @param {object} state - estado completo do motor
 * @param {number} viewerId - playerId do destinatário
 */
function buildGameSnapshot(state, viewerId) {
  const sheriffVisible = (r) => r === "sheriff";
  const publicPlayers = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    life: p.life,
    maxLife: p.maxLife,
    char: { name: p.char.name, ability: p.char.ability, desc: p.char.desc },
    charName: p.char.name,
    charAbility: p.char.ability,
    handCount: p.hand.length,
    jailed: p.jailed,
    hasDynamite: p.hasDynamite,
    usedBang: p.usedBang,
    role:
      sheriffVisible(p.role) || p.id === viewerId ? p.role : "hidden",
    equipment: {
      weaponKey: p.equipment.weaponKey,
      barrel: p.equipment.barrel || p.char.ability === "builtinBarrel",
      mustang: p.equipment.mustang || p.char.ability === "builtinMustang",
      scope: p.equipment.scope,
    },
  }));

  const viewer = state.players.find((x) => x.id === viewerId);
  const priv = viewer
    ? {
        playerId: viewerId,
        hand: viewer.hand.map((c) => ({ ...c })),
        role: viewer.role,
      }
    : null;

  return {
    public: {
      mode: state.mode,
      current: state.current,
      phase: state.phase,
      gameOver: state.gameOver,
      players: publicPlayers,
      drawPileCount: state.drawPile.length,
      discardPileCount: state.discardPile.length,
      log: state.log.slice(0, GAME_LIMITS.visibleLogEntries),
      pending: state.pending,
      winInfo: state.winInfo,
      lastToast: state.lastToast,
    },
    private: priv,
  };
}

module.exports = { buildGameSnapshot };

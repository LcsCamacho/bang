import { GAME_LIMITS } from "./constants";
import type { GameState } from "./types";

export function buildGameSnapshot(state: GameState, viewerId: number) {
  const sheriffVisible = (role: string) => role === "sheriff";
  const publicPlayers = state.players.map((player) => ({
    id: player.id,
    name: player.name,
    alive: player.alive,
    life: player.life,
    maxLife: player.maxLife,
    char: {
      name: player.char.name,
      ability: player.char.ability,
      desc: player.char.desc,
    },
    charName: player.char.name,
    charAbility: player.char.ability,
    handCount: player.hand.length,
    jailed: player.jailed,
    hasDynamite: player.hasDynamite,
    usedBang: player.usedBang,
    role:
      sheriffVisible(player.role) || player.id === viewerId ? player.role : "hidden",
    equipment: {
      weaponKey: player.equipment.weaponKey,
      barrel: player.equipment.barrel || player.char.ability === "builtinBarrel",
      mustang: player.equipment.mustang || player.char.ability === "builtinMustang",
      scope: player.equipment.scope,
    },
  }));

  const viewer = state.players.find((player) => player.id === viewerId);
  const privateSnapshot = viewer
    ? {
        playerId: viewerId,
        hand: viewer.hand.map((card) => ({ ...card })),
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
    private: privateSnapshot,
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import { createBangEngine } from "./engine";
import type { BangEngine } from "./engine";

function currentPlayerId(engine: BangEngine): number {
  const state = engine.getState();
  return state.players[state.current]!.id;
}

test("inicia partida e compra (draw)", () => {
  const engine = createBangEngine();
  const names = ["A", "B", "C", "D"];
  const players = engine.createOnlinePlayers(names);
  engine.launchNetworkGame(players);
  let state = engine.getState();
  assert.equal(state.phase, "draw");
  const drawResult = engine.applyAction(currentPlayerId(engine), { type: "draw" });
  assert.ok(drawResult.ok);
  state = engine.getState();
  assert.equal(state.phase, "play");
});

test("BANG com alvo válido", () => {
  const engine = createBangEngine();
  engine.launchNetworkGame(engine.createOnlinePlayers(["A", "B", "C", "D"]));
  const currentId = currentPlayerId(engine);
  engine.applyAction(currentId, { type: "draw" });
  const state = engine.getState();
  const currentPlayer = state.players[state.current]!;
  const bangIdx = currentPlayer.hand.findIndex((card) => card.type === "bang");
  if (bangIdx < 0) return;
  const playBangResult = engine.applyAction(currentId, { type: "playCard", index: bangIdx });
  assert.ok(playBangResult.ok && playBangResult.pending);
  const pending = engine.getState().pending;
  assert.equal(pending!.kind, "chooseTarget");
  const targetId = pending!.validTargetIds[0]!;
  const chooseTargetResult = engine.applyAction(currentId, {
    type: "chooseTarget",
    targetId,
  });
  assert.ok(chooseTargetResult.ok, JSON.stringify(chooseTargetResult));
});

test("Loja geral: ordem de escolha (primeiro picker)", () => {
  const engine = createBangEngine();
  engine.launchNetworkGame(engine.createOnlinePlayers(["A", "B", "C", "D"]));
  const currentId = currentPlayerId(engine);
  engine.applyAction(currentId, { type: "draw" });
  const state = engine.getState();
  const storeIdx = state.players[state.current]!.hand.findIndex(
    (card) => card.type === "generalstore",
  );
  if (storeIdx < 0) return;
  const playStoreResult = engine.applyAction(currentId, { type: "playCard", index: storeIdx });
  assert.ok(playStoreResult.ok && playStoreResult.pending);
  const stateAfterStore = engine.getState();
  assert.equal(stateAfterStore.pending!.kind, "storePick");
  const pickerId = stateAfterStore.pending!.pickerId;
  const storePickResult = engine.applyAction(pickerId, { type: "storePick", cardIndex: 0 });
  assert.ok(storePickResult.ok);
});

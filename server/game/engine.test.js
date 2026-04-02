"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBangEngine } = require("./engine");

function currentPlayerId(eng) {
  const st = eng.getState();
  return st.players[st.current].id;
}

test("inicia partida e compra (draw)", () => {
  const eng = createBangEngine();
  const names = ["A", "B", "C", "D"];
  const players = eng.createOnlinePlayers(names);
  eng.launchNetworkGame(players);
  let st = eng.getState();
  assert.equal(st.phase, "draw");
  const r0 = eng.applyAction(currentPlayerId(eng), { type: "draw" });
  assert.ok(r0.ok);
  st = eng.getState();
  assert.equal(st.phase, "play");
});

test("BANG com alvo válido", () => {
  const eng = createBangEngine();
  eng.launchNetworkGame(eng.createOnlinePlayers(["A", "B", "C", "D"]));
  const pid = currentPlayerId(eng);
  eng.applyAction(pid, { type: "draw" });
  const st = eng.getState();
  const cur = st.players[st.current];
  const bangIdx = cur.hand.findIndex((c) => c.type === "bang");
  if (bangIdx < 0) return;
  const r1 = eng.applyAction(pid, { type: "playCard", index: bangIdx });
  assert.ok(r1.ok && r1.pending);
  const pending = eng.getState().pending;
  assert.equal(pending.kind, "chooseTarget");
  const tgtId = pending.validTargetIds[0];
  const r2 = eng.applyAction(pid, { type: "chooseTarget", targetId: tgtId });
  assert.ok(r2.ok, JSON.stringify(r2));
});

test("Loja geral: ordem de escolha (primeiro picker)", () => {
  const eng = createBangEngine();
  eng.launchNetworkGame(eng.createOnlinePlayers(["A", "B", "C", "D"]));
  const pid = currentPlayerId(eng);
  eng.applyAction(pid, { type: "draw" });
  const st = eng.getState();
  const gsIdx = st.players[st.current].hand.findIndex((c) => c.type === "generalstore");
  if (gsIdx < 0) return;
  const r = eng.applyAction(pid, { type: "playCard", index: gsIdx });
  assert.ok(r.ok && r.pending);
  const st2 = eng.getState();
  assert.equal(st2.pending.kind, "storePick");
  const pickerId = st2.pending.pickerId;
  const r2 = eng.applyAction(pickerId, { type: "storePick", cardIndex: 0 });
  assert.ok(r2.ok);
});

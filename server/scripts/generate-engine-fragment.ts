#!/usr/bin/env node
/**
 * Monta fragmento a partir de bang-engine.js (regras cliente até a loja, sem bots).
 * Saída: server/game/_engine_fragment.js (referência / diff com `src/game/engine.ts` do servidor).
 */
import * as fs from "fs";
import * as path from "path";

const enginePath = path.join(__dirname, "..", "..", "bang-engine.js");
let body = fs.readFileSync(enginePath, "utf8");

const SERVER_PRELUDE = `function addLog(logText, type = "") {
  state.log.unshift({ msg: logText, type });
  if (state.log.length > GAME_LIMITS.logMaxEntries) state.log.pop();
}
function rLabel(roleId) {
  return ROLE_LABELS[roleId] || roleId;
}
function rIcon(roleId) {
  return ROLE_ICONS[roleId] || "?";
}
function toast(messageText) {
  state.lastToast = messageText;
}
`;

body = SERVER_PRELUDE + body;

body = body.replace(/LocalState/g, "state");
body = body.replace(/let state = \{\};\s*\n/g, "");

body = body.replace(
  /function showWin\(icon, title, desc\) \{[\s\S]*?\n\}/,
  `function showWin(icon, title, desc) {
  state.gameOver = true;
  state.winInfo = { icon, title, desc };
}`,
);

body = body.replace(/function renderGameScreen\(\) \{[\s\S]*?\n\}/, "");
body = body.replace(
  /function createOfflinePlayers[\s\S]*?^}/m,
  "",
);
body = body.replace(
  /function createHotseatPlayers[\s\S]*?^}/m,
  "",
);

body = body.replace(
  /function closeStoreModal\(\) \{[\s\S]*?\n\}/,
  "function closeStoreModal() {}\n",
);

const outPath = path.join(__dirname, "..", "game", "_engine_fragment.js");
fs.writeFileSync(outPath, body);
console.log("Wrote _engine_fragment.js", body.length);

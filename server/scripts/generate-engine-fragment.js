#!/usr/bin/env node
/**
 * Extrai lógica de bang.js (sem bots/render) e prepara fragmento para engine.js
 */
const fs = require("fs");
const path = require("path");
const bangPath = path.join(__dirname, "..", "..", "bang.js");
const src = fs.readFileSync(bangPath, "utf8");
const start = src.indexOf("function createDefaultEquipment()");
const end = src.indexOf("// ═══ BOT AI ═══");
if (start < 0 || end < 0) throw new Error("markers not found");
let body = src.slice(start, end);

body = body.replace(/LocalState/g, "state");
body = body.replace(/let state = \{\};\s*\n/g, "");

// addLog sem DOM
body = body.replace(
  /function addLog\(msg, type = ""\) \{[\s\S]*?\n\}/,
  `function addLog(msg, type = "") {
  state.log.unshift({ msg, type });
  if (state.log.length > GAME_LIMITS.logMaxEntries) state.log.pop();
}`,
);

// showWin sem DOM
body = body.replace(
  /function showWin\(icon, title, desc\) \{[\s\S]*?\n\}/,
  `function showWin(icon, title, desc) {
  state.gameOver = true;
  state.winInfo = { icon, title, desc };
}`,
);

// toast → lastToast
body = body.replace(
  /function toast\(msg\) \{[\s\S]*?\n\}/,
  `function toast(msg) {
  state.lastToast = msg;
}`,
);

// remove telas / setup que usam document
body = body.replace(/function renderGameScreen\(\) \{[\s\S]*?\n\}/, "");
body = body.replace(
  /function createOfflinePlayers[\s\S]*?^}/m,
  "",
);
body = body.replace(
  /function createHotseatPlayers[\s\S]*?^}/m,
  "",
);

fs.writeFileSync(path.join(__dirname, "..", "game", "_engine_fragment.js"), body);
console.log("Wrote _engine_fragment.js", body.length);

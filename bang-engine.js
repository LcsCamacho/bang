// ═══ ENGINE ═══ (estado local, turno, cartas, combate, loja — sem bots/UI de log)
function createDefaultEquipment() {
  return { weaponKey: "colt45", barrel: false, mustang: false, scope: false };
}
function canUseBang(player) {
  return (
    !player.usedBang ||
    player.char.ability === "unlimitedBang" ||
    player.equipment.weaponKey === "volcanic"
  );
}
function canUseBeer(player) {
  return alive().length > 2 && player.life < player.maxLife;
}
function canEquipBarrel(player) {
  return !player.equipment.barrel && player.char.ability !== "builtinBarrel";
}
function canEquipMustang(player) {
  return !player.equipment.mustang && player.char.ability !== "builtinMustang";
}
function canEquipScope(player) {
  return !player.equipment.scope;
}
function canPlaceDynamite(player) {
  return !player.hasDynamite;
}
function canTargetBeLooted(target) {
  return (
    target.hand.length > 0 ||
    target.equipment.weaponKey !== "colt45" ||
    target.equipment.barrel ||
    target.equipment.mustang ||
    target.equipment.scope
  );
}
const CARD_SKIP_EVALUATORS = {
  bang: (player) => !canUseBang(player),
  missed: (player) => player.char.ability !== "bangMissed",
  beer: (player) => !canUseBeer(player),
  barrel: (player) => !canEquipBarrel(player),
  mustang: (player) => !canEquipMustang(player),
  scope: (player) => !canEquipScope(player),
  dynamite: (player) => !canPlaceDynamite(player),
};
function shouldSkipCardForPlayer(card, player) {
  const evaluateSkip = CARD_SKIP_EVALUATORS[card.type];
  return evaluateSkip ? evaluateSkip(player) : false;
}

function buildDeck() {
  const cards = [];
  const addCards = (type, label, icon, count) => {
    for (let cardIndex = 0; cardIndex < count; cardIndex++)
      cards.push({ type, label, icon });
  };
  addCards("bang", "BANG!", "💥", 25);
  addCards("missed", "Errei!", "🙈", 12);
  addCards("beer", "Cerveja", "🍺", 6);
  addCards("duel", "Duelo", "⚔️", 3);
  addCards("panic", "Pânico!", "😱", 4);
  addCards("catbalou", "Cat Balou", "🐱", 4);
  addCards("jail", "Cadeia", "🔒", 3);
  addCards("dynamite", "Dinamite", "💣", 2);
  addCards("generalstore", "Loja Geral", "🏪", 2);
  addCards("indians", "Índios!", "🏹", 2);
  addCards("saloon", "Saloon", "🥃", 1);
  addCards("barrel", "Barril", "🛢️", 2);
  addCards("mustang", "Mustang", "🐎", 2);
  addCards("scope", "Luneta", "🔭", 2);
  [
    { type: "volcanic", label: "Volcanic", icon: "🔥", weaponKey: "volcanic" },
    { type: "volcanic", label: "Volcanic", icon: "🔥", weaponKey: "volcanic" },
    {
      type: "schofield",
      label: "Schofield",
      icon: "🔫",
      weaponKey: "schofield",
    },
    {
      type: "schofield",
      label: "Schofield",
      icon: "🔫",
      weaponKey: "schofield",
    },
    {
      type: "schofield",
      label: "Schofield",
      icon: "🔫",
      weaponKey: "schofield",
    },
    {
      type: "remington",
      label: "Remington",
      icon: "🏹",
      weaponKey: "remington",
    },
    { type: "carabine", label: "Carabine", icon: "🪖", weaponKey: "carabine" },
    {
      type: "winchester",
      label: "Winchester",
      icon: "🎯",
      weaponKey: "winchester",
    },
  ].forEach((w) => cards.push(w));
  const sv = [];
  SUITS.forEach((s) => VALUES.forEach((v) => sv.push({ s, v })));
  shuffle(sv);
  cards.forEach((c, i) => {
    const x = sv[i % sv.length];
    c.suit = x.s;
    c.value = x.v;
  });
  return cards;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══ STATE ═══
let LocalState = {};
function buildRoles(n) {
  return ROLE_SETUPS[n] || ROLE_SETUPS.default;
}
function mkPlayer(id, name, role, char, isBot, diff) {
  let ml = char.life + (role === "sheriff" ? 1 : 0);
  ml = Math.min(ml, GAME_LIMITS.maxLifeCap);
  return {
    id,
    name,
    role,
    char,
    life: ml,
    maxLife: ml,
    hand: [],
    equipment: createDefaultEquipment(),
    alive: true,
    jailed: false,
    hasDynamite: false,
    usedBang: false,
    isBot,
    difficulty: isBot ? diff : null,
  };
}
function moveSheriffToFirst(players) {
  const sheriffIndex = players.findIndex((player) => player.role === "sheriff");
  if (sheriffIndex !== 0) {
    const sheriffPlayer = players.splice(sheriffIndex, 1)[0];
    players.unshift(sheriffPlayer);
  }
}
function createGameState(players, mode) {
  return {
    players,
    mode,
    drawPile: shuffle(buildDeck()),
    discardPile: [],
    current: 0,
    phase: "start",
    log: [],
    gameOver: false,
    pendingCard: null,
    pendingIdx: null,
    storeCards: [],
    storeOrder: [],
    storePick: 0,
  };
}
function dealInitialCards() {
  LocalState.players.forEach((player) => {
    for (let cardCount = 0; cardCount < player.maxLife; cardCount++)
      dealCard(player);
  });
}
function renderGameScreen() {
  document
    .querySelectorAll(".screen")
    .forEach((screen) => screen.classList.remove("active"));
  document.getElementById("game-screen").style.display = "block";
}
function logPlayersAtGameStart() {
  addLog(`⭐ Partida iniciada! ${LocalState.players.length} jogadores.`, "imp");
  LocalState.players.forEach((player) =>
    addLog(
      `  ${player.isBot ? "🤖" : "👤"} ${player.name} → ${player.char.name}`,
    ),
  );
}
function createRandomRolesAndChars(totalPlayers) {
  return {
    roles: shuffle(buildRoles(totalPlayers)),
    chars: shuffle([...CHARS]),
  };
}
function createOfflinePlayers(totalPlayers, humanName, difficulty) {
  const { roles, chars } = createRandomRolesAndChars(totalPlayers);
  const botNames = shuffle([...BOT_NAMES]);
  const players = [mkPlayer(0, humanName, roles[0], chars[0], false, null)];
  for (let playerIndex = 1; playerIndex < totalPlayers; playerIndex++) {
    const botName = botNames[playerIndex - 1] || `Bot ${playerIndex}`;
    players.push(
      mkPlayer(
        playerIndex,
        botName,
        roles[playerIndex],
        chars[playerIndex],
        true,
        difficulty,
      ),
    );
  }
  return players;
}
function createHotseatPlayers(totalPlayers) {
  const { roles, chars } = createRandomRolesAndChars(totalPlayers);
  const players = [];
  for (let playerIndex = 0; playerIndex < totalPlayers; playerIndex++) {
    const playerName =
      document.getElementById(`hn${playerIndex}`)?.value.trim() ||
      `Jogador ${playerIndex + 1}`;
    players.push(
      mkPlayer(
        playerIndex,
        playerName,
        roles[playerIndex],
        chars[playerIndex],
        false,
        null,
      ),
    );
  }
  return players;
}

// ═══ SETUP SCREENS ═══
function updateOffInfo() {
  const n = parseInt(document.getElementById("off-n").value);
  document.getElementById("off-info").textContent =
    `Você + ${n - 1} bot${n - 1 > 1 ? "s" : ""} (${n} jogadores)`;
}
updateOffInfo();
function updateHSNames() {
  const totalPlayers = parseInt(document.getElementById("hs-n").value);
  const namesContainer = document.getElementById("hs-names");
  namesContainer.innerHTML = "";
  for (let playerIndex = 0; playerIndex < totalPlayers; playerIndex++) {
    const playerInput = document.createElement("input");
    playerInput.type = "text";
    playerInput.id = `hn${playerIndex}`;
    playerInput.placeholder = `Jogador ${playerIndex + 1}`;
    playerInput.style.cssText =
      "width:100%;padding:6px 9px;font-family:Special Elite,cursive;font-size:.81rem;border:2px solid #8b6914;background:#faf4e1;color:#3a1f08;border-radius:3px;";
    namesContainer.appendChild(playerInput);
  }
}
updateHSNames();
document.getElementById("hs-n").addEventListener("input", updateHSNames);

function startOffline() {
  const totalPlayers = parseInt(document.getElementById("off-n").value);
  const humanName =
    document.getElementById("human-name").value.trim() || "Você";
  const difficulty = document.querySelector("input[name=diff]:checked").value;
  const players = createOfflinePlayers(totalPlayers, humanName, difficulty);
  launchGame(players, "offline");
}
function startHotseat() {
  const totalPlayers = parseInt(document.getElementById("hs-n").value);
  const players = createHotseatPlayers(totalPlayers);
  launchGame(players, "hotseat");
}
function launchGame(players, mode) {
  moveSheriffToFirst(players);
  LocalState = createGameState(players, mode);
  dealInitialCards();
  renderGameScreen();
  logPlayersAtGameStart();
  beginTurn();
}

// ═══ CARD OPS ═══
function dealCard(p) {
  if (LocalState.drawPile.length === 0) reshuf();
  if (LocalState.drawPile.length === 0) return null;
  const c = LocalState.drawPile.pop();
  p.hand.push(c);
  return c;
}
function reshuf() {
  if (LocalState.discardPile.length === 0) return;
  LocalState.drawPile = shuffle([...LocalState.discardPile]);
  LocalState.discardPile = [];
  addLog("Baralho reembaralhado.");
}
function disc(c) {
  if (c) LocalState.discardPile.push(c);
}
function findC(p, t) {
  return p.hand.findIndex((c) => c.type === t);
}
function removeC(p, i) {
  return p.hand.splice(i, 1)[0];
}

// ═══ DISTANCE ═══
function alive() {
  return LocalState.players.filter((p) => p.alive);
}
function dist(a, b) {
  const al = alive();
  const ai = al.indexOf(a),
    bi = al.indexOf(b);
  if (ai < 0 || bi < 0) return GAME_LIMITS.invalidDistance;
  const n = al.length;
  let d = Math.abs(ai - bi);
  d = Math.min(d, n - d);
  if (b.equipment.mustang || b.char.ability === "builtinMustang") d++;
  if (a.equipment.scope) d--;
  return Math.max(GAME_LIMITS.minimumDistance, d);
}
function reach(p) {
  return WEAPONS[p.equipment.weaponKey]?.reach || GAME_LIMITS.defaultWeaponReach;
}
function canShoot(a, b) {
  return dist(a, b) <= reach(a);
}

// ═══ DRAW CHECK ═══
function drawCheck() {
  if (LocalState.drawPile.length === 0) reshuf();
  const c = LocalState.drawPile.pop();
  disc(c);
  return c;
}
function drawCheckLD(p) {
  const c1 = drawCheck(),
    c2 = drawCheck();
  addLog(
    `${p.name} (Lucky Duke): ${c1.suit}${c1.value} e ${c2.suit}${c2.value}`,
    "bot",
  );
  return [c1, c2];
}
function doDrawCheck(p) {
  if (p.char.ability === "twoDraws") {
    const [c1, c2] = drawCheckLD(p);
    return c1;
  }
  const c = drawCheck();
  addLog(`Draw!: ${c.suit}${c.value}`);
  return c;
}
function isDynamiteExplosionCard(card) {
  return (
    card.suit === CARD_SUITS.spades &&
    DYNAMITE_EXPLOSION_VALUES.includes(card.value)
  );
}
function resolveDynamiteAtTurnStart(player) {
  if (!player.hasDynamite) return true;
  addLog(`💣 Dinamite de ${player.name}! Draw!...`);
  const drawCard = doDrawCheck(player);
  if (isDynamiteExplosionCard(drawCard)) {
    addLog(`💥 BOOM! ${player.name} leva 3 danos!`, "dmg");
    player.hasDynamite = false;
    damage(player, null, GAME_LIMITS.dynamiteDamage);
    return player.alive;
  }
  const nextPlayerIndex = nextAlive(LocalState.current);
  LocalState.players[nextPlayerIndex].hasDynamite = true;
  player.hasDynamite = false;
  addLog(`💣 Dinamite passa para ${LocalState.players[nextPlayerIndex].name}.`);
  return true;
}
function resolveJailAtTurnStart(player) {
  if (!player.jailed) return true;
  addLog(`🔒 ${player.name} está preso. Draw!...`);
  const drawCard = doDrawCheck(player);
  player.jailed = false;
  if (drawCard.suit !== CARD_SUITS.hearts) {
    addLog(`🔒 ${player.name} não escapou. Turno pulado.`);
    return false;
  }
  addLog(`🔓 ${player.name} escapou!`);
  return true;
}
function drawThreeKeepTwo(player) {
  const topCards = [];
  for (let cardIndex = 0; cardIndex < GAME_LIMITS.kitCarlsonDrawCount; cardIndex++) {
    if (LocalState.drawPile.length === 0) reshuf();
    topCards.push(LocalState.drawPile.pop());
  }
  LocalState.drawPile.push(topCards[GAME_LIMITS.kitCarlsonKeepCount]);
  player.hand.push(topCards[0]);
  player.hand.push(topCards[1]);
  addLog(`${player.name} (Kit Carlson) escolhe 2 de 3.`);
}
function drawBlackJackCards(player) {
  const firstCard = dealCard(player);
  const secondCard = dealCard(player);
  addLog(
    `${player.name} compra: ${firstCard.suit}${firstCard.value}, ${secondCard.suit}${secondCard.value}`,
  );
  if (secondCard.suit === CARD_SUITS.hearts || secondCard.suit === CARD_SUITS.diamonds) {
    for (let drawIndex = 0; drawIndex < GAME_LIMITS.blackJackBonusDrawCount; drawIndex++) dealCard(player);
    addLog(`Black Jack +1 carta extra!`);
  }
}
function drawFromDiscardThenDeck(player) {
  const topDiscardCard = LocalState.discardPile.pop();
  player.hand.push(topDiscardCard);
  dealCard(player);
  addLog(`${player.name} (Pedro Ramirez) compra do descarte + baralho.`);
}
function drawTwoDefaultCards(player) {
  for (let drawIndex = 0; drawIndex < GAME_LIMITS.defaultDrawCount; drawIndex++) dealCard(player);
  addLog(`${player.name} compra ${GAME_LIMITS.defaultDrawCount} cartas.`);
}

// ═══ DAMAGE ═══
function damage(target, attacker, amt = 1) {
  for (let i = 0; i < amt; i++) {
    if (target.life <= 0) break;
    target.life--;
    addLog(
      `💔 ${target.name} perde 1 vida (${target.life}/${target.maxLife})`,
      "dmg",
    );
    if (
      target.char.ability === "retaliation" &&
      attacker &&
      attacker !== target &&
      attacker.alive &&
      attacker.hand.length > 0
    ) {
      const st = attacker.hand.splice(
        Math.floor(Math.random() * attacker.hand.length),
        1,
      )[0];
      target.hand.push(st);
      addLog(`El Gringo (${target.name}) rouba de ${attacker.name}!`, "bot");
    }
    if (target.life <= 0) {
      elim(target, attacker);
      break;
    }
  }
}
function heal(p, amt = 1) {
  p.life = Math.min(p.life + amt, p.maxLife);
  addLog(`❤️ ${p.name} +${amt} vida (${p.life}/${p.maxLife})`, "hl");
}
function elim(p, killer) {
  p.alive = false;
  addLog(`💀 ${p.name} eliminado! (${rLabel(p.role)})`, "dth");
  if (p.role === "outlaw" && killer && killer !== p && killer.alive) {
    for (let i = 0; i < GAME_LIMITS.outlawKillRewardCards; i++) dealCard(killer);
    addLog(`🎁 ${killer.name} recebe ${GAME_LIMITS.outlawKillRewardCards} cartas!`);
  }
  if (p.role === "deputy" && killer && killer.role === "sheriff") {
    killer.hand = [];
    killer.equipment = createDefaultEquipment();
    addLog(`⭐ Xerife matou o próprio deputado — perde tudo!`, "imp");
  }
  LocalState.players.forEach((pl) => {
    if (pl.char.ability === "vultureSam" && pl.alive && pl !== p) {
      p.hand.forEach((c) => pl.hand.push(c));
      p.hand = [];
      addLog(`🦅 Vulture Sam (${pl.name}) pega cartas de ${p.name}!`);
    }
  });
  if (p.hand.length > 0) {
    p.hand.forEach((c) => disc(c));
    p.hand = [];
  }
  checkWin();
}
function beerRescue(p) {
  if (!p.alive && alive().length > 2) {
    const bi = findC(p, "beer");
    if (bi >= 0) {
      disc(removeC(p, bi));
      p.life = 1;
      p.alive = true;
      addLog(`🍺 ${p.name} bebe cerveja e sobrevive!`, "hl");
    }
  }
}

// ═══ WIN ═══
function checkWin() {
  if (LocalState.gameOver) return;
  const sA = LocalState.players.some((p) => p.role === "sheriff" && p.alive);
  const oA = LocalState.players.some((p) => p.role === "outlaw" && p.alive);
  const rA = LocalState.players.some((p) => p.role === "renegade" && p.alive);
  const dA = LocalState.players.some((p) => p.role === "deputy" && p.alive);
  if (!sA) {
    if (!oA && !dA && rA)
      return showWin(
        "🤠",
        "Renegado Vence!",
        "O renegado se tornou o novo xerife!",
      );
    return showWin(
      "💀",
      "Foras-da-Lei Vencem!",
      "O Xerife foi abatido. A lei acabou!",
    );
  }
  if (!oA && !rA)
    showWin("⭐", "Xerife Vence!", "A ordem foi restaurada no Velho Oeste!");
}
function showWin(icon, title, desc) {
  LocalState.gameOver = true;
  document.getElementById("w-icon").textContent = icon;
  document.getElementById("w-title").textContent = title;
  document.getElementById("w-desc").textContent = desc;
  document.getElementById("w-roles").innerHTML = LocalState.players
    .map(
      (p) =>
        `<div>${rIcon(p.role)} <b>${p.name}</b> — ${rLabel(p.role)} (${p.char.name}) ${p.alive ? "✅" : "💀"}</div>`,
    )
    .join("");
  document.getElementById("win-ov").classList.add("open");
}

// ═══ TURN ═══
function beginTurn() {
  if (LocalState.gameOver) return;
  const p = currentP();
  p.usedBang = false;
  if (!resolveDynamiteAtTurnStart(p)) {
    advTurn();
    return;
  }
  if (!p.alive) {
    advTurn();
    return;
  }
  if (!resolveJailAtTurnStart(p)) {
    advTurn();
    return;
  }
  LocalState.phase = PHASES.draw;
  renderGame();
  if (p.isBot) setTimeout(botDoTurn, GAME_LIMITS.botTurnDelayMs);
  else if (LocalState.mode === "hotseat") showHotseat();
}
function doDraw() {
  if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "draw" });
    return;
  }
  const p = currentP();
  if (LocalState.phase !== PHASES.draw) return;
  const drawStrategyKey =
    p.char.ability === "discardDraw" && LocalState.discardPile.length === 0
      ? "default"
      : p.char.ability;
  const drawStrategy =
    DRAW_STRATEGIES[drawStrategyKey] || DRAW_STRATEGIES.default;
  drawStrategy(p);
  LocalState.phase = PHASES.play;
  renderGame();
}
function endPlay() {
  if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "endPlay" });
    return;
  }
  if (LocalState.phase === PHASES.play) {
    LocalState.phase = PHASES.discard;
    renderGame();
  }
}
function doDiscard(i) {
  if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "discard", index: i });
    return;
  }
  if (LocalState.phase !== PHASES.discard) return;
  disc(currentP().hand.splice(i, 1)[0]);
  renderGame();
}
function endDiscard() {
  if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "endDiscard" });
    return;
  }
  const p = currentP();
  if (p.hand.length > p.life) {
    toast(`Descarte até ${p.life} carta(s)!`);
    return;
  }
  advTurn();
}
function advTurn() {
  if (LocalState.gameOver) return;
  LocalState.current = nextAlive(LocalState.current);
  LocalState.phase = PHASES.start;
  hideBotBar();
  renderGame();
  beginTurn();
}
function nextAlive(from) {
  let n = (from + 1) % LocalState.players.length,
    s = 0;
  while (!LocalState.players[n].alive && s < LocalState.players.length) {
    n = (n + 1) % LocalState.players.length;
    s++;
  }
  return n;
}
function currentP() {
  return LocalState.players[LocalState.current];
}

// ═══ COMBAT ═══
function resolveShot(atk, tgt) {
  addLog(`🔫 ${atk.name} atira em ${tgt.name}!`);
  const hasBarrel =
    tgt.equipment.barrel || tgt.char.ability === "builtinBarrel";
  if (hasBarrel) {
    const dc = doDrawCheck(tgt);
    if (dc.suit === "♥") {
      addLog(`🛢️ Barril salvou ${tgt.name}!`);
      return;
    }
  }
  const need = atk.char.ability === "doubleMissed" ? 2 : 1;
  const avM = tgt.hand.filter((c) => c.type === "missed").length;
  const avA =
    tgt.char.ability === "bangMissed"
      ? tgt.hand.filter((c) => c.type === "bang").length
      : 0;
  if (avM + avA >= need) {
    let r = need;
    while (r > 0 && findC(tgt, "missed") >= 0) {
      disc(removeC(tgt, findC(tgt, "missed")));
      r--;
    }
    while (
      r > 0 &&
      tgt.char.ability === "bangMissed" &&
      findC(tgt, "bang") >= 0
    ) {
      disc(removeC(tgt, findC(tgt, "bang")));
      r--;
    }
    addLog(`🙈 ${tgt.name} evitou o tiro!`);
  } else {
    damage(tgt, atk);
    beerRescue(tgt);
  }
}
function resolveDuel(ch, df) {
  addLog(`⚔️ DUELO: ${ch.name} vs ${df.name}!`);
  let turn = df,
    other = ch,
    s = 0;
  while (s++ < GAME_LIMITS.duelRoundLimit) {
    const bi = findC(turn, "bang"),
      mi = turn.char.ability === "bangMissed" ? findC(turn, "missed") : -1;
    if (bi >= 0) {
      disc(removeC(turn, bi));
      addLog(`⚔️ ${turn.name} joga BANG!`);
      [turn, other] = [other, turn];
    } else if (mi >= 0) {
      disc(removeC(turn, mi));
      addLog(`⚔️ ${turn.name} (CJ) usa Errei!`);
      [turn, other] = [other, turn];
    } else {
      addLog(`⚔️ ${turn.name} cede!`);
      damage(turn, other);
      beerRescue(turn);
      break;
    }
  }
}

// ═══ PLAY CARD ═══
function playCard(idx) {
  if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "playCard", index: idx });
    return;
  }
  if (LocalState.gameOver || LocalState.phase !== "play") return;
  const p = currentP();
  const c = p.hand[idx];
  if (!c) return;
  LocalState.pendingCard = c;
  LocalState.pendingIdx = idx;
  if (CARD_TYPES_REQUIRING_TARGET.includes(c.type)) {
    const tgts = validTargets(c.type, p);
    if (!tgts.length) {
      toast("Nenhum alvo válido!");
      return;
    }
    openModal(c.type, tgts, (tgt) => consumeExec(p, idx, c, tgt));
    return;
  }
  consumeExec(p, idx, c, null);
}
function consumeExec(p, idx, c, tgt) {
  const ok = execCard(p, idx, c, tgt);
  if (ok) {
    removeC(p, idx);
    disc(c);
    suzyCheck(p);
    renderGame();
  }
}
function suzyCheck(p) {
  if (
    p.char.ability === "drawOnEmpty" &&
    p.hand.length === 0 &&
    LocalState.phase === "play"
  ) {
    dealCard(p);
    addLog(`${p.name} (Suzy Lafayette) compra carta.`);
  }
}
function executeMissedAsBang(player, cardIndex, card) {
  const targets = validTargets("bang", player);
  if (!targets.length) {
    toast("Nenhum alvo!");
    return false;
  }
  openModal("bang", targets, (target) => {
    removeC(player, cardIndex);
    disc(card);
    resolveShot(player, target);
    player.usedBang = true;
    suzyCheck(player);
    renderGame();
  });
  return false;
}
function executePanicCard(player, target) {
  if (target.hand.length === 0) {
    toast("Alvo sem cartas!");
    return false;
  }
  const stolenCard = removeC(
    target,
    Math.floor(Math.random() * target.hand.length),
  );
  player.hand.push(stolenCard);
  addLog(`😱 ${player.name} rouba carta de ${target.name}.`);
  return true;
}
function executeCatBalouCard(target) {
  if (target.hand.length > 0) {
    disc(removeC(target, Math.floor(Math.random() * target.hand.length)));
    addLog(`🐱 Cat Balou: ${target.name} descarta carta.`);
    return true;
  }
  if (target.equipment.weaponKey !== "colt45") {
    addLog(`🐱 Cat Balou: ${target.name} perde arma.`);
    target.equipment.weaponKey = "colt45";
    return true;
  }
  if (target.equipment.barrel) {
    target.equipment.barrel = false;
    addLog(`🐱 Cat Balou: ${target.name} perde Barril.`);
    return true;
  }
  if (target.equipment.mustang) {
    target.equipment.mustang = false;
    addLog(`🐱 Cat Balou: ${target.name} perde Mustang.`);
    return true;
  }
  if (target.equipment.scope) {
    target.equipment.scope = false;
    addLog(`🐱 Cat Balou: ${target.name} perde Luneta.`);
    return true;
  }
  toast("Alvo sem nada para descartar!");
  return false;
}
function handleBangCard(context) {
  const { player, target } = context;
  if (!canUseBang(player)) {
    toast("Já usou BANG! neste turno!");
    return false;
  }
  resolveShot(player, target);
  player.usedBang = true;
  return true;
}
function handleMissedCard(context) {
  const { player, cardIndex, card } = context;
  if (player.char.ability !== "bangMissed") {
    toast("Errei! só cancela ataques recebidos!");
    return false;
  }
  if (!canUseBang(player)) {
    toast("Já usou BANG! neste turno!");
    return false;
  }
  return executeMissedAsBang(player, cardIndex, card);
}
function handleBeerCard(context) {
  const { player } = context;
  if (alive().length <= 2) {
    toast("Cerveja sem efeito com 2 jogadores!");
    return false;
  }
  heal(player);
  return true;
}
function handleDuelCard(context) {
  resolveDuel(context.player, context.target);
  return true;
}
function handlePanicCard(context) {
  return executePanicCard(context.player, context.target);
}
function handleCatBalouCard(context) {
  return executeCatBalouCard(context.target);
}
function handleJailCard(context) {
  context.target.jailed = true;
  addLog(`🔒 ${context.player.name} prende ${context.target.name}!`);
  return true;
}
function handleDynamiteCard(context) {
  const { player } = context;
  if (player.hasDynamite) {
    toast("Você já tem uma Dinamite!");
    return false;
  }
  player.hasDynamite = true;
  addLog(`💣 ${player.name} coloca Dinamite!`);
  return true;
}
function handleGeneralStoreCard(context) {
  resolveStore(context.player, context.cardIndex, context.card);
  return false;
}
function handleIndiansCard(context) {
  const { player } = context;
  addLog(`🏹 ${player.name} usa Índios!`);
  LocalState.players.forEach((tg) => {
    if (!tg.alive || tg === player) return;
    const bi = findC(tg, "bang"),
      mi = tg.char.ability === "bangMissed" ? findC(tg, "missed") : -1;
    if (bi >= 0) {
      disc(removeC(tg, bi));
      addLog(`${tg.name} descarta BANG!`);
    } else if (mi >= 0) {
      disc(removeC(tg, mi));
      addLog(`${tg.name} (CJ) usa Errei!`);
    } else {
      damage(tg, player);
      beerRescue(tg);
    }
  });
  return true;
}
function handleSaloonCard() {
  addLog(`🥃 Saloon! Todos +1 vida.`);
  LocalState.players.forEach((tg) => {
    if (tg.alive) heal(tg);
  });
  return true;
}
function handleBarrelCard(context) {
  const { player } = context;
  if (!canEquipBarrel(player)) {
    toast("Já tem Barril!");
    return false;
  }
  player.equipment.barrel = true;
  addLog(`🛢️ ${player.name} equipa Barril.`);
  return true;
}
function handleMustangCard(context) {
  const { player } = context;
  if (!canEquipMustang(player)) {
    toast("Já tem Mustang!");
    return false;
  }
  player.equipment.mustang = true;
  addLog(`🐎 ${player.name} equipa Mustang.`);
  return true;
}
function handleScopeCard(context) {
  const { player } = context;
  if (!canEquipScope(player)) {
    toast("Já tem Luneta!");
    return false;
  }
  player.equipment.scope = true;
  addLog(`🔭 ${player.name} equipa Luneta.`);
  return true;
}
function handleWeaponCard(context) {
  const { player, card, type } = context;
  const weaponKey = card.weaponKey || type;
  if (player.equipment.weaponKey !== "colt45")
    disc({ type: player.equipment.weaponKey });
  player.equipment.weaponKey = weaponKey;
  addLog(
    `🔫 ${player.name} equipa ${WEAPONS[weaponKey].label} (alcance ${WEAPONS[weaponKey].reach}).`,
  );
  return true;
}
const CARD_ACTION_HANDLERS = {
  bang: handleBangCard,
  missed: handleMissedCard,
  beer: handleBeerCard,
  duel: handleDuelCard,
  panic: handlePanicCard,
  catbalou: handleCatBalouCard,
  jail: handleJailCard,
  dynamite: handleDynamiteCard,
  generalstore: handleGeneralStoreCard,
  indians: handleIndiansCard,
  saloon: handleSaloonCard,
  barrel: handleBarrelCard,
  mustang: handleMustangCard,
  scope: handleScopeCard,
};

function execCard(p, idx, c, tgt) {
  const actionContext = {
    player: p,
    cardIndex: idx,
    card: c,
    target: tgt,
    type: c.type,
  };
  const actionHandler =
    CARD_ACTION_HANDLERS[c.type] ||
    (WEAPON_CARD_TYPES.includes(c.type) ? handleWeaponCard : null);
  if (!actionHandler) return true;
  return actionHandler(actionContext);
}

function validTargets(type, atk) {
  const targetValidator = TARGET_VALIDATORS[type] || TARGET_VALIDATORS.default;
  return LocalState.players.filter((t) => {
    if (!t.alive || t === atk) return false;
    return targetValidator(t, atk);
  });
}

// ═══ GENERAL STORE ═══
function closeStoreModal() {
  const modal = document.getElementById("store-modal");
  if (modal) modal.classList.remove("open");
  const list = document.getElementById("sm-list");
  if (list) list.innerHTML = "";
}

function resolveStore(p, idx, c) {
  const al = alive();
  LocalState.storeCards = [];
  for (let i = 0; i < al.length; i++) {
    if (LocalState.drawPile.length === 0) reshuf();
    LocalState.storeCards.push(LocalState.drawPile.pop());
  }
  removeC(p, idx);
  disc(c);
  addLog(`🏪 Loja Geral: ${al.length} cartas.`);
  LocalState.storeOrder = [];
  let cur = LocalState.current;
  for (let i = 0; i < al.length; i++) {
    if (LocalState.players[cur].alive) LocalState.storeOrder.push(cur);
    cur = nextAlive(cur - 1);
  }
  LocalState.storePick = 0;
  processStore();
}
function processStore() {
  if (
    LocalState.storePick >= LocalState.storeOrder.length ||
    LocalState.storeCards.length === 0
  ) {
    closeStoreModal();
    renderGame();
    return;
  }
  // Fecha e limpa antes de cada passo: evita botões antigos clicáveis enquanto bots escolhem (async).
  closeStoreModal();

  const pi = LocalState.storeOrder[LocalState.storePick],
    picker = LocalState.players[pi];
  if (picker.isBot) {
    const best = LocalState.storeCards.reduce(
      (b, c, i) => {
        const sc = STORE_CARD_PRIORITY[c.type] || GAME_LIMITS.defaultWeaponReach;
        return sc > b.sc ? { sc, i } : b;
      },
      { sc: -1, i: 0 },
    );
    const ch = LocalState.storeCards.splice(best.i, 1)[0];
    picker.hand.push(ch);
    addLog(`🤖 ${picker.name} pega ${ch.label}.`, "bot");
    LocalState.storePick++;
    setTimeout(processStore, GAME_LIMITS.storeBotPickDelayMs);
    return;
  }
  document.getElementById("sm-desc").textContent =
    `${picker.name}, escolha uma carta:`;
  const list = document.getElementById("sm-list");
  LocalState.storeCards.forEach((card) => {
    const btn = document.createElement("button");
    btn.className = "tbtn";
    btn.innerHTML = `${card.icon} ${card.label} <span class="td">${card.suit}${card.value}</span>`;
    btn.onclick = () => {
      if (LocalState.storeOrder[LocalState.storePick] !== pi) return;
      const cardIndex = LocalState.storeCards.indexOf(card);
      if (cardIndex < 0) return;
      const taken = LocalState.storeCards.splice(cardIndex, 1)[0];
      closeStoreModal();
      picker.hand.push(taken);
      addLog(`🏪 ${picker.name} pega ${taken.label}.`);
      LocalState.storePick++;
      processStore();
    };
    list.appendChild(btn);
  });
  document.getElementById("store-modal").classList.add("open");
}

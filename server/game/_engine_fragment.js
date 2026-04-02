function addLog(msg, type = "") {
  state.log.unshift({ msg, type });
  if (state.log.length > GAME_LIMITS.logMaxEntries) state.log.pop();
}
function rLabel(r) {
  return ROLE_LABELS[r] || r;
}
function rIcon(r) {
  return ROLE_ICONS[r] || "?";
}
function toast(msg) {
  state.lastToast = msg;
}
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
    pending: null,
    lastToast: null,
    winInfo: null,
  };
}
function dealInitialCards() {
  state.players.forEach((player) => {
    for (let cardCount = 0; cardCount < player.maxLife; cardCount++)
      dealCard(player);
  });
}

function logPlayersAtGameStart() {
  addLog(`⭐ Partida iniciada! ${state.players.length} jogadores.`, "imp");
  state.players.forEach((player) =>
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

function launchNetworkGame(players) {
  moveSheriffToFirst(players);
  state = createGameState(players, "online");
  dealInitialCards();
  logPlayersAtGameStart();
  beginTurn();
}

// ═══ CARD OPS ═══
function dealCard(p) {
  if (state.drawPile.length === 0) reshuf();
  if (state.drawPile.length === 0) return null;
  const c = state.drawPile.pop();
  p.hand.push(c);
  return c;
}
function reshuf() {
  if (state.discardPile.length === 0) return;
  state.drawPile = shuffle([...state.discardPile]);
  state.discardPile = [];
  addLog("Baralho reembaralhado.");
}
function disc(c) {
  if (c) state.discardPile.push(c);
}
function findC(p, t) {
  return p.hand.findIndex((c) => c.type === t);
}
function removeC(p, i) {
  return p.hand.splice(i, 1)[0];
}

// ═══ DISTANCE ═══
function alive() {
  return state.players.filter((p) => p.alive);
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
  if (state.drawPile.length === 0) reshuf();
  const c = state.drawPile.pop();
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
  const nextPlayerIndex = nextAlive(state.current);
  state.players[nextPlayerIndex].hasDynamite = true;
  player.hasDynamite = false;
  addLog(`💣 Dinamite passa para ${state.players[nextPlayerIndex].name}.`);
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
    if (state.drawPile.length === 0) reshuf();
    topCards.push(state.drawPile.pop());
  }
  state.drawPile.push(topCards[GAME_LIMITS.kitCarlsonKeepCount]);
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
  const topDiscardCard = state.discardPile.pop();
  player.hand.push(topDiscardCard);
  dealCard(player);
  addLog(`${player.name} (Pedro Ramirez) compra do descarte + baralho.`);
}
function drawTwoDefaultCards(player) {
  for (let drawIndex = 0; drawIndex < GAME_LIMITS.defaultDrawCount; drawIndex++) dealCard(player);
  addLog(`${player.name} compra ${GAME_LIMITS.defaultDrawCount} cartas.`);
}

const DRAW_STRATEGIES = {
  peekDraw: (player) => drawThreeKeepTwo(player),
  blackJack: (player) => drawBlackJackCards(player),
  discardDraw: (player) => drawFromDiscardThenDeck(player),
  default: (player) => drawTwoDefaultCards(player),
};
const TARGET_VALIDATORS = {
  bang: (target, attacker) => canShoot(attacker, target),
  jail: (target) => target.role !== "sheriff",
  panic: (target, attacker) =>
    dist(attacker, target) <= 1 && canTargetBeLooted(target),
  default: () => true,
};

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
  state.players.forEach((pl) => {
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
  if (state.gameOver) return;
  const sA = state.players.some((p) => p.role === "sheriff" && p.alive);
  const oA = state.players.some((p) => p.role === "outlaw" && p.alive);
  const rA = state.players.some((p) => p.role === "renegade" && p.alive);
  const dA = state.players.some((p) => p.role === "deputy" && p.alive);
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
  state.gameOver = true;
  state.winInfo = { icon, title, desc };
}

// ═══ TURN ═══
function beginTurn() {
  if (state.gameOver) return;
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
  state.phase = PHASES.draw;
}
function doDraw() {
  const p = currentP();
  if (state.phase !== PHASES.draw) return;
  const drawStrategyKey =
    p.char.ability === "discardDraw" && state.discardPile.length === 0
      ? "default"
      : p.char.ability;
  const drawStrategy =
    DRAW_STRATEGIES[drawStrategyKey] || DRAW_STRATEGIES.default;
  drawStrategy(p);
  state.phase = PHASES.play;
}
function endPlay() {
  if (state.phase === PHASES.play) {
    state.phase = PHASES.discard;
  }
}
function doDiscard(i) {
  if (state.phase !== PHASES.discard) return;
  disc(currentP().hand.splice(i, 1)[0]);
}
function endDiscard() {
  const p = currentP();
  if (p.hand.length > p.life) {
    toast(`Descarte até ${p.life} carta(s)!`);
    return;
  }
  advTurn();
}
function advTurn() {
  if (state.gameOver) return;
  state.current = nextAlive(state.current);
  state.phase = PHASES.start;
  beginTurn();
}
function nextAlive(from) {
  let n = (from + 1) % state.players.length,
    s = 0;
  while (!state.players[n].alive && s < state.players.length) {
    n = (n + 1) % state.players.length;
    s++;
  }
  return n;
}
function currentP() {
  return state.players[state.current];
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
  if (state.gameOver || state.phase !== "play") return { error: "Jogada inválida" };
  const p = currentP();
  const c = p.hand[idx];
  if (!c) return { error: "Carta inválida" };
  state.pendingCard = c;
  state.pendingIdx = idx;
  if (CARD_TYPES_REQUIRING_TARGET.includes(c.type)) {
    const tgts = validTargets(c.type, p);
    if (!tgts.length) {
      toast("Nenhum alvo válido!");
      return { error: state.lastToast };
    }
    state.pending = {
      kind: "chooseTarget",
      playerId: p.id,
      cardIndex: idx,
      cardType: c.type,
      validTargetIds: tgts.map((t) => t.id),
    };
    return { ok: true, pending: true };
  }
  return consumeExec(p, idx, c, null);
}
function consumeExec(p, idx, c, tgt) {
  const ok = execCard(p, idx, c, tgt);
  if (ok) {
    removeC(p, idx);
    disc(c);
    suzyCheck(p);
    return { ok: true };
  }
  if (state.pending) return { ok: true, pending: true };
  return { ok: false, error: state.lastToast || "Jogada inválida" };
}
function suzyCheck(p) {
  if (
    p.char.ability === "drawOnEmpty" &&
    p.hand.length === 0 &&
    state.phase === "play"
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
  state.pending = {
    kind: "missedAsBang",
    playerId: player.id,
    cardIndex,
    validTargetIds: targets.map((t) => t.id),
  };
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
  state.players.forEach((tg) => {
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
  state.players.forEach((tg) => {
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
  return state.players.filter((t) => {
    if (!t.alive || t === atk) return false;
    return targetValidator(t, atk);
  });
}

// ═══ GENERAL STORE ═══
function closeStoreModal() {}

function resolveStore(p, idx, c) {
  const al = alive();
  state.storeCards = [];
  for (let i = 0; i < al.length; i++) {
    if (state.drawPile.length === 0) reshuf();
    state.storeCards.push(state.drawPile.pop());
  }
  removeC(p, idx);
  disc(c);
  addLog(`🏪 Loja Geral: ${al.length} cartas.`);
  state.storeOrder = [];
  let cur = state.current;
  for (let i = 0; i < al.length; i++) {
    if (state.players[cur].alive) state.storeOrder.push(cur);
    cur = nextAlive(cur - 1);
  }
  state.storePick = 0;
  processStore();
}
function processStore() {
  if (
    state.storePick >= state.storeOrder.length ||
    state.storeCards.length === 0
  ) {
    state.pending = null;
    return;
  }
  closeStoreModal();
  const pi = state.storeOrder[state.storePick];
  const picker = state.players[pi];
  state.pending = {
    kind: "storePick",
    pickerId: pi,
    cards: state.storeCards.map((c) => ({ ...c })),
  };
}

function createOnlinePlayers(names) {
  const n = names.length;
  const { roles, chars } = createRandomRolesAndChars(n);
  return names.map((name, i) =>
    mkPlayer(
      i,
      (name && String(name).trim()) || `Jogador ${i + 1}`,
      roles[i],
      chars[i],
      false,
      null,
    ),
  );
}

function finishChooseTarget(playerId, targetId) {
  if (!state.pending || state.pending.kind !== "chooseTarget")
    return { error: "Nada pendente" };
  if (state.pending.playerId !== playerId) return { error: "Não é sua escolha" };
  if (!state.pending.validTargetIds.includes(targetId)) return { error: "Alvo inválido" };
  const p = state.players[playerId];
  const idx = state.pending.cardIndex;
  const c = p.hand[idx];
  const tgt = state.players.find((x) => x.id === targetId);
  if (!tgt) return { error: "Alvo inválido" };
  state.pending = null;
  return consumeExec(p, idx, c, tgt);
}

function finishMissedAsBang(playerId, targetId) {
  if (!state.pending || state.pending.kind !== "missedAsBang")
    return { error: "Nada pendente" };
  if (state.pending.playerId !== playerId) return { error: "Não é sua escolha" };
  if (!state.pending.validTargetIds.includes(targetId)) return { error: "Alvo inválido" };
  const player = state.players[playerId];
  const idx = state.pending.cardIndex;
  const card = player.hand[idx];
  const target = state.players.find((x) => x.id === targetId);
  if (!target) return { error: "Alvo inválido" };
  state.pending = null;
  removeC(player, idx);
  disc(card);
  resolveShot(player, target);
  player.usedBang = true;
  suzyCheck(player);
  return { ok: true };
}

function finishStorePick(playerId, cardIndex) {
  if (!state.pending || state.pending.kind !== "storePick")
    return { error: "Loja não está aguardando" };
  if (state.pending.pickerId !== playerId) return { error: "Não é sua vez na loja" };
  const cards = state.storeCards;
  if (cardIndex < 0 || cardIndex >= cards.length) return { error: "Carta inválida" };
  const taken = cards.splice(cardIndex, 1)[0];
  const picker = state.players[playerId];
  picker.hand.push(taken);
  addLog(`🏪 ${picker.name} pega ${taken.label}.`);
  state.storePick++;
  state.pending = null;
  processStore();
  return { ok: true };
}

function applySidKetchum(playerId) {
  if (state.phase !== PHASES.play) return { error: "Fase inválida" };
  const p = currentP();
  if (p.id !== playerId) return { error: "Não é seu turno" };
  if (p.char.ability !== "selfHeal") return { error: "Habilidade indisponível" };
  if (p.hand.length < PLAYER_ABILITY_RULES.sidKetchumDiscardCost)
    return { error: "Cartas insuficientes" };
  if (p.life >= p.maxLife) return { error: "Vida máxima" };
  for (let i = 0; i < PLAYER_ABILITY_RULES.sidKetchumDiscardCost; i++) disc(p.hand.pop());
  heal(p);
  addLog(`${p.name} (Sid Ketchum) usa habilidade!`);
  return { ok: true };
}

function applyAction(playerId, action) {
  state.lastToast = null;
  if (state.gameOver) return { error: "Partida encerrada" };
  const t = action && action.type;
  if (!t) return { error: "Ação inválida" };

  if (t === "chooseTarget") return finishChooseTarget(playerId, action.targetId);
  if (t === "missedAsBangTarget") return finishMissedAsBang(playerId, action.targetId);
  if (t === "storePick") return finishStorePick(playerId, action.cardIndex);

  if (state.current !== playerId) return { error: "Não é seu turno" };

  switch (t) {
    case "draw":
      doDraw();
      return { ok: true };
    case "endPlay":
      endPlay();
      return { ok: true };
    case "discard":
      doDiscard(action.index);
      return { ok: true };
    case "endDiscard":
      endDiscard();
      return { ok: true };
    case "playCard":
      return playCard(action.index);
    case "sidKetchum":
      return applySidKetchum(playerId);
    default:
      return { error: "Ação desconhecida" };
  }
}


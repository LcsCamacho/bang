'use strict';
const C = require("./constants");
module.exports = { createBangEngine };
function createBangEngine() {
  let state;
  const {
    SUITS, VALUES, WEAPONS, CHARS, CARD_TYPES_REQUIRING_TARGET, WEAPON_CARD_TYPES,
    STORE_CARD_PRIORITY, ROLE_SETUPS, GAME_LIMITS, CARD_SUITS, DYNAMITE_EXPLOSION_VALUES,
    ROLE_LABELS, ROLE_ICONS, PHASES, PLAYER_ABILITY_RULES,
  } = C;
function addLog(logText, type = "") {
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
  const suitValuePairs = [];
  SUITS.forEach((suit) => VALUES.forEach((value) => suitValuePairs.push({ suit, value })));
  shuffle(suitValuePairs);
  cards.forEach((card, cardIndex) => {
    const pair = suitValuePairs[cardIndex % suitValuePairs.length];
    card.suit = pair.suit;
    card.value = pair.value;
  });
  return cards;
}
function shuffle(items) {
  for (let lastIndex = items.length - 1; lastIndex > 0; lastIndex--) {
    const swapIndex = Math.floor(Math.random() * (lastIndex + 1));
    [items[lastIndex], items[swapIndex]] = [items[swapIndex], items[lastIndex]];
  }
  return items;
}

// ═══ STATE ═══
function buildRoles(playerCount) {
  return ROLE_SETUPS[playerCount] || ROLE_SETUPS.default;
}
function mkPlayer(id, name, role, char, isBot, diff) {
  let startingLife = char.life + (role === "sheriff" ? 1 : 0);
  startingLife = Math.min(startingLife, GAME_LIMITS.maxLifeCap);
  return {
    id,
    name,
    role,
    char,
    life: startingLife,
    maxLife: startingLife,
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
function dealCard(player) {
  if (state.drawPile.length === 0) reshuf();
  if (state.drawPile.length === 0) return null;
  const drawnCard = state.drawPile.pop();
  player.hand.push(drawnCard);
  return drawnCard;
}
function reshuf() {
  if (state.discardPile.length === 0) return;
  state.drawPile = shuffle([...state.discardPile]);
  state.discardPile = [];
  addLog("Baralho reembaralhado.");
}
function disc(card) {
  if (card) state.discardPile.push(card);
}
function findC(player, cardType) {
  return player.hand.findIndex((card) => card.type === cardType);
}
function removeC(player, handIndex) {
  return player.hand.splice(handIndex, 1)[0];
}

// ═══ DISTANCE ═══
function alive() {
  return state.players.filter((player) => player.alive);
}
function dist(fromPlayer, toPlayer) {
  const aliveRing = alive();
  const indexFrom = aliveRing.indexOf(fromPlayer);
  const indexTo = aliveRing.indexOf(toPlayer);
  if (indexFrom < 0 || indexTo < 0) return GAME_LIMITS.invalidDistance;
  const aliveCount = aliveRing.length;
  let distance = Math.abs(indexFrom - indexTo);
  distance = Math.min(distance, aliveCount - distance);
  if (toPlayer.equipment.mustang || toPlayer.char.ability === "builtinMustang") distance++;
  if (fromPlayer.equipment.scope) distance--;
  return Math.max(GAME_LIMITS.minimumDistance, distance);
}
function reach(player) {
  return WEAPONS[player.equipment.weaponKey]?.reach || GAME_LIMITS.defaultWeaponReach;
}
function canShoot(attacker, defender) {
  return dist(attacker, defender) <= reach(attacker);
}

// ═══ DRAW CHECK ═══
function drawCheck() {
  if (state.drawPile.length === 0) reshuf();
  const drawnCard = state.drawPile.pop();
  disc(drawnCard);
  return drawnCard;
}
function drawCheckLD(player) {
  const firstDraw = drawCheck();
  const secondDraw = drawCheck();
  addLog(
    `${player.name} (Lucky Duke): ${firstDraw.suit}${firstDraw.value} e ${secondDraw.suit}${secondDraw.value}`,
    "bot",
  );
  return [firstDraw, secondDraw];
}
function doDrawCheck(player) {
  if (player.char.ability === "twoDraws") {
    const [firstDraw] = drawCheckLD(player);
    return firstDraw;
  }
  const drawnCard = drawCheck();
  addLog(`Draw!: ${drawnCard.suit}${drawnCard.value}`);
  return drawnCard;
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
function damage(target, attacker, damageAmount = 1) {
  for (let hitIndex = 0; hitIndex < damageAmount; hitIndex++) {
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
      const stolenCard = attacker.hand.splice(
        Math.floor(Math.random() * attacker.hand.length),
        1,
      )[0];
      target.hand.push(stolenCard);
      addLog(`El Gringo (${target.name}) rouba de ${attacker.name}!`, "bot");
    }
    if (target.life <= 0) {
      elim(target, attacker);
      break;
    }
  }
}
function heal(player, amount = 1) {
  player.life = Math.min(player.life + amount, player.maxLife);
  addLog(`❤️ ${player.name} +${amount} vida (${player.life}/${player.maxLife})`, "hl");
}
function elim(eliminated, killer) {
  eliminated.alive = false;
  addLog(`💀 ${eliminated.name} eliminado! (${rLabel(eliminated.role)})`, "dth");
  if (eliminated.role === "outlaw" && killer && killer !== eliminated && killer.alive) {
    for (let rewardIndex = 0; rewardIndex < GAME_LIMITS.outlawKillRewardCards; rewardIndex++)
      dealCard(killer);
    addLog(`🎁 ${killer.name} recebe ${GAME_LIMITS.outlawKillRewardCards} cartas!`);
  }
  if (eliminated.role === "deputy" && killer && killer.role === "sheriff") {
    killer.hand = [];
    killer.equipment = createDefaultEquipment();
    addLog(`⭐ Xerife matou o próprio deputado — perde tudo!`, "imp");
  }
  state.players.forEach((scavenger) => {
    if (
      scavenger.char.ability === "vultureSam" &&
      scavenger.alive &&
      scavenger !== eliminated
    ) {
      eliminated.hand.forEach((handCard) => scavenger.hand.push(handCard));
      eliminated.hand = [];
      addLog(`🦅 Vulture Sam (${scavenger.name}) pega cartas de ${eliminated.name}!`);
    }
  });
  if (eliminated.hand.length > 0) {
    eliminated.hand.forEach((handCard) => disc(handCard));
    eliminated.hand = [];
  }
  checkWin();
}
function beerRescue(player) {
  if (!player.alive && alive().length > 2) {
    const beerIdx = findC(player, "beer");
    if (beerIdx >= 0) {
      disc(removeC(player, beerIdx));
      player.life = 1;
      player.alive = true;
      addLog(`🍺 ${player.name} bebe cerveja e sobrevive!`, "hl");
    }
  }
}

// ═══ WIN ═══
function checkWin() {
  if (state.gameOver) return;
  const sheriffAlive = state.players.some(
    (player) => player.role === "sheriff" && player.alive,
  );
  const outlawAlive = state.players.some(
    (player) => player.role === "outlaw" && player.alive,
  );
  const renegadeAlive = state.players.some(
    (player) => player.role === "renegade" && player.alive,
  );
  const deputyAlive = state.players.some(
    (player) => player.role === "deputy" && player.alive,
  );
  if (!sheriffAlive) {
    if (!outlawAlive && !deputyAlive && renegadeAlive)
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
  if (!outlawAlive && !renegadeAlive)
    showWin("⭐", "Xerife Vence!", "A ordem foi restaurada no Velho Oeste!");
}
function showWin(icon, title, desc) {
  state.gameOver = true;
  state.winInfo = { icon, title, desc };
}

// ═══ TURN ═══
function beginTurn() {
  if (state.gameOver) return;
  const activePlayer = currentP();
  activePlayer.usedBang = false;
  if (!resolveDynamiteAtTurnStart(activePlayer)) {
    advTurn();
    return;
  }
  if (!activePlayer.alive) {
    advTurn();
    return;
  }
  if (!resolveJailAtTurnStart(activePlayer)) {
    advTurn();
    return;
  }
  state.phase = PHASES.draw;
}
function doDraw() {
  const activePlayer = currentP();
  if (state.phase !== PHASES.draw) return;
  const drawStrategyKey =
    activePlayer.char.ability === "discardDraw" && state.discardPile.length === 0
      ? "default"
      : activePlayer.char.ability;
  const drawStrategy =
    DRAW_STRATEGIES[drawStrategyKey] || DRAW_STRATEGIES.default;
  drawStrategy(activePlayer);
  state.phase = PHASES.play;
}
function endPlay() {
  if (state.phase === PHASES.play) {
    state.phase = PHASES.discard;
  }
}
function doDiscard(handIndex) {
  if (state.phase !== PHASES.discard) return;
  disc(currentP().hand.splice(handIndex, 1)[0]);
}
function endDiscard() {
  const activePlayer = currentP();
  if (activePlayer.hand.length > activePlayer.life) {
    toast(`Descarte até ${activePlayer.life} carta(s)!`);
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
function nextAlive(fromSeatIndex) {
  let cursor = (fromSeatIndex + 1) % state.players.length;
  let stepsChecked = 0;
  while (!state.players[cursor].alive && stepsChecked < state.players.length) {
    cursor = (cursor + 1) % state.players.length;
    stepsChecked++;
  }
  return cursor;
}
function currentP() {
  return state.players[state.current];
}

// ═══ COMBAT ═══
function resolveShot(attacker, target) {
  addLog(`🔫 ${attacker.name} atira em ${target.name}!`);
  const hasBarrel =
    target.equipment.barrel || target.char.ability === "builtinBarrel";
  if (hasBarrel) {
    const barrelDraw = doDrawCheck(target);
    if (barrelDraw.suit === "♥") {
      addLog(`🛢️ Barril salvou ${target.name}!`);
      return;
    }
  }
  const missesRequired = attacker.char.ability === "doubleMissed" ? 2 : 1;
  const missedCount = target.hand.filter((card) => card.type === "missed").length;
  const bangAsMissedCount =
    target.char.ability === "bangMissed"
      ? target.hand.filter((card) => card.type === "bang").length
      : 0;
  if (missedCount + bangAsMissedCount >= missesRequired) {
    let remaining = missesRequired;
    while (remaining > 0 && findC(target, "missed") >= 0) {
      disc(removeC(target, findC(target, "missed")));
      remaining--;
    }
    while (
      remaining > 0 &&
      target.char.ability === "bangMissed" &&
      findC(target, "bang") >= 0
    ) {
      disc(removeC(target, findC(target, "bang")));
      remaining--;
    }
    addLog(`🙈 ${target.name} evitou o tiro!`);
  } else {
    damage(target, attacker);
    beerRescue(target);
  }
}
function resolveDuel(challenger, defender) {
  addLog(`⚔️ DUELO: ${challenger.name} vs ${defender.name}!`);
  let activeDuelist = defender;
  let passiveDuelist = challenger;
  let duelRound = 0;
  while (duelRound++ < GAME_LIMITS.duelRoundLimit) {
    const bangIdx = findC(activeDuelist, "bang");
    const missedIdx =
      activeDuelist.char.ability === "bangMissed" ? findC(activeDuelist, "missed") : -1;
    if (bangIdx >= 0) {
      disc(removeC(activeDuelist, bangIdx));
      addLog(`⚔️ ${activeDuelist.name} joga BANG!`);
      [activeDuelist, passiveDuelist] = [passiveDuelist, activeDuelist];
    } else if (missedIdx >= 0) {
      disc(removeC(activeDuelist, missedIdx));
      addLog(`⚔️ ${activeDuelist.name} (CJ) usa Errei!`);
      [activeDuelist, passiveDuelist] = [passiveDuelist, activeDuelist];
    } else {
      addLog(`⚔️ ${activeDuelist.name} cede!`);
      damage(activeDuelist, passiveDuelist);
      beerRescue(activeDuelist);
      break;
    }
  }
}

// ═══ PLAY CARD ═══
function playCard(handIndex) {
  if (state.gameOver || state.phase !== "play") return { error: "Jogada inválida" };
  const activePlayer = currentP();
  const card = activePlayer.hand[handIndex];
  if (!card) return { error: "Carta inválida" };
  state.pendingCard = card;
  state.pendingIdx = handIndex;
  if (CARD_TYPES_REQUIRING_TARGET.includes(card.type)) {
    const targets = validTargets(card.type, activePlayer);
    if (!targets.length) {
      toast("Nenhum alvo válido!");
      return { error: state.lastToast };
    }
    state.pending = {
      kind: "chooseTarget",
      playerId: activePlayer.id,
      cardIndex: handIndex,
      cardType: card.type,
      validTargetIds: targets.map((targetPlayer) => targetPlayer.id),
    };
    return { ok: true, pending: true };
  }
  return consumeExec(activePlayer, handIndex, card, null);
}
function consumeExec(player, handIndex, card, target) {
  const cardResolved = execCard(player, handIndex, card, target);
  if (cardResolved) {
    removeC(player, handIndex);
    disc(card);
    suzyCheck(player);
    return { ok: true };
  }
  if (state.pending) return { ok: true, pending: true };
  return { ok: false, error: state.lastToast || "Jogada inválida" };
}
function suzyCheck(player) {
  if (
    player.char.ability === "drawOnEmpty" &&
    player.hand.length === 0 &&
    state.phase === "play"
  ) {
    dealCard(player);
    addLog(`${player.name} (Suzy Lafayette) compra carta.`);
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
    validTargetIds: targets.map((targetPlayer) => targetPlayer.id),
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
  state.players.forEach((victim) => {
    if (!victim.alive || victim === player) return;
    const bangIdx = findC(victim, "bang");
    const missedIdx =
      victim.char.ability === "bangMissed" ? findC(victim, "missed") : -1;
    if (bangIdx >= 0) {
      disc(removeC(victim, bangIdx));
      addLog(`${victim.name} descarta BANG!`);
    } else if (missedIdx >= 0) {
      disc(removeC(victim, missedIdx));
      addLog(`${victim.name} (CJ) usa Errei!`);
    } else {
      damage(victim, player);
      beerRescue(victim);
    }
  });
  return true;
}
function handleSaloonCard() {
  addLog(`🥃 Saloon! Todos +1 vida.`);
  state.players.forEach((saloonPlayer) => {
    if (saloonPlayer.alive) heal(saloonPlayer);
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

function execCard(player, handIndex, card, target) {
  const actionContext = {
    player,
    cardIndex: handIndex,
    card,
    target,
    type: card.type,
  };
  const actionHandler =
    CARD_ACTION_HANDLERS[card.type] ||
    (WEAPON_CARD_TYPES.includes(card.type) ? handleWeaponCard : null);
  if (!actionHandler) return true;
  return actionHandler(actionContext);
}

function validTargets(type, attacker) {
  const targetValidator = TARGET_VALIDATORS[type] || TARGET_VALIDATORS.default;
  return state.players.filter((candidate) => {
    if (!candidate.alive || candidate === attacker) return false;
    return targetValidator(candidate, attacker);
  });
}

// ═══ GENERAL STORE ═══
function closeStoreModal() {}

function resolveStore(player, handIndex, storeCard) {
  const alivePlayers = alive();
  state.storeCards = [];
  for (let drawStep = 0; drawStep < alivePlayers.length; drawStep++) {
    if (state.drawPile.length === 0) reshuf();
    state.storeCards.push(state.drawPile.pop());
  }
  removeC(player, handIndex);
  disc(storeCard);
  addLog(`🏪 Loja Geral: ${alivePlayers.length} cartas.`);
  state.storeOrder = [];
  let seatCursor = state.current;
  for (let orderStep = 0; orderStep < alivePlayers.length; orderStep++) {
    if (state.players[seatCursor].alive) state.storeOrder.push(seatCursor);
    seatCursor = nextAlive(seatCursor - 1);
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
  const pickerSeatIndex = state.storeOrder[state.storePick];
  const picker = state.players[pickerSeatIndex];
  state.pending = {
    kind: "storePick",
    pickerId: picker.id,
    cards: state.storeCards.map((card) => ({ ...card })),
  };
}

function createOnlinePlayers(names) {
  const playerCount = names.length;
  const { roles, chars } = createRandomRolesAndChars(playerCount);
  return names.map((name, playerIndex) =>
    mkPlayer(
      playerIndex,
      (name && String(name).trim()) || `Jogador ${playerIndex + 1}`,
      roles[playerIndex],
      chars[playerIndex],
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
  const actor = state.players.find((player) => player.id === playerId);
  const pendingHandIndex = state.pending.cardIndex;
  const playedCard = actor.hand[pendingHandIndex];
  const targetPlayer = state.players.find((player) => player.id === targetId);
  if (!targetPlayer) return { error: "Alvo inválido" };
  state.pending = null;
  return consumeExec(actor, pendingHandIndex, playedCard, targetPlayer);
}

function finishMissedAsBang(playerId, targetId) {
  if (!state.pending || state.pending.kind !== "missedAsBang")
    return { error: "Nada pendente" };
  if (state.pending.playerId !== playerId) return { error: "Não é sua escolha" };
  if (!state.pending.validTargetIds.includes(targetId)) return { error: "Alvo inválido" };
  const player = state.players.find((candidate) => candidate.id === playerId);
  const pendingCardIndex = state.pending.cardIndex;
  const card = player.hand[pendingCardIndex];
  const target = state.players.find((candidate) => candidate.id === targetId);
  if (!target) return { error: "Alvo inválido" };
  state.pending = null;
  removeC(player, pendingCardIndex);
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
  const picker = state.players.find((candidate) => candidate.id === playerId);
  picker.hand.push(taken);
  addLog(`🏪 ${picker.name} pega ${taken.label}.`);
  state.storePick++;
  state.pending = null;
  processStore();
  return { ok: true };
}

function applySidKetchum(playerId) {
  if (state.phase !== PHASES.play) return { error: "Fase inválida" };
  const activePlayer = currentP();
  if (activePlayer.id !== playerId) return { error: "Não é seu turno" };
  if (activePlayer.char.ability !== "selfHeal") return { error: "Habilidade indisponível" };
  if (activePlayer.hand.length < PLAYER_ABILITY_RULES.sidKetchumDiscardCost)
    return { error: "Cartas insuficientes" };
  if (activePlayer.life >= activePlayer.maxLife) return { error: "Vida máxima" };
  for (let discardStep = 0; discardStep < PLAYER_ABILITY_RULES.sidKetchumDiscardCost; discardStep++)
    disc(activePlayer.hand.pop());
  heal(activePlayer);
  addLog(`${activePlayer.name} (Sid Ketchum) usa habilidade!`);
  return { ok: true };
}

function isCurrentPlayer(playerId) {
  const currentPlayer = state.players[state.current];
  return currentPlayer && currentPlayer.id === playerId;
}

function applyAction(playerId, action) {
  state.lastToast = null;
  if (state.gameOver) return { error: "Partida encerrada" };
  const actionType = action && action.type;
  if (!actionType) return { error: "Ação inválida" };

  if (actionType === "chooseTarget") return finishChooseTarget(playerId, action.targetId);
  if (actionType === "missedAsBangTarget")
    return finishMissedAsBang(playerId, action.targetId);
  if (actionType === "storePick") return finishStorePick(playerId, action.cardIndex);

  if (!isCurrentPlayer(playerId)) return { error: "Não é seu turno" };

  switch (actionType) {
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

  return {
    getState: () => state,
    applyAction,
    launchNetworkGame,
    createOnlinePlayers,
    _setState(nextState) {
      state = nextState;
    },
  };
}

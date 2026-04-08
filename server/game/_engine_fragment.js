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



// ═══ SETUP SCREENS ═══
function updateOffInfo() {
  const totalPlayers = parseInt(document.getElementById("off-n").value);
  const botCount = totalPlayers - 1;
  document.getElementById("off-info").textContent =
    `Você + ${botCount} bot${botCount > 1 ? "s" : ""} (${totalPlayers} jogadores)`;
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
  state = createGameState(players, mode);
  dealInitialCards();
  renderGameScreen();
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
function discardCardToPile(card) {
  if (card) state.discardPile.push(card);
}
function findHandCardIndexByType(player, cardType) {
  return player.hand.findIndex((card) => card.type === cardType);
}
function removeCardFromHandAt(player, handIndex) {
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
  discardCardToPile(drawnCard);
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
    eliminated.hand.forEach((handCard) => discardCardToPile(handCard));
    eliminated.hand = [];
  }
  checkWin();
}
function beerRescue(player) {
  if (!player.alive && alive().length > 2) {
    const beerIdx = findHandCardIndexByType(player, "beer");
    if (beerIdx >= 0) {
      discardCardToPile(removeCardFromHandAt(player, beerIdx));
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
  const activePlayer = getCurrentPlayer();
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
  renderGame();
  if (activePlayer.isBot) setTimeout(botDoTurn, GAME_LIMITS.botTurnDelayMs);
  else if (state.mode === "hotseat") showHotseat();
}
function doDraw() {
  if (state.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "draw" });
    return;
  }
  const activePlayer = getCurrentPlayer();
  if (state.phase !== PHASES.draw) return;
  const drawStrategyKey =
    activePlayer.char.ability === "discardDraw" && state.discardPile.length === 0
      ? "default"
      : activePlayer.char.ability;
  const drawStrategy =
    DRAW_STRATEGIES[drawStrategyKey] || DRAW_STRATEGIES.default;
  drawStrategy(activePlayer);
  state.phase = PHASES.play;
  renderGame();
}
function endPlay() {
  if (state.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "endPlay" });
    return;
  }
  if (state.phase === PHASES.play) {
    state.phase = PHASES.discard;
    renderGame();
  }
}
function doDiscard(handIndex) {
  if (state.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "discard", index: handIndex });
    return;
  }
  if (state.phase !== PHASES.discard) return;
  discardCardToPile(getCurrentPlayer().hand.splice(handIndex, 1)[0]);
  renderGame();
}
function endDiscard() {
  if (state.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "endDiscard" });
    return;
  }
  const activePlayer = getCurrentPlayer();
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
  hideBotBar();
  renderGame();
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
function getCurrentPlayer() {
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
    while (remaining > 0 && findHandCardIndexByType(target, "missed") >= 0) {
      discardCardToPile(removeCardFromHandAt(target, findHandCardIndexByType(target, "missed")));
      remaining--;
    }
    while (
      remaining > 0 &&
      target.char.ability === "bangMissed" &&
      findHandCardIndexByType(target, "bang") >= 0
    ) {
      discardCardToPile(removeCardFromHandAt(target, findHandCardIndexByType(target, "bang")));
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
    const bangIdx = findHandCardIndexByType(activeDuelist, "bang");
    const missedIdx =
      activeDuelist.char.ability === "bangMissed" ? findHandCardIndexByType(activeDuelist, "missed") : -1;
    if (bangIdx >= 0) {
      discardCardToPile(removeCardFromHandAt(activeDuelist, bangIdx));
      addLog(`⚔️ ${activeDuelist.name} joga BANG!`);
      [activeDuelist, passiveDuelist] = [passiveDuelist, activeDuelist];
    } else if (missedIdx >= 0) {
      discardCardToPile(removeCardFromHandAt(activeDuelist, missedIdx));
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
  if (state.mode === "online" && typeof BangNetwork !== "undefined") {
    BangNetwork.sendGameAction({ type: "playCard", index: handIndex });
    return;
  }
  if (state.gameOver || state.phase !== "play") return;
  const activePlayer = getCurrentPlayer();
  const card = activePlayer.hand[handIndex];
  if (!card) return;
  state.pendingCard = card;
  state.pendingIdx = handIndex;
  if (CARD_TYPES_REQUIRING_TARGET.includes(card.type)) {
    const targets = validTargets(card.type, activePlayer);
    if (!targets.length) {
      toast("Nenhum alvo válido!");
      return;
    }
    openModal(card.type, targets, (chosenTarget) =>
      consumeExec(activePlayer, handIndex, card, chosenTarget),
    );
    return;
  }
  consumeExec(activePlayer, handIndex, card, null);
}
function consumeExec(player, handIndex, card, target) {
  const cardResolved = execCard(player, handIndex, card, target);
  if (cardResolved) {
    removeCardFromHandAt(player, handIndex);
    discardCardToPile(card);
    suzyCheck(player);
    renderGame();
  }
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
  openModal("bang", targets, (target) => {
    removeCardFromHandAt(player, cardIndex);
    discardCardToPile(card);
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
  const stolenCard = removeCardFromHandAt(
    target,
    Math.floor(Math.random() * target.hand.length),
  );
  player.hand.push(stolenCard);
  addLog(`😱 ${player.name} rouba carta de ${target.name}.`);
  return true;
}
function executeCatBalouCard(target) {
  if (target.hand.length > 0) {
    discardCardToPile(removeCardFromHandAt(target, Math.floor(Math.random() * target.hand.length)));
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
    const bangIdx = findHandCardIndexByType(victim, "bang");
    const missedIdx =
      victim.char.ability === "bangMissed" ? findHandCardIndexByType(victim, "missed") : -1;
    if (bangIdx >= 0) {
      discardCardToPile(removeCardFromHandAt(victim, bangIdx));
      addLog(`${victim.name} descarta BANG!`);
    } else if (missedIdx >= 0) {
      discardCardToPile(removeCardFromHandAt(victim, missedIdx));
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
    discardCardToPile({ type: player.equipment.weaponKey });
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
  removeCardFromHandAt(player, handIndex);
  discardCardToPile(storeCard);
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
    closeStoreModal();
    renderGame();
    return;
  }
  // Fecha e limpa antes de cada passo: evita botões antigos clicáveis enquanto bots escolhem (async).
  closeStoreModal();

  const pickerSeatIndex = state.storeOrder[state.storePick];
  const picker = state.players[pickerSeatIndex];
  if (picker.isBot) {
    const bestPick = state.storeCards.reduce(
      (acc, card, cardIndex) => {
        const priorityScore =
          STORE_CARD_PRIORITY[card.type] || GAME_LIMITS.defaultWeaponReach;
        return priorityScore > acc.priorityScore
          ? { priorityScore, cardIndex }
          : acc;
      },
      { priorityScore: -1, cardIndex: 0 },
    );
    const chosenCard = state.storeCards.splice(bestPick.cardIndex, 1)[0];
    picker.hand.push(chosenCard);
    addLog(`🤖 ${picker.name} pega ${chosenCard.label}.`, "bot");
    state.storePick++;
    setTimeout(processStore, GAME_LIMITS.storeBotPickDelayMs);
    return;
  }
  document.getElementById("sm-desc").textContent =
    `${picker.name}, escolha uma carta:`;
  const storeListEl = document.getElementById("sm-list");
  state.storeCards.forEach((card) => {
    const pickCardButton = document.createElement("button");
    pickCardButton.className = "target-btn";
    pickCardButton.innerHTML = `${card.icon} ${card.label} <span class="target-btn__meta">${card.suit}${card.value}</span>`;
    pickCardButton.onclick = () => {
      if (state.storeOrder[state.storePick] !== pickerSeatIndex) return;
      const cardIndex = state.storeCards.indexOf(card);
      if (cardIndex < 0) return;
      const taken = state.storeCards.splice(cardIndex, 1)[0];
      closeStoreModal();
      picker.hand.push(taken);
      addLog(`🏪 ${picker.name} pega ${taken.label}.`);
      state.storePick++;
      processStore();
    };
    storeListEl.appendChild(pickCardButton);
  });
  document.getElementById("store-modal").classList.add("is-open");
}

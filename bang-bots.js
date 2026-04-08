// ═══ BOT AI ═══
// ═══ BOT AI ═══
function botDoTurn() {
  const botPlayer = getCurrentPlayer();
  if (!botPlayer.isBot) return;
  showBotBar();
  doDraw();
  setTimeout(botPlay, GAME_LIMITS.botStartDelayMs);
}
function showBotBar() {
  const botPlayer = getCurrentPlayer();
  const botBarEl = document.getElementById("bot-bar");
  botBarEl.textContent = `🤖 ${botPlayer.name} está jogando... (${botPlayer.char.name} · ${diffLabel(botPlayer.difficulty)})`;
  botBarEl.classList.add("is-visible");
}
function hideBotBar() {
  document.getElementById("bot-bar").classList.remove("is-visible");
}
function diffLabel(d) {
  return DIFFICULTY_LABELS[d] || "";
}

function botPlay() {
  const botPlayer = getCurrentPlayer();
  if (!botPlayer.isBot || LocalState.phase !== PHASES.play || LocalState.gameOver) return;
  const playStrategy =
    BOT_TURN_STRATEGY[botPlayer.difficulty] || BOT_TURN_STRATEGY.hard;
  const acted = playStrategy(botPlayer);
  if (acted && !LocalState.gameOver) setTimeout(botPlay, GAME_LIMITS.botLoopDelayMs);
  else
    setTimeout(() => {
      LocalState.phase = PHASES.discard;
      botDiscard();
    }, GAME_LIMITS.botEndDelayMs);
}

function botEasy(botPlayer) {
  const playable = botPlayer.hand
    .map((card, handIndex) => ({ card, handIndex }))
    .filter(({ card }) => !botSkip(card, botPlayer));
  if (!playable.length) return false;
  const { card, handIndex } = playable[Math.floor(Math.random() * playable.length)];
  return botUse(botPlayer, handIndex, card);
}

function getAliveSheriff() {
  return LocalState.players.find(
    (player) => player.role === "sheriff" && player.alive,
  );
}
function tryPlayCardByType(player, cardType) {
  const cardIndex = findHandCardIndexByType(player, cardType);
  if (cardIndex < 0) return false;
  return execAndRemove(player, cardIndex, player.hand[cardIndex], null);
}
function tryPlayBestWeapon(player) {
  const weaponIndex = bestWeaponIdx(player);
  if (weaponIndex < 0) return false;
  return execAndRemove(player, weaponIndex, player.hand[weaponIndex], null);
}
function tryPlayTargetedCard(player, cardType, targetStrategy) {
  const cardIndex = findHandCardIndexByType(player, cardType);
  if (cardIndex < 0) return false;
  const target = botTgt(player, targetStrategy);
  if (!target) return false;
  return execAndRemove(player, cardIndex, player.hand[cardIndex], target);
}
function tryPlayCardAtSpecificTarget(player, cardType, target) {
  const cardIndex = findHandCardIndexByType(player, cardType);
  if (cardIndex < 0 || !target) return false;
  return execAndRemove(player, cardIndex, player.hand[cardIndex], target);
}
const BOT_RULES = {
  medium: [
    (player) =>
      player.life <= BOT_RULE_THRESHOLDS.mediumBeerLifeThreshold &&
      alive().length > GAME_LIMITS.defaultDrawCount
        ? tryPlayCardByType(player, "beer")
        : false,
    (player) => tryPlayBestWeapon(player),
    (player) =>
      !player.equipment.barrel && player.char.ability !== "builtinBarrel"
        ? tryPlayCardByType(player, "barrel")
        : false,
    (player) => {
      const sheriff = getAliveSheriff();
      const canJail =
        sheriff &&
        (player.role === "outlaw" || player.role === "renegade") &&
        !sheriff.jailed;
      return canJail
        ? tryPlayCardAtSpecificTarget(player, "jail", sheriff)
        : false;
    },
    (player) =>
      canUseBang(player)
        ? tryPlayTargetedCard(player, "bang", "hostile")
        : false,
    (player) => tryPlayCardByType(player, "indians"),
    (player) => tryPlayTargetedCard(player, "duel", "hostile"),
    (player) => tryPlayTargetedCard(player, "panic", "rich1"),
  ],
  hard: [
    (player) =>
      player.life === BOT_RULE_THRESHOLDS.hardBeerLifeThreshold &&
      alive().length > GAME_LIMITS.defaultDrawCount
        ? tryPlayCardByType(player, "beer")
        : false,
    (player) => tryPlayBestWeapon(player),
    (player) =>
      !player.equipment.barrel && player.char.ability !== "builtinBarrel"
        ? tryPlayCardByType(player, "barrel")
        : false,
    (player) =>
      !player.equipment.mustang && player.char.ability !== "builtinMustang"
        ? tryPlayCardByType(player, "mustang")
        : false,
    (player) =>
      !player.equipment.scope ? tryPlayCardByType(player, "scope") : false,
    (player) => {
      const sheriff = getAliveSheriff();
      const canJail = sheriff && player.role === "outlaw" && !sheriff.jailed;
      return canJail
        ? tryPlayCardAtSpecificTarget(player, "jail", sheriff)
        : false;
    },
    (player) =>
      canUseBang(player)
        ? tryPlayTargetedCard(player, "bang", "hostile")
        : false,
    (player) => tryPlayTargetedCard(player, "catbalou", "strongest"),
    (player) => tryPlayTargetedCard(player, "duel", "hostile"),
    (player) => tryPlayCardByType(player, "indians"),
    (player) => tryPlayTargetedCard(player, "panic", "rich1"),
  ],
};
function executeBotRules(player, rules) {
  const firstAppliedRule = rules.find((rule) => rule(player));
  return Boolean(firstAppliedRule);
}
function botMedium(botPlayer) {
  return executeBotRules(botPlayer, BOT_RULES.medium);
}

function botHard(botPlayer) {
  return executeBotRules(botPlayer, BOT_RULES.hard);
}

function bestWeaponIdx(player) {
  let bestWeapon = { reach: WEAPONS[player.equipment.weaponKey]?.reach || 1, handIndex: -1 };
  player.hand.forEach((card, handIndex) => {
    if (!WEAPON_CARD_TYPES.includes(card.type)) return;
    const weaponReach =
      WEAPONS[card.weaponKey || card.type]?.reach || GAME_LIMITS.defaultWeaponReach;
    if (weaponReach > bestWeapon.reach) bestWeapon = { reach: weaponReach, handIndex };
  });
  return bestWeapon.handIndex;
}
function execAndRemove(player, handIndex, card, target) {
  const cardResolved = execCard(player, handIndex, card, target);
  if (cardResolved) {
    removeCardFromHandAt(player, handIndex);
    discardCardToPile(card);
    suzyCheck(player);
    renderGame();
  }
  return Boolean(cardResolved);
}
function botUse(botPlayer, handIndex, card) {
  if (CARD_TYPES_REQUIRING_TARGET.includes(card.type)) {
    const target = botTgt(botPlayer, card.type === "panic" ? "rich1" : "hostile");
    if (!target) return false;
    return execAndRemove(botPlayer, handIndex, card, target) !== false;
  }
  return execAndRemove(botPlayer, handIndex, card, null) !== false;
}
function botSkip(card, player) {
  return shouldSkipCardForPlayer(card, player);
}
function botTgt(botPlayer, strategy) {
  const others = alive().filter((candidate) => candidate !== botPlayer);
  if (!others.length) return null;
  function hostile(target) {
    const roleStrategy = ROLE_HOSTILITY_STRATEGY[botPlayer.role];
    if (roleStrategy) return roleStrategy(target);
    if (botPlayer.role === "renegade")
      return others.length > 2 ? target.role === "outlaw" : true;
    return true;
  }
  const hostilePool = others.filter(hostile);
  const candidatePool = hostilePool.length ? hostilePool : others;
  if (strategy === "hostile" || strategy === "strongest") {
    const inShootingRange = candidatePool.filter((candidate) => canShoot(botPlayer, candidate));
    const lifePickPool = inShootingRange.length ? inShootingRange : candidatePool;
    return lifePickPool.reduce(
      (lowestLife, candidate) => (candidate.life < lowestLife.life ? candidate : lowestLife),
      lifePickPool[0],
    );
  }
  if (strategy === "rich1") {
    const atDistanceOne = others.filter((candidate) => dist(botPlayer, candidate) <= 1);
    if (!atDistanceOne.length) return null;
    return atDistanceOne.reduce(
      (richest, candidate) =>
        candidate.hand.length > richest.hand.length ? candidate : richest,
      atDistanceOne[0],
    );
  }
  return candidatePool[Math.floor(Math.random() * candidatePool.length)];
}
function botDiscard() {
  const botPlayer = getCurrentPlayer();
  if (!botPlayer.alive) {
    advTurn();
    return;
  }
  while (botPlayer.hand.length > botPlayer.life) {
    const missedIdx = findHandCardIndexByType(botPlayer, "missed");
    discardCardToPile(removeCardFromHandAt(botPlayer, missedIdx >= 0 ? missedIdx : botPlayer.hand.length - 1));
  }
  addLog(`🤖 ${botPlayer.name} encerra o turno.`, "bot");
  hideBotBar();
  setTimeout(advTurn, GAME_LIMITS.botEndDelayMs);
}

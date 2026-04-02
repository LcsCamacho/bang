// ═══ BOT AI ═══
// ═══ BOT AI ═══
function botDoTurn() {
  const p = currentP();
  if (!p.isBot) return;
  showBotBar();
  doDraw();
  setTimeout(botPlay, GAME_LIMITS.botStartDelayMs);
}
function showBotBar() {
  const p = currentP();
  const b = document.getElementById("bot-bar");
  b.textContent = `🤖 ${p.name} está jogando... (${p.char.name} · ${diffLabel(p.difficulty)})`;
  b.classList.add("show");
}
function hideBotBar() {
  document.getElementById("bot-bar").classList.remove("show");
}
function diffLabel(d) {
  return DIFFICULTY_LABELS[d] || "";
}

function botPlay() {
  const p = currentP();
  if (!p.isBot || LocalState.phase !== PHASES.play || LocalState.gameOver) return;
  const playStrategy =
    BOT_TURN_STRATEGY[p.difficulty] || BOT_TURN_STRATEGY.hard;
  const acted = playStrategy(p);
  if (acted && !LocalState.gameOver) setTimeout(botPlay, GAME_LIMITS.botLoopDelayMs);
  else
    setTimeout(() => {
      LocalState.phase = PHASES.discard;
      botDiscard();
    }, GAME_LIMITS.botEndDelayMs);
}

function botEasy(p) {
  const play = p.hand
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !botSkip(c, p));
  if (!play.length) return false;
  const { c, i } = play[Math.floor(Math.random() * play.length)];
  return botUse(p, i, c);
}

function getAliveSheriff() {
  return LocalState.players.find(
    (player) => player.role === "sheriff" && player.alive,
  );
}
function tryPlayCardByType(player, cardType) {
  const cardIndex = findC(player, cardType);
  if (cardIndex < 0) return false;
  return execAndRemove(player, cardIndex, player.hand[cardIndex], null);
}
function tryPlayBestWeapon(player) {
  const weaponIndex = bestWeaponIdx(player);
  if (weaponIndex < 0) return false;
  return execAndRemove(player, weaponIndex, player.hand[weaponIndex], null);
}
function tryPlayTargetedCard(player, cardType, targetStrategy) {
  const cardIndex = findC(player, cardType);
  if (cardIndex < 0) return false;
  const target = botTgt(player, targetStrategy);
  if (!target) return false;
  return execAndRemove(player, cardIndex, player.hand[cardIndex], target);
}
function tryPlayCardAtSpecificTarget(player, cardType, target) {
  const cardIndex = findC(player, cardType);
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
function botMedium(p) {
  return executeBotRules(p, BOT_RULES.medium);
}

function botHard(p) {
  return executeBotRules(p, BOT_RULES.hard);
}

function bestWeaponIdx(p) {
  let best = { reach: WEAPONS[p.equipment.weaponKey]?.reach || 1, i: -1 };
  p.hand.forEach((c, i) => {
    if (!WEAPON_CARD_TYPES.includes(c.type)) return;
    const r =
      WEAPONS[c.weaponKey || c.type]?.reach || GAME_LIMITS.defaultWeaponReach;
    if (r > best.reach) best = { reach: r, i };
  });
  return best.i;
}
function execAndRemove(p, i, c, tgt) {
  const ok = execCard(p, i, c, tgt);
  if (ok) {
    removeC(p, i);
    disc(c);
    suzyCheck(p);
    renderGame();
  }
  return ok;
}
function botUse(p, i, c) {
  if (CARD_TYPES_REQUIRING_TARGET.includes(c.type)) {
    const tgt = botTgt(p, c.type === "panic" ? "rich1" : "hostile");
    if (!tgt) return false;
    return execAndRemove(p, i, c, tgt) !== false;
  }
  return execAndRemove(p, i, c, null) !== false;
}
function botSkip(c, p) {
  return shouldSkipCardForPlayer(c, p);
}
function botTgt(p, strat) {
  const al = alive().filter((t) => t !== p);
  if (!al.length) return null;
  function hostile(target) {
    const roleStrategy = ROLE_HOSTILITY_STRATEGY[p.role];
    if (roleStrategy) return roleStrategy(target);
    if (p.role === "renegade")
      return al.length > 2 ? target.role === "outlaw" : true;
    return true;
  }
  const hos = al.filter(hostile);
  const pool = hos.length ? hos : al;
  if (strat === "hostile" || strat === "strongest") {
    const inR = pool.filter((t) => canShoot(p, t));
    const cands = inR.length ? inR : pool;
    return cands.reduce((b, t) => (t.life < b.life ? t : b), cands[0]);
  }
  if (strat === "rich1") {
    const d1 = al.filter((t) => dist(p, t) <= 1);
    if (!d1.length) return null;
    return d1.reduce((b, t) => (t.hand.length > b.hand.length ? t : b), d1[0]);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
function botDiscard() {
  const p = currentP();
  if (!p.alive) {
    advTurn();
    return;
  }
  while (p.hand.length > p.life) {
    const mi = findC(p, "missed");
    disc(removeC(p, mi >= 0 ? mi : p.hand.length - 1));
  }
  addLog(`🤖 ${p.name} encerra o turno.`, "bot");
  hideBotBar();
  setTimeout(advTurn, GAME_LIMITS.botEndDelayMs);
}

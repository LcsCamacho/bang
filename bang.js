// ═══ NAV ═══
function goTo(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

// ═══ DATA ═══
const SUITS = ["♥", "♦", "♣", "♠"],
  VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const WEAPONS = {
  colt45: { label: "Colt .45", reach: 1, icon: "🔫" },
  volcanic: { label: "Volcanic", reach: 1, icon: "🔥" },
  schofield: { label: "Schofield", reach: 2, icon: "🔫" },
  remington: { label: "Remington", reach: 3, icon: "🏹" },
  carabine: { label: "Carabine", reach: 4, icon: "🪖" },
  winchester: { label: "Winchester", reach: 5, icon: "🎯" },
};
const CHARS = [
  {
    name: "Willy the Kid",
    ability: "unlimitedBang",
    desc: "Pode jogar BANG!s ilimitados.",
    life: 4,
  },
  {
    name: "Slab the Killer",
    ability: "doubleMissed",
    desc: "Alvos precisam de 2 Errei!.",
    life: 4,
  },
  {
    name: "Jesse Jones",
    ability: "stealDraw",
    desc: "Pode comprar da mão de alguém.",
    life: 4,
  },
  {
    name: "Calamity Janet",
    ability: "bangMissed",
    desc: "Usa BANG! como Errei! e vice-versa.",
    life: 4,
  },
  {
    name: "El Gringo",
    ability: "retaliation",
    desc: "Rouba carta do atacante ao ser atingido.",
    life: 3,
  },
  {
    name: "Jourdonnais",
    ability: "builtinBarrel",
    desc: "Barril permanente embutido.",
    life: 4,
  },
  {
    name: "Kit Carlson",
    ability: "peekDraw",
    desc: "Vê 3 cartas do topo e pega 2.",
    life: 4,
  },
  {
    name: "Lucky Duke",
    ability: "twoDraws",
    desc: "Nas checagens vira 2 e escolhe.",
    life: 4,
  },
  {
    name: "Paul Regret",
    ability: "builtinMustang",
    desc: "Inimigos te veem a +1 de distância.",
    life: 3,
  },
  {
    name: "Suzy Lafayette",
    ability: "drawOnEmpty",
    desc: "Ao ficar sem cartas na mão, compra 1.",
    life: 4,
  },
  {
    name: "Vulture Sam",
    ability: "vultureSam",
    desc: "Pega cartas de quem for eliminado.",
    life: 4,
  },
  {
    name: "Black Jack",
    ability: "blackJack",
    desc: "2ª carta comprada: ♥/♦ = +1 carta.",
    life: 4,
  },
  {
    name: "Sid Ketchum",
    ability: "selfHeal",
    desc: "Descarta 2 cartas → ganha 1 vida.",
    life: 4,
  },
  {
    name: "Pedro Ramirez",
    ability: "discardDraw",
    desc: "Pode comprar a 1ª carta do descarte.",
    life: 4,
  },
];
const BOT_NAMES = [
  "Doc Holliday",
  "Jesse James",
  "Wyatt Earp",
  "Belle Starr",
  "Calamity Jane",
  "Pat Garrett",
  "Black Bart",
  "Butch Cassidy",
  "Pearl Hart",
  "Texas Jack",
  "Annie Oakley",
  "Big Spencer",
];
const CARD_TYPES_REQUIRING_TARGET = [
  "bang",
  "duel",
  "panic",
  "catbalou",
  "jail",
];
const WEAPON_CARD_TYPES = [
  "volcanic",
  "schofield",
  "remington",
  "carabine",
  "winchester",
];
const STORE_CARD_PRIORITY = {
  bang: 5,
  missed: 4,
  beer: 3,
  duel: 4,
  panic: 3,
  catbalou: 3,
  indians: 3,
  barrel: 2,
  mustang: 2,
  scope: 2,
  volcanic: 4,
  schofield: 3,
  remington: 3,
  carabine: 3,
  winchester: 4,
};
const ROLE_SETUPS = {
  4: ["sheriff", "outlaw", "outlaw", "renegade"],
  5: ["sheriff", "outlaw", "outlaw", "renegade", "deputy"],
  6: ["sheriff", "outlaw", "outlaw", "outlaw", "renegade", "deputy"],
  default: [
    "sheriff",
    "outlaw",
    "outlaw",
    "outlaw",
    "renegade",
    "deputy",
    "deputy",
  ],
};
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
const BOT_TURN_STRATEGY = {
  easy: (player) => botEasy(player),
  medium: (player) => botMedium(player),
  hard: (player) => botHard(player),
};
const ROLE_HOSTILITY_STRATEGY = {
  sheriff: (target) => target.role === "outlaw" || target.role === "renegade",
  deputy: (target) => target.role === "outlaw" || target.role === "renegade",
  outlaw: (target) => target.role === "sheriff" || target.role === "deputy",
};
const GAME_LIMITS = {
  maxLifeCap: 5,
  invalidDistance: 999,
  minimumDistance: 1,
  defaultWeaponReach: 1,
  luckyDukeCheckCount: 2,
  kitCarlsonDrawCount: 3,
  kitCarlsonKeepCount: 2,
  dynamiteDamage: 3,
  blackJackBonusDrawCount: 1,
  defaultDrawCount: 2,
  outlawKillRewardCards: 3,
  duelRoundLimit: 30,
  botStartDelayMs: 500,
  botTurnDelayMs: 600,
  botLoopDelayMs: 700,
  botEndDelayMs: 400,
  storeBotPickDelayMs: 280,
  toastDurationMs: 2500,
  logMaxEntries: 80,
  visibleLogEntries: 35,
};
const CARD_SUITS = {
  hearts: "♥",
  diamonds: "♦",
  spades: "♠",
};
const DYNAMITE_EXPLOSION_VALUES = ["2", "3", "4", "5", "6", "7", "8", "9"];
const DIFFICULTY_LABELS = {
  easy: "🟢 Fácil",
  medium: "🟡 Médio",
  hard: "🔴 Difícil",
};
const MODAL_TITLES = {
  bang: "🔫 Escolher Alvo",
  duel: "⚔️ Duelo",
  panic: "😱 Pânico!",
  catbalou: "🐱 Cat Balou",
  jail: "🔒 Prender",
  indians: "🏹 Índios",
};
const ROLE_LABELS = {
  sheriff: "Xerife",
  outlaw: "Fora-da-Lei",
  renegade: "Renegado",
  deputy: "Deputado",
};
const ROLE_ICONS = {
  sheriff: "⭐",
  outlaw: "💀",
  renegade: "🤠",
  deputy: "🔵",
};
const PHASES = {
  start: "start",
  draw: "draw",
  play: "play",
  discard: "discard",
};
const BOT_RULE_THRESHOLDS = {
  mediumBeerLifeThreshold: 2,
  hardBeerLifeThreshold: 1,
};
const PLAYER_ABILITY_RULES = {
  sidKetchumDiscardCost: 2,
};

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

// ═══ MODAL ═══
let _mcb = null;
function openModal(type, targets, cb) {
  _mcb = cb;
  document.getElementById("m-title").textContent = MODAL_TITLES[type] || "Alvo";
  document.getElementById("m-desc").textContent =
    type === "bang" ? `Alcance da arma: ${reach(currentP())}.` : "";
  const list = document.getElementById("m-list");
  list.innerHTML = "";
  targets.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "tbtn";
    const sheriffTag =
      t.role === "sheriff"
        ? ` <span style="color:var(--sheriff-gold);font-weight:700">${rLabel("sheriff")}</span>`
        : "";
    btn.innerHTML = `${rIcon(t.role)} ${t.name}${sheriffTag} <small style="opacity:.6">(${t.char.name})</small> <span class="td">❤️${t.life} dist.${dist(currentP(), t)}</span>`;
    btn.onclick = () => {
      closeModal();
      cb(t);
    };
    list.appendChild(btn);
  });
  document.getElementById("tgt-modal").classList.add("open");
}
function closeModal() {
  document.getElementById("tgt-modal").classList.remove("open");
  _mcb = null;
}

// ═══ HOTSEAT ═══
function showHotseat() {
  const p = currentP();
  document.getElementById("hc-name").textContent = `Vez de ${p.name}`;
  document.getElementById("hc-hint").textContent =
    p.role === "sheriff"
      ? "⭐ Você é o XERIFE (papel público)."
      : `Papel secreto: ${rLabel(p.role)} — não mostre!`;
  document.getElementById("hcover").classList.add("open");
}
function revealTurn() {
  document.getElementById("hcover").classList.remove("open");
  beginTurn();
}

// ═══ RENDER ═══
function renderGame() {
  if (LocalState.gameOver && LocalState.mode !== "online") return;
  renderPlayers();
  renderHand();
  renderSidebar();
  document.getElementById("draw-n").textContent = LocalState.drawPile.length;
  document.getElementById("disc-n").textContent = LocalState.discardPile.length;
}
function renderPlayers() {
  const grid = document.getElementById("pgrid");
  grid.innerHTML = "";
  const ring = document.getElementById("opponents-ring");
  if (ring) {
    ring.innerHTML = "";
    if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
      const myId = BangNetwork.myPlayerId;
      LocalState.players.forEach((p, i) => {
        if (p.id === myId) return;
        const div = document.createElement("div");
        div.className = getPlayerCardClassName(p, i === LocalState.current) + " pcard-opp";
        const bullets = renderPlayerLifeBullets(p);
        const eq = renderPlayerEquipment(p);
        const roleDisp = renderPlayerRoleIndicator(p);
        div.innerHTML = `<div class="ph"><div class="pname">${p.name}</div><div class="prole">${roleDisp}</div></div><div class="pchar">${p.char.name}</div><div class="lbar">${bullets}</div><div class="erow">${eq}</div><div class="hcount">${p.alive ? `🂠 ${p.hand.length}` : "💀"}</div>${p.jailed ? '<div class="jail-banner">PRESO</div>' : ""}${p.hasDynamite ? '<div class="dyn-banner">💣</div>' : ""}`;
        ring.appendChild(div);
      });
    }
  }
  LocalState.players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = getPlayerCardClassName(p, i === LocalState.current);
    const bullets = renderPlayerLifeBullets(p);
    const eq = renderPlayerEquipment(p);
    const roleDisp = renderPlayerRoleIndicator(p);
    const botTag = p.isBot ? `<span class="bot-tag">BOT</span>` : "";
    const thinking =
      p.isBot &&
      i === LocalState.current &&
      (LocalState.phase === PHASES.draw || LocalState.phase === PHASES.play);
    div.innerHTML = `<div class="ph"><div class="pname">${p.name}${botTag}</div><div class="prole">${roleDisp}</div></div><div class="pchar">${p.char.name}</div><div class="lbar">${bullets}</div><div class="erow">${eq}</div><div class="hcount">${p.alive ? `🂠 ${p.hand.length}` : "💀"}</div>${p.jailed ? '<div class="jail-banner">PRESO</div>' : ""}${p.hasDynamite ? '<div class="dyn-banner">💣</div>' : ""}${thinking ? '<div class="bot-thinking">🤔 pensando...</div>' : ""}`;
    grid.appendChild(div);
  });
}
function getPlayerCardClassName(player, isCurrentTurn) {
  let className = "pcard";
  if (isCurrentTurn) className += " active";
  if (player.role === "sheriff") className += " is-sheriff";
  if (!player.alive) className += " dead";
  if (player.isBot) className += " bot-c";
  else className += " is-human";
  return className;
}
function renderPlayerLifeBullets(player) {
  let bulletsHtml = "";
  for (let lifeIndex = 0; lifeIndex < player.maxLife; lifeIndex++)
    bulletsHtml += `<span class="b ${lifeIndex >= player.life ? "e" : ""}"></span>`;
  return bulletsHtml;
}
function renderPlayerEquipment(player) {
  let equipmentHtml = "";
  if (player.equipment.weaponKey !== "colt45")
    equipmentHtml += `<span class="ebadge">${WEAPONS[player.equipment.weaponKey].icon}${WEAPONS[player.equipment.weaponKey].label}</span>`;
  if (player.equipment.barrel || player.char.ability === "builtinBarrel")
    equipmentHtml += `<span class="ebadge">🛢️Barril</span>`;
  if (player.equipment.mustang || player.char.ability === "builtinMustang")
    equipmentHtml += `<span class="ebadge">🐎Mustang</span>`;
  if (player.equipment.scope)
    equipmentHtml += `<span class="ebadge">🔭Luneta</span>`;
  return equipmentHtml;
}
function renderPlayerRoleIndicator(player) {
  const roleDisplayStrategies = [
    { when: () => player.role === "sheriff", render: () => "⭐" },
    { when: () => !player.alive, render: () => rIcon(player.role) },
    {
      when: () =>
        LocalState.mode === "online" &&
        typeof BangNetwork !== "undefined" &&
        player.id === BangNetwork.myPlayerId &&
        player.role !== "hidden",
      render: () => `<span style="font-size:.68rem">${rIcon(player.role)}</span>`,
    },
    {
      when: () => LocalState.mode === "offline" && player.isBot,
      render: () =>
        `<span style="font-size:.68rem">${rIcon(player.role)}</span>`,
    },
  ];
  const matchedStrategy = roleDisplayStrategies.find((strategy) =>
    strategy.when(),
  );
  if (matchedStrategy) return matchedStrategy.render();
  return "";
}
function renderHand() {
  const p = currentP();
  const myId =
    LocalState.mode === "online" && typeof BangNetwork !== "undefined"
      ? BangNetwork.myPlayerId
      : null;
  const hideHand =
    LocalState.mode === "online" && myId != null && p.id !== myId;
  document.getElementById("h-title").textContent = p.isBot
    ? `🤖 ${p.name}`
    : hideHand
      ? `🂠 ${p.name} (oponente)`
      : `Mão de ${p.name}`;
  document.getElementById("h-meta").textContent =
    `${p.char.name} · ❤️${p.life}/${p.maxLife} · ${WEAPONS[p.equipment.weaponKey].icon}${WEAPONS[p.equipment.weaponKey].label}`;
  const ce = document.getElementById("h-cards"),
    be = document.getElementById("h-btns");
  ce.innerHTML = "";
  be.innerHTML = "";
  if (p.isBot || hideHand) {
    for (let i = 0; i < p.hand.length; i++) {
      const el = document.createElement("div");
      el.className = "card disabled";
      el.style.cssText =
        "background:linear-gradient(135deg,#5c3a1e,#3a1f08);border-color:var(--sand);";
      el.innerHTML =
        '<span style="font-size:1.8rem;color:var(--sand)">🂠</span>';
      ce.appendChild(el);
    }
    return;
  }
  if (LocalState.phase === PHASES.draw) {
    const b = document.createElement("button");
    b.className = "btn btn-draw";
    b.textContent = "🃏 Comprar Cartas";
    b.onclick = doDraw;
    be.appendChild(b);
    p.hand.forEach((c, i) => ce.appendChild(mkCard(c, i, true)));
    return;
  }
  if (LocalState.phase === PHASES.play) {
    p.hand.forEach((c, i) => ce.appendChild(mkCard(c, i, cardDisabled(c, p))));
    const eb = document.createElement("button");
    eb.className = "btn btn-phase";
    eb.textContent = "✓ Encerrar Turno";
    eb.onclick = endPlay;
    be.appendChild(eb);
    if (
      p.char.ability === "selfHeal" &&
      p.hand.length >= PLAYER_ABILITY_RULES.sidKetchumDiscardCost &&
      p.life < p.maxLife
    ) {
      const sb = document.createElement("button");
      sb.className = "btn btn-phase";
      sb.textContent = "💊 Descartar 2 → +1 vida";
      sb.onclick = () => {
        if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
          BangNetwork.sendGameAction({ type: "sidKetchum" });
          return;
        }
        for (
          let discardIndex = 0;
          discardIndex < PLAYER_ABILITY_RULES.sidKetchumDiscardCost;
          discardIndex++
        ) {
          disc(p.hand.pop());
        }
        heal(p);
        addLog(`${p.name} (Sid Ketchum) usa habilidade!`);
        renderGame();
      };
      be.appendChild(sb);
    }
    return;
  }
  if (LocalState.phase === PHASES.discard) {
    const need = p.life;
    document.getElementById("h-meta").textContent +=
      ` · Descarte até ${need} carta(s)`;
    p.hand.forEach((c, i) => {
      const el = mkCard(c, i, false);
      el.onclick = () => doDiscard(i);
      ce.appendChild(el);
    });
    if (p.hand.length <= need) {
      const eb = document.createElement("button");
      eb.className = "btn btn-end";
      eb.textContent = "→ Próximo Turno";
      eb.onclick = endDiscard;
      be.appendChild(eb);
    } else {
      const h = document.createElement("span");
      h.style.cssText =
        "font-size:.71rem;color:rgba(255,200,100,.8);align-self:center;";
      h.textContent = `Clique para descartar (${p.hand.length - need} demais)`;
      be.appendChild(h);
    }
  }
}
function cardDisabled(c, p) {
  return shouldSkipCardForPlayer(c, p);
}
function mkCard(c, idx, disabled) {
  const el = document.createElement("div");
  if (c.type === "back") {
    el.className = "card disabled";
    el.setAttribute("data-type", "back");
    el.style.cssText =
      "background:linear-gradient(135deg,#5c3a1e,#3a1f08);border-color:var(--sand);";
    el.innerHTML =
      '<span style="font-size:1.8rem;color:var(--sand)">🂠</span>';
    return el;
  }
  el.className = "card" + (disabled ? " disabled" : "");
  el.setAttribute("data-type", c.type);
  el.title = CTIPS[c.type] || "";
  el.innerHTML = `<span class="cs" style="color:${c.suit === "♥" || c.suit === "♦" ? "#c00" : "#111"}">${c.suit || ""}</span><span class="ci">${c.icon}</span><span class="cn">${c.label}</span><span class="cv">${c.value || ""}</span>`;
  if (!disabled) el.onclick = () => playCard(idx);
  return el;
}
const CTIPS = {
  bang: "Atira em jogador dentro do alcance.",
  missed: "Cancela BANG! (fora do turno).",
  beer: "Recupera 1 vida.",
  duel: "Duelo — troca BANG!s.",
  panic: "Rouba carta a dist. 1.",
  catbalou: "Descarta carta/equip. de qualquer jogador.",
  jail: "Prende jogador (pula turno). Não vale no Xerife.",
  dynamite: "Coloca dinamite na mesa.",
  generalstore: "Todos escolhem 1 carta.",
  indians: "Todos descartam BANG! ou perdem 1 vida.",
  saloon: "Todos +1 vida.",
  barrel: "Draw! ao ser alvejado — ♥ salva.",
  mustang: "Inimigos te veem a +1 dist.",
  scope: "Você vê inimigos a -1 dist.",
  volcanic: "Alcance 1, BANG!s ilimitados.",
  schofield: "Alcance 2.",
  remington: "Alcance 3.",
  carabine: "Alcance 4.",
  winchester: "Alcance 5.",
};
function renderSidebar() {
  const p = currentP();
  document.getElementById("t-name").textContent =
    `${p.isBot ? "🤖 " : "👤 "}${p.name}`;
  document.getElementById("t-char").textContent =
    `${p.char.name} · ${p.char.desc}`;
  [PHASES.draw, PHASES.play, PHASES.discard].forEach(
    (ph) =>
      (document.getElementById(`ph-${ph}`).className =
        "pdot" + (LocalState.phase === ph ? " on" : "")),
  );
}

// ═══ LOG / HELPERS ═══
function addLog(msg, type = "") {
  LocalState.log.unshift({ msg, type });
  if (LocalState.log.length > GAME_LIMITS.logMaxEntries) LocalState.log.pop();
  const el = document.getElementById("glog");
  if (!el) return;
  el.innerHTML = LocalState.log
    .slice(0, GAME_LIMITS.visibleLogEntries)
    .map((l) => `<div class="ll ${l.type}">${l.msg}</div>`)
    .join("");
}
function rLabel(r) {
  return ROLE_LABELS[r] || r;
}
function rIcon(r) {
  return ROLE_ICONS[r] || "?";
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), GAME_LIMITS.toastDurationMs);
}

// ═══ ONLINE LOBBY ═══
function renderLobby(msg) {
  const lobby = document.getElementById("on-lobby");
  if (!lobby) return;
  lobby.style.display = "block";
  const rid = document.getElementById("on-rid");
  if (rid) rid.textContent = msg.roomId;
  const list = document.getElementById("on-plist");
  if (list) {
    list.innerHTML = "";
    (msg.players || []).forEach((pl) => {
      const li = document.createElement("li");
      li.textContent = `${pl.displayName}${pl.isHost ? " ★ anfitrião" : ""}${pl.isYou ? " (você)" : ""}`;
      list.appendChild(li);
    });
  }
  const startBtn = document.getElementById("on-start");
  if (startBtn) startBtn.style.display = msg.youAreHost ? "block" : "none";
}

function onlineCreateRoom() {
  const name = document.getElementById("on-name")?.value.trim() || "Jogador";
  if (typeof BangNetwork === "undefined") {
    toast("Módulo de rede não carregado.");
    return;
  }
  BangNetwork.createRoom(name);
}

function onlineJoinRoom() {
  const code = document.getElementById("on-room")?.value.trim();
  const name = document.getElementById("on-name")?.value.trim() || "Jogador";
  if (!code) {
    toast("Informe o código da sala.");
    return;
  }
  if (typeof BangNetwork !== "undefined") BangNetwork.joinRoom(code, name);
}

function onlineStart() {
  if (typeof BangNetwork !== "undefined") BangNetwork.startOnlineGame();
}

function onlineBack() {
  if (typeof BangNetwork !== "undefined") BangNetwork.leaveRoom();
  goTo("menu-screen");
}

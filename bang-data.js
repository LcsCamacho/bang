// ═══ DATA ═══ (constantes e tabelas puras)
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

/**
 * Regras e metadados do BANG! — Modern Frontier.
 * Alinhado conceitualmente a server/src/game/constants.ts (ROLE_SETUPS, GAME_LIMITS).
 * Uma única fonte para textos de UI das telas de regras e para validação de formulários.
 */
(function (global) {
  "use strict";

  var DEFAULT_DRAW_PER_TURN = 2;
  var PLAYER_COUNTS = [4, 5, 6, 7];

  /** @type {Record<number, { sheriff: number; deputy: number; outlaw: number; renegade: number }>} */
  var ROLE_COUNTS_BY_PLAYERS = {
    4: { sheriff: 1, deputy: 0, outlaw: 2, renegade: 1 },
    5: { sheriff: 1, deputy: 1, outlaw: 2, renegade: 1 },
    6: { sheriff: 1, deputy: 1, outlaw: 3, renegade: 1 },
    7: { sheriff: 1, deputy: 2, outlaw: 3, renegade: 1 },
  };

  var TURN_PHASES = [
    {
      order: 1,
      title: "Compra de cartas",
      body:
        "Compre " +
        DEFAULT_DRAW_PER_TURN +
        " cartas do baralho. Se o baralho acabar, embaralhe o descarte (exceto a carta do topo) e continue — como no motor do jogo.",
    },
    {
      order: 2,
      title: "Jogar cartas",
      body:
        "Jogue cartas de ação e equipamentos respeitando distância e habilidades do personagem. Regra clássica: apenas um BANG! por turno (salvo efeitos de personagem).",
    },
    {
      order: 3,
      title: "Descarte",
      body:
        "Descarte até o tamanho da mão ser igual à sua vida atual. Excesso de cartas deve ser descartado ao fim do turno.",
    },
  ];

  var ROLE_DESCRIPTIONS = [
    {
      id: "sheriff",
      label: "Xerife",
      icon: "shield",
      accent: "primary",
      goal: "Elimine todos os Foras-da-Lei e o Renegado. Sua função é revelada a todos.",
    },
    {
      id: "deputy",
      label: "Deputado (Vice)",
      icon: "verified_user",
      accent: "secondary",
      goal: "Proteja o Xerife e ajude a equipe da lei — mesmos inimigos que o Xerife.",
    },
    {
      id: "outlaw",
      label: "Fora-da-Lei",
      icon: "skull",
      accent: "error",
      goal: "Elimine o Xerife. Os demais papéis são obstáculos ou distrações.",
    },
    {
      id: "renegade",
      label: "Renegado",
      icon: "masks",
      accent: "tertiary",
      goal: "Sobreviva até restar apenas você e o Xerife; então vença o Xerife. Identidade secreta.",
    },
  ];

  /**
   * @param {number} playerCount
   * @returns {{ sheriff: number; deputy: number; outlaw: number; renegade: number } | null}
   */
  function getRoleDistribution(playerCount) {
    return ROLE_COUNTS_BY_PLAYERS[playerCount] || null;
  }

  /**
   * @param {number} playerCount
   * @returns {boolean}
   */
  function isValidPlayerCount(playerCount) {
    return PLAYER_COUNTS.indexOf(playerCount) !== -1;
  }

  var GameRules = {
    DEFAULT_DRAW_PER_TURN: DEFAULT_DRAW_PER_TURN,
    PLAYER_COUNTS: PLAYER_COUNTS,
    ROLE_COUNTS_BY_PLAYERS: ROLE_COUNTS_BY_PLAYERS,
    TURN_PHASES: TURN_PHASES,
    ROLE_DESCRIPTIONS: ROLE_DESCRIPTIONS,
    getRoleDistribution: getRoleDistribution,
    isValidPlayerCount: isValidPlayerCount,
  };

  global.GameRules = GameRules;
})(typeof window !== "undefined" ? window : globalThis);

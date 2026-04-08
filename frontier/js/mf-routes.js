/**
 * Mapa de navegação entre as telas Stitch implementadas em /frontier.
 * Mantém hrefs relativos à pasta frontier/ para funcionar com servidor estático simples.
 */
(function (global) {
  "use strict";

  var MF_ROUTES = {
    lobby: "lobby.html",
    lobbyAlt: "lobby-alt.html",
    practice: "pratica-bots.html",
    rulesSummary: "regras.html",
    store: "loja.html",
    waitingRoom: "sala-de-espera.html",
    lobbyV2: "lobby-v2.html",
    rulesOfficial: "regras-manual.html",
    createRoom: "criar-sala.html",
    gameplay: "duelo.html",
    /** Motor completo existente na raiz do repositório */
    legacyGame: "../bang.html",
  };

  global.MF_ROUTES = MF_ROUTES;
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Bootstrap das telas Modern Frontier: filtros, formulários, lista de salas mock,
 * cópia de código, integração com GameRules e MF_ROUTES.
 */
(function () {
  "use strict";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function navigateToRoute(routeKey) {
    var path = window.MF_ROUTES && window.MF_ROUTES[routeKey];
    if (path) window.location.href = path;
  }

  function showToast(message) {
    var el = $("#mf-toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("mf-toast--visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      el.classList.remove("mf-toast--visible");
    }, 2600);
  }

  var MOCK_ROOMS = [
    {
      id: "spur",
      name: "Saloon Espora Quebrada",
      visibility: "public",
      tagClass: "mf-tag--public",
      minBet: "50",
      current: 3,
      max: 7,
      icon: "playing_cards",
      accent: "primary",
      locked: false,
      initials: ["JD", "MK", "LS"],
    },
    {
      id: "deadhand",
      name: "Mão do Morto",
      visibility: "private",
      tagClass: "mf-tag--private",
      minBet: null,
      current: 5,
      max: 5,
      icon: "token",
      accent: "tertiary",
      locked: true,
      initials: ["A", "B", "C", "D", "E"],
    },
    {
      id: "creek",
      name: "Clássico do Riacho Poeirento",
      visibility: "public",
      tagClass: "mf-tag--public",
      minBet: "10",
      current: 1,
      max: 4,
      icon: "military_tech",
      accent: "primary",
      locked: false,
      initials: ["X"],
    },
    {
      id: "merchant",
      name: "A Recompensa do Mercador",
      visibility: "public",
      tagClass: "mf-tag--public",
      minBet: "250",
      current: 6,
      max: 8,
      icon: "storefront",
      accent: "primary",
      locked: false,
      initials: ["P", "Q", "R", "S"],
    },
  ];

  function renderRoomCard(room) {
    var betHtml = room.minBet
      ? '<span class="mf-room-card__meta">Aposta mín: ' + room.minBet + " ouro</span>"
      : '<span class="mf-room-card__meta">Mesa trancada</span>';
    var countClass = room.accent === "tertiary" ? "mf-room-card__count mf-room-card__count--tertiary" : "mf-room-card__count";
    var avatars = room.initials
      .slice(0, 6)
      .map(function (ch) {
        return '<span class="mf-avatar mf-avatar--xs" aria-hidden="true">' + escapeHtml(ch) + "</span>";
      })
      .join("");
    var btnLabel = room.locked ? "Lotada" : "Sentar";
    var btnClass = room.locked ? "mf-btn mf-btn--room mf-btn--disabled" : "mf-btn mf-btn--room";
    var btnIcon = room.locked ? "block" : "login";
    return (
      '<article class="mf-room-card" data-room-id="' +
      escapeHtml(room.id) +
      '">' +
      '<div class="mf-room-card__inner">' +
      '<div class="mf-room-card__main">' +
      '<div class="mf-room-card__icon mf-room-card__icon--' +
      escapeHtml(room.accent) +
      '">' +
      '<span class="material-symbols-outlined">' +
      escapeHtml(room.icon) +
      "</span></div>" +
      '<div class="mf-room-card__info">' +
      "<h3>" +
      escapeHtml(room.name) +
      "</h3>" +
      '<div class="mf-room-card__tags">' +
      '<span class="mf-tag ' +
      room.tagClass +
      '">' +
      (room.visibility === "public" ? "Pública" : "Privada") +
      "</span>" +
      betHtml +
      "</div></div></div>" +
      '<div class="mf-room-card__aside">' +
      '<div class="mf-room-card__players">' +
      '<span class="mf-label">Jogadores</span>' +
      '<div class="mf-room-card__players-row">' +
      '<span class="' +
      countClass +
      '">' +
      room.current +
      " / " +
      room.max +
      "</span>" +
      (room.locked ? '<span class="material-symbols-outlined mf-room-card__lock">lock</span>' : "") +
      '<div class="mf-avatar-row">' +
      avatars +
      "</div></div></div>" +
      '<button type="button" class="' +
      btnClass +
      '" data-action="join-room" data-locked="' +
      (room.locked ? "1" : "0") +
      '">' +
      '<span class="material-symbols-outlined mf-room-card__btn-icon">' +
      btnIcon +
      "</span>" +
      '<span class="mf-room-card__btn-text">' +
      btnLabel +
      "</span></button></div></div></article>"
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mountRoomList(container) {
    if (!container) return;
    container.innerHTML = MOCK_ROOMS.map(renderRoomCard).join("");
    container.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-action='join-room']");
      if (!btn) return;
      if (btn.getAttribute("data-locked") === "1") {
        showToast("Esta mesa está lotada ou privada.");
        return;
      }
      var card = btn.closest(".mf-room-card");
      var id = card && card.getAttribute("data-room-id");
      showToast("Entrando na sala " + (id || "") + "… (demo)");
      window.setTimeout(function () {
        navigateToRoute("waitingRoom");
      }, 400);
    });
  }

  function initFilterChips(root) {
    var chips = $all("[data-mf-filter]", root);
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) {
          c.classList.remove("mf-filter-chip--active");
          c.classList.remove("is-active");
        });
        chip.classList.add("mf-filter-chip--active");
        showToast("Filtro: " + (chip.textContent || "").trim());
      });
    });
  }

  function initPracticeForm(root) {
    var difficultyInputs = $all("input[name='mf-difficulty']", root);
    var range = $("#mf-practice-players", root);
    var out = $("#mf-practice-count-display", root);
    var rolesEl = $("#mf-practice-roles", root);
    var startBtn = $("#mf-practice-start", root);

    function syncRoles(playerCount) {
      if (!rolesEl || !window.GameRules) return;
      var n = Number(playerCount);
      var dist = window.GameRules.getRoleDistribution(n);
      if (!dist) {
        rolesEl.innerHTML = "<p class=\"mf-muted\">Selecione entre 4 e 7 jogadores.</p>";
        return;
      }
      var parts = [];
      if (dist.sheriff) parts.push(dist.sheriff + " Xerife");
      if (dist.deputy) parts.push(dist.deputy + " Deputado(s)");
      if (dist.outlaw) parts.push(dist.outlaw + " Fora(s)-da-Lei");
      if (dist.renegade) parts.push(dist.renegade + " Renegado(s)");
      rolesEl.innerHTML =
        '<p class="mf-practice-roles__title">Distribuição para ' +
        n +
        " jogadores</p>" +
        "<p>" +
        escapeHtml(parts.join(" · ")) +
        "</p>";
    }

    function persistAndOpenGame() {
      var diff = "medium";
      for (var di = 0; di < difficultyInputs.length; di++) {
        if (difficultyInputs[di].checked) {
          diff = difficultyInputs[di].value;
          break;
        }
      }
      var count = range ? Number(range.value) : 5;
      if (window.FrontierStorage) {
        window.FrontierStorage.setString(window.FrontierStorage.KEYS.PRACTICE_DIFFICULTY, diff);
        window.FrontierStorage.setString(window.FrontierStorage.KEYS.PRACTICE_OPPONENTS, String(count));
      }
      window.location.href = window.MF_ROUTES.legacyGame;
    }

    if (range && out) {
      var initial = range.value;
      out.textContent = initial;
      syncRoles(initial);
      range.addEventListener("input", function () {
        out.textContent = range.value;
        syncRoles(range.value);
      });
    }

    if (startBtn) {
      startBtn.addEventListener("click", function () {
        persistAndOpenGame();
      });
    }
  }

  function initWaitingRoom(root) {
    var copyBtn = $("#mf-copy-code", root);
    var codeEl = $("#mf-room-code", root);
    if (copyBtn && codeEl) {
      copyBtn.addEventListener("click", function () {
        var code = (codeEl.textContent || "").trim();
        if (!code) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(
            function () {
              showToast("Código copiado.");
            },
            function () {
              showToast(code);
            }
          );
        } else {
          showToast(code);
        }
      });
    }
    var start = $("#mf-host-start", root);
    if (start) {
      start.addEventListener("click", function () {
        navigateToRoute("gameplay");
      });
    }
  }

  function initCreateRoom(root) {
    var form = $("#mf-create-room-form", root);
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var cap = Number(($("#mf-room-capacity", root) || {}).value || 7);
      if (window.GameRules && !window.GameRules.isValidPlayerCount(cap)) {
        showToast("Escolha entre 4 e 7 jogadores.");
        return;
      }
      var name = ($("#mf-room-name", root) || {}).value || "Nova Sala";
      var code = Math.random().toString(36).slice(2, 10);
      if (window.FrontierStorage) {
        window.FrontierStorage.setString(window.FrontierStorage.KEYS.MOCK_ROOM_CODE, code);
      }
      showToast('Sala "' + name + '" criada (demo).');
      window.setTimeout(function () {
        var waitingPath = (window.MF_ROUTES && window.MF_ROUTES.waitingRoom) || "sala-de-espera.html";
        window.location.href = waitingPath + "?code=" + encodeURIComponent(code) + "&cap=" + cap;
      }, 350);
    });
  }

  function initRulesInject(root) {
    var mount = $("#mf-turn-phases", root);
    if (!mount || !window.GameRules) return;
    mount.innerHTML = window.GameRules.TURN_PHASES.map(function (phase) {
      return (
        '<div class="mf-phase">' +
        '<div class="mf-phase__num">' +
        (phase.order < 10 ? "0" : "") +
        phase.order +
        "</div>" +
        '<div class="mf-phase__body">' +
        "<h4>" +
        escapeHtml(phase.title) +
        "</h4>" +
        "<p>" +
        escapeHtml(phase.body) +
        "</p></div></div>"
      );
    }).join("");
  }

  function initRolesGrid(root) {
    var mount = $("#mf-roles-grid", root);
    if (!mount || !window.GameRules) return;
    mount.innerHTML = window.GameRules.ROLE_DESCRIPTIONS.map(function (r) {
      return (
        '<div class="mf-role-card mf-role-card--' +
        escapeHtml(r.accent) +
        '">' +
        '<div class="mf-role-card__icon"><span class="material-symbols-outlined">' +
        escapeHtml(r.icon) +
        "</span></div>" +
        "<h3>" +
        escapeHtml(r.label) +
        "</h3>" +
        "<p>" +
        escapeHtml(r.goal) +
        "</p></div>"
      );
    }).join("");
  }

  function wireDataNav(root) {
    $all("[data-mf-go]", root).forEach(function (el) {
      el.addEventListener("click", function (ev) {
        var key = el.getAttribute("data-mf-go");
        if (!key || !window.MF_ROUTES || !window.MF_ROUTES[key]) return;
        ev.preventDefault();
        navigateToRoute(key);
      });
    });
  }

  function applyQueryToWaitingRoom() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get("code");
    var codeEl = $("#mf-room-code");
    if (code && codeEl) codeEl.textContent = code.toUpperCase();
  }

  function onReady() {
    var page = document.body.getAttribute("data-mf-page") || "";
    wireDataNav(document);

    var roomList = $("#mf-room-list");
    if (roomList) mountRoomList(roomList);

    initFilterChips(document);

    if (page === "practice") initPracticeForm(document);
    if (page === "waiting") {
      applyQueryToWaitingRoom();
      initWaitingRoom(document);
    }
    if (page === "create-room") initCreateRoom(document);
    if (page === "rules-summary" || page === "rules-official") {
      initRulesInject(document);
      initRolesGrid(document);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();

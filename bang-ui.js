// ═══ MODAL ═══
// ═══ UI ═══ (modal, render, log/toast, lobby online)
let modalCallbackRef = null;
function openModal(type, targets, onPickTarget) {
  modalCallbackRef = onPickTarget;
  document.getElementById("m-title").textContent = MODAL_TITLES[type] || "Alvo";
  document.getElementById("m-desc").textContent =
    type === "bang" ? `Alcance da arma: ${reach(getCurrentPlayer())}.` : "";
  const targetListEl = document.getElementById("m-list");
  targetListEl.innerHTML = "";
  targets.forEach((targetPlayer) => {
    const targetPickButton = document.createElement("button");
    targetPickButton.className = "target-btn";
    const sheriffPrefix =
      targetPlayer.role === "sheriff" && type === "bang"
        ? `<span style="color:var(--color-primary);font-weight:700;margin-right:4px">${rLabel("sheriff")}</span> `
        : "";
    targetPickButton.innerHTML = `${rIcon(targetPlayer.role)} ${sheriffPrefix}${targetPlayer.name} <small style="opacity:.6">(${targetPlayer.char.name})</small> <span class="target-btn__meta">❤️${targetPlayer.life} dist.${dist(getCurrentPlayer(), targetPlayer)}</span>`;
    targetPickButton.onclick = () => {
      closeModal();
      onPickTarget(targetPlayer);
    };
    targetListEl.appendChild(targetPickButton);
  });
  document.getElementById("tgt-modal").classList.add("is-open");
}
function closeModal() {
  document.getElementById("tgt-modal").classList.remove("is-open");
  modalCallbackRef = null;
}

// ═══ HOTSEAT ═══
function showHotseat() {
  const activePlayer = getCurrentPlayer();
  document.getElementById("hc-name").textContent = `Vez de ${activePlayer.name}`;
  document.getElementById("hc-hint").textContent =
    activePlayer.role === "sheriff"
      ? "⭐ Você é o XERIFE (papel público)."
      : `Papel secreto: ${rLabel(activePlayer.role)} — não mostre!`;
  document.getElementById("hcover").classList.add("is-open");
}
function revealTurn() {
  document.getElementById("hcover").classList.remove("is-open");
  beginTurn();
}

// ═══ RENDER ═══
function prunePlayerHitFlash() {
  const until = LocalState.playerHitFlashUntil;
  if (!until || typeof until !== "object") return;
  const t = Date.now();
  Object.keys(until).forEach((id) => {
    if (until[id] <= t) delete until[id];
  });
}

function hitFlashExtraClass(player, playerIndex) {
  const until = LocalState.playerHitFlashUntil;
  if (!until || typeof until !== "object") return "";
  const exp = until[player.id];
  if (exp == null || Date.now() >= exp) return "";
  return playerIndex === LocalState.current ? " pcard-hit-flash--active" : " pcard-hit-flash";
}

function renderGame() {
  if (LocalState.gameOver && LocalState.mode !== "online") return;
  prunePlayerHitFlash();
  renderPlayers();
  renderHand();
  renderSidebar();
  syncLogPanel();
  document.getElementById("draw-n").textContent = LocalState.drawPile.length;
  document.getElementById("disc-n").textContent = LocalState.discardPile.length;
}
// ─── Renderização de players ──────────────────────────────────

/** Determina as classes CSS do card de jogador na mesa central. */
function getPlayerCardClassName(player, isCurrentTurn) {
  let className = "pcard";
  if (isCurrentTurn) className += " active";
  if (player.role === "sheriff") className += " is-sheriff";
  if (!player.alive) className += " dead";
  if (player.isBot) className += " bot-c";
  else className += " is-human";
  return className;
}

/** Gera os pips de vida de um player (bolinhas cheias/vazias). */
function buildLifePipsHtml(player) {
  let html = "";
  for (let i = 0; i < player.maxLife; i++)
    html += `<span class="pcard__life-pip ${i >= player.life ? "is-empty" : ""}"></span>`;
  return html;
}

/** Gera os corações de vida para o avatar compacto do anel de oponentes. */
function buildHeartsHtml(player) {
  let html = "";
  for (let i = 0; i < player.maxLife; i++)
    html += `<span class="opponent-card__heart">${i < player.life ? "❤️" : "🖤"}</span>`;
  return html;
}

/** Gera badges de equipamento para o card de mesa. */
function buildEquipmentBadgesHtml(player) {
  let html = "";
  if (player.equipment.weaponKey !== "colt45")
    html += `<span class="equipment-badge">${WEAPONS[player.equipment.weaponKey].icon}${WEAPONS[player.equipment.weaponKey].label}</span>`;
  if (player.equipment.barrel || player.char.ability === "builtinBarrel")
    html += `<span class="equipment-badge">🛢️Barril</span>`;
  if (player.equipment.mustang || player.char.ability === "builtinMustang")
    html += `<span class="equipment-badge">🐎Mustang</span>`;
  if (player.equipment.scope)
    html += `<span class="equipment-badge">🔭Luneta</span>`;
  return html;
}

/**
 * Constrói o elemento DOM do card completo (mesa central).
 * Usado em offline/hotseat para todos os jogadores,
 * e em online apenas para o jogador local.
 */
function buildPlayerTableCard(player, playerIndex) {
  const isCurrentTurn = playerIndex === LocalState.current;
  const div = document.createElement("div");
  div.className =
    getPlayerCardClassName(player, isCurrentTurn) +
    hitFlashExtraClass(player, playerIndex);

  const lifePips    = buildLifePipsHtml(player);
  const equipment   = buildEquipmentBadgesHtml(player);
  const roleDisplay = renderPlayerRoleIndicator(player);
  const botTag      = player.isBot ? `<span class="pcard__tag-bot">BOT</span>` : "";
  const showThinking =
    player.isBot &&
    isCurrentTurn &&
    (LocalState.phase === PHASES.draw || LocalState.phase === PHASES.play);

  div.innerHTML = `
    <div class="pcard__header">
      <div class="pcard__name">${player.name}${botTag}</div>
      <div class="pcard__role">${roleDisplay}</div>
    </div>
    <div class="pcard__char">${player.char.name}</div>
    <div class="pcard__life-bar">${lifePips}</div>
    <div class="pcard__equipment">${equipment}</div>
    <div class="pcard__hand-count">${player.alive ? `🂠 ${player.hand.length}` : "💀"}</div>
    ${player.jailed      ? '<div class="jail-banner">PRESO</div>' : ""}
    ${player.hasDynamite ? '<div class="dyn-banner">💣</div>'     : ""}
    ${showThinking       ? '<div class="pcard__thinking">🤔 Pensando...</div>' : ""}
  `;
  return div;
}

/**
 * Constrói o elemento DOM do avatar circular compacto (anel de oponentes).
 * Mostra: inicial do nome, badge de papel, corações e contagem de mão.
 */
function buildOpponentAvatarCard(player, playerIndex) {
  const isCurrentTurn = playerIndex === LocalState.current;
  const isSheriff     = player.role === "sheriff";
  const isDead        = !player.alive;

  const wrapper = document.createElement("div");
  wrapper.className = [
    "opponent-card",
    isCurrentTurn ? "is-turn"    : "",
    isSheriff     ? "is-sheriff" : "",
    isDead        ? "is-dead"    : "",
    hitFlashExtraClass(player, playerIndex).trim()
      ? "pcard-hit-flash" : "",
  ].filter(Boolean).join(" ");

  const initial    = player.name.charAt(0).toUpperCase();
  const roleDisp   = renderPlayerRoleIndicator(player);
  const hearts     = buildHeartsHtml(player);
  const handCount  = player.alive ? player.hand.length : "💀";

  const jailBadge    = player.jailed
    ? '<span class="status-badge status-badge--jailed">Preso</span>' : "";
  const dynamiteBadge = player.hasDynamite
    ? '<span class="status-badge status-badge--dynamite">💣</span>' : "";

  wrapper.innerHTML = `
    <div class="opponent-card__avatar-wrap">
      ${jailBadge}${dynamiteBadge}
      <div class="opponent-card__avatar-circle">
        <span style="font-family:var(--font-headline);font-weight:700;font-size:1.1rem;color:var(--color-primary)">${initial}</span>
      </div>
      <div class="opponent-card__badge">${roleDisp || "?"}</div>
    </div>
    <div class="opponent-card__name">${player.name}</div>
    <div class="opponent-card__hearts">${hearts}</div>
    <div class="opponent-card__hand-count">🂠 ${handCount}</div>
  `;
  return wrapper;
}

function renderPlayers() {
  const grid = document.getElementById("pgrid");
  const ring = document.getElementById("opponents-ring");
  grid.innerHTML = "";
  if (ring) ring.innerHTML = "";

  if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
    // Online: anel com avatares compactos dos oponentes; mesa com o card próprio.
    const myId = BangNetwork.myPlayerId;
    LocalState.players.forEach((player, playerIndex) => {
      if (myId != null && Number(player.id) === Number(myId)) {
        // Jogador local: card completo na mesa
        grid.appendChild(buildPlayerTableCard(player, playerIndex));
      } else {
        // Oponentes: avatar circular no anel do topo
        if (ring) ring.appendChild(buildOpponentAvatarCard(player, playerIndex));
      }
    });
  } else {
    // Offline / hotseat: todos na mesa com cards completos
    LocalState.players.forEach((player, playerIndex) =>
      grid.appendChild(buildPlayerTableCard(player, playerIndex))
    );
  }
}

// Mantido para uso externo (bang-ui renderPlayerRoleIndicator)
function renderPlayerLifeBullets(player) { return buildLifePipsHtml(player); }
function renderPlayerEquipment(player)   { return buildEquipmentBadgesHtml(player); }
function renderPlayerRoleIndicator(player) {
  const roleDisplayStrategies = [
    { when: () => player.role === "sheriff", render: () => "⭐" },
    { when: () => !player.alive, render: () => rIcon(player.role) },
    {
      when: () =>
        LocalState.mode === "online" &&
        typeof BangNetwork !== "undefined" &&
        BangNetwork.myPlayerId != null &&
        Number(player.id) === Number(BangNetwork.myPlayerId) &&
        player.role !== "hidden",
      render: () =>
        `<span style="font-size:.65rem" title="${rLabel(player.role)}">${rIcon(player.role)} ${rLabel(player.role)}</span>`,
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
  const activePlayer = getCurrentPlayer();
  const myId =
    LocalState.mode === "online" && typeof BangNetwork !== "undefined"
      ? BangNetwork.myPlayerId
      : null;
  const hideHand =
    LocalState.mode === "online" &&
    myId != null &&
    Number(activePlayer.id) !== Number(myId);
  document.getElementById("h-title").textContent = activePlayer.isBot
    ? `🤖 ${activePlayer.name}`
    : hideHand
      ? `🂠 ${activePlayer.name} (oponente)`
      : `Mão de ${activePlayer.name}`;
  document.getElementById("h-meta").textContent =
    `${activePlayer.char.name} · ❤️${activePlayer.life}/${activePlayer.maxLife} · ${WEAPONS[activePlayer.equipment.weaponKey].icon}${WEAPONS[activePlayer.equipment.weaponKey].label}`;
  const handCardsEl = document.getElementById("h-cards");
  const handButtonsEl = document.getElementById("h-btns");
  handCardsEl.innerHTML = "";
  handButtonsEl.innerHTML = "";
  if (activePlayer.isBot || hideHand) {
    for (let cardIndex = 0; cardIndex < activePlayer.hand.length; cardIndex++) {
      const cardBackEl = document.createElement("div");
      cardBackEl.className = "card disabled";
      cardBackEl.style.cssText =
        "background:linear-gradient(135deg,var(--color-container-high),var(--color-container));border-color:var(--color-outline-variant);";
      cardBackEl.innerHTML =
        '<span style="font-size:1.8rem;color:var(--color-on-surface-variant)">🂠</span>';
      handCardsEl.appendChild(cardBackEl);
    }
    return;
  }
  if (LocalState.phase === PHASES.draw) {
    const drawButton = document.createElement("button");
    drawButton.className = "action-btn action-btn--draw";
    drawButton.textContent = "🃏 Comprar Cartas";
    drawButton.onclick = doDraw;
    handButtonsEl.appendChild(drawButton);
    activePlayer.hand.forEach((card, cardIndex) =>
      handCardsEl.appendChild(mkCard(card, cardIndex, true)),
    );
    return;
  }
  if (LocalState.phase === PHASES.play) {
    activePlayer.hand.forEach((card, cardIndex) =>
      handCardsEl.appendChild(mkCard(card, cardIndex, cardDisabled(card, activePlayer))),
    );
    const endPlayButton = document.createElement("button");
    endPlayButton.className = "action-btn action-btn--phase";
    endPlayButton.textContent = "✓ Encerrar Turno";
    endPlayButton.onclick = endPlay;
    handButtonsEl.appendChild(endPlayButton);
    if (
      activePlayer.char.ability === "selfHeal" &&
      activePlayer.hand.length >= PLAYER_ABILITY_RULES.sidKetchumDiscardCost &&
      activePlayer.life < activePlayer.maxLife
    ) {
      const sidKetchumButton = document.createElement("button");
      sidKetchumButton.className = "action-btn action-btn--phase";
      sidKetchumButton.textContent = "💊 Descartar 2 → +1 vida";
      sidKetchumButton.onclick = () => {
        if (LocalState.mode === "online" && typeof BangNetwork !== "undefined") {
          BangNetwork.sendGameAction({ type: "sidKetchum" });
          return;
        }
        for (
          let discardIndex = 0;
          discardIndex < PLAYER_ABILITY_RULES.sidKetchumDiscardCost;
          discardIndex++
        ) {
          discardCardToPile(activePlayer.hand.pop());
        }
        heal(activePlayer);
        addLog(`${activePlayer.name} (Sid Ketchum) usa habilidade!`);
        renderGame();
      };
      handButtonsEl.appendChild(sidKetchumButton);
    }
    return;
  }
  if (LocalState.phase === PHASES.discard) {
    const maxHandWhileAlive = activePlayer.life;
    document.getElementById("h-meta").textContent +=
      ` · Descarte até ${maxHandWhileAlive} carta(s)`;
    activePlayer.hand.forEach((card, cardIndex) => {
      const cardEl = mkCard(card, cardIndex, false);
      cardEl.onclick = () => doDiscard(cardIndex);
      handCardsEl.appendChild(cardEl);
    });
    if (activePlayer.hand.length <= maxHandWhileAlive) {
      const nextTurnButton = document.createElement("button");
      nextTurnButton.className = "action-btn action-btn--end";
      nextTurnButton.textContent = "→ Próximo Turno";
      nextTurnButton.onclick = endDiscard;
      handButtonsEl.appendChild(nextTurnButton);
    } else {
      const discardHint = document.createElement("span");
      discardHint.style.cssText =
        "font-size:.71rem;color:rgba(255,200,100,.8);align-self:center;";
      discardHint.textContent = `Clique para descartar (${activePlayer.hand.length - maxHandWhileAlive} demais)`;
      handButtonsEl.appendChild(discardHint);
    }
  }
}
function cardDisabled(card, player) {
  return shouldSkipCardForPlayer(card, player);
}
function mkCard(card, handIndex, disabled) {
  const cardElement = document.createElement("div");
  if (card.type === "back") {
    cardElement.className = "card disabled";
    cardElement.setAttribute("data-type", "back");
    cardElement.style.cssText =
      "background:linear-gradient(135deg,var(--color-container-high),var(--color-container));border-color:var(--color-outline-variant);";
    cardElement.innerHTML =
      '<span style="font-size:1.8rem;color:var(--color-on-surface-variant)">🂠</span>';
    return cardElement;
  }
  cardElement.className = "card" + (disabled ? " disabled" : "");
  cardElement.setAttribute("data-type", card.type);
  cardElement.title = CTIPS[card.type] || "";
  cardElement.innerHTML = `<span class="card__suit" style="color:${card.suit === "♥" || card.suit === "♦" ? "#ef4444" : "var(--color-on-surface)"}">${card.suit || ""}</span><span class="card__icon">${card.icon}</span><span class="card__name">${card.label}</span><span class="card__value">${card.value || ""}</span>`;
  if (!disabled) cardElement.onclick = () => playCard(handIndex);
  return cardElement;
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
  const activePlayer = getCurrentPlayer();
  document.getElementById("t-name").textContent =
    `${activePlayer.isBot ? "🤖 " : "👤 "}${activePlayer.name}`;
  document.getElementById("t-char").textContent =
    `${activePlayer.char.name} · ${activePlayer.char.desc}`;
  const myRoleEl = document.getElementById("t-my-role");
  if (myRoleEl) {
    if (
      LocalState.mode === "online" &&
      typeof BangNetwork !== "undefined" &&
      BangNetwork.myPlayerId != null
    ) {
      const me = LocalState.players.find(
        (p) => Number(p.id) === Number(BangNetwork.myPlayerId),
      );
      if (me && me.role && me.role !== "hidden") {
        myRoleEl.style.display = "block";
        myRoleEl.innerHTML = `Seu papel (secreto): <b>${rLabel(me.role)}</b> ${rIcon(me.role)}`;
      } else {
        myRoleEl.style.display = "none";
        myRoleEl.textContent = "";
      }
    } else {
      myRoleEl.style.display = "none";
      myRoleEl.textContent = "";
    }
  }
  [PHASES.draw, PHASES.play, PHASES.discard].forEach(
    (phaseKey) =>
      (document.getElementById(`ph-${phaseKey}`).className =
        "phase-dot" + (LocalState.phase === phaseKey ? " is-active" : "")),
  );
}

// ═══ LOG / HELPERS ═══
/** Atualiza o painel #glog a partir de `LocalState.log` (offline via addLog; online via snapshot). */
function syncLogPanel() {
  const logPanel = document.getElementById("glog");
  if (!logPanel) return;
  const entries = Array.isArray(LocalState.log) ? LocalState.log : [];
  logPanel.innerHTML = entries
    .slice(0, GAME_LIMITS.visibleLogEntries)
    .map((entry) => {
      const typeModifier = entry && entry.type ? `log-line--${entry.type}` : "";
      const msg = entry && entry.msg != null ? String(entry.msg) : "";
      return `<div class="log-line ${typeModifier}">${msg}</div>`;
    })
    .join("");
}

function addLog(logText, type = "") {
  LocalState.log.unshift({ msg: logText, type });
  if (LocalState.log.length > GAME_LIMITS.logMaxEntries) LocalState.log.pop();
  syncLogPanel();
}
function rLabel(roleId) {
  return ROLE_LABELS[roleId] || roleId;
}
function rIcon(roleId) {
  return ROLE_ICONS[roleId] || "?";
}
function toast(messageText) {
  const toastEl = document.getElementById("toast");
  toastEl.textContent = messageText;
  toastEl.classList.add("is-visible");
  clearTimeout(toastEl._toastHideTimerId);
  toastEl._toastHideTimerId = setTimeout(
    () => toastEl.classList.remove("is-visible"),
    GAME_LIMITS.toastDurationMs,
  );
}

// ═══ ONLINE LOBBY ═══
function renderLobby(lobbyMessage) {
  const lobby = document.getElementById("on-lobby");
  if (!lobby) return;
  lobby.style.display = "block";
  const roomIdLabel = document.getElementById("on-rid");
  if (roomIdLabel) roomIdLabel.textContent = lobbyMessage.roomId;
  const playerList = document.getElementById("on-plist");
  if (playerList) {
    playerList.innerHTML = "";
    (lobbyMessage.players || []).forEach((lobbyRow) => {
      const lobbyListItem = document.createElement("li");
      lobbyListItem.className =
        "lobby-player-item" + (lobbyRow.isHost ? " is-host" : "");
      lobbyListItem.innerHTML = `<span class="lobby-player-item__dot"></span>${lobbyRow.displayName}${lobbyRow.isYou ? " <em style='opacity:.6;font-size:.7em'>(você)</em>" : ""}`;
      playerList.appendChild(lobbyListItem);
    });
  }
  const startBtn = document.getElementById("on-start");
  if (startBtn) startBtn.style.display = lobbyMessage.youAreHost ? "block" : "none";
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

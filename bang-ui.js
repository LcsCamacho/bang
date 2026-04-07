// ═══ MODAL ═══
// ═══ UI ═══ (modal, render, log/toast, lobby online)
let modalCallbackRef = null;
function openModal(type, targets, onPickTarget) {
  modalCallbackRef = onPickTarget;
  document.getElementById("m-title").textContent = MODAL_TITLES[type] || "Alvo";
  document.getElementById("m-desc").textContent =
    type === "bang" ? `Alcance da arma: ${reach(currentP())}.` : "";
  const targetListEl = document.getElementById("m-list");
  targetListEl.innerHTML = "";
  targets.forEach((targetPlayer) => {
    const targetPickButton = document.createElement("button");
    targetPickButton.className = "tbtn";
    const sheriffPrefix =
      targetPlayer.role === "sheriff" && type === "bang"
        ? `<span style="color:var(--sheriff-gold);font-weight:700;margin-right:4px">${rLabel("sheriff")}</span> `
        : "";
    targetPickButton.innerHTML = `${rIcon(targetPlayer.role)} ${sheriffPrefix}${targetPlayer.name} <small style="opacity:.6">(${targetPlayer.char.name})</small> <span class="td">❤️${targetPlayer.life} dist.${dist(currentP(), targetPlayer)}</span>`;
    targetPickButton.onclick = () => {
      closeModal();
      onPickTarget(targetPlayer);
    };
    targetListEl.appendChild(targetPickButton);
  });
  document.getElementById("tgt-modal").classList.add("open");
}
function closeModal() {
  document.getElementById("tgt-modal").classList.remove("open");
  modalCallbackRef = null;
}

// ═══ HOTSEAT ═══
function showHotseat() {
  const activePlayer = currentP();
  document.getElementById("hc-name").textContent = `Vez de ${activePlayer.name}`;
  document.getElementById("hc-hint").textContent =
    activePlayer.role === "sheriff"
      ? "⭐ Você é o XERIFE (papel público)."
      : `Papel secreto: ${rLabel(activePlayer.role)} — não mostre!`;
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
      LocalState.players.forEach((player, playerIndex) => {
        if (myId != null && Number(player.id) === Number(myId)) return;
        const div = document.createElement("div");
        div.className =
          getPlayerCardClassName(player, playerIndex === LocalState.current) + " pcard-opp";
        const bullets = renderPlayerLifeBullets(player);
        const equipmentRow = renderPlayerEquipment(player);
        const roleDisp = renderPlayerRoleIndicator(player);
        div.innerHTML = `<div class="ph"><div class="pname">${player.name}</div><div class="prole">${roleDisp}</div></div><div class="pchar">${player.char.name}</div><div class="lbar">${bullets}</div><div class="erow">${equipmentRow}</div><div class="hcount">${player.alive ? `🂠 ${player.hand.length}` : "💀"}</div>${player.jailed ? '<div class="jail-banner">PRESO</div>' : ""}${player.hasDynamite ? '<div class="dyn-banner">💣</div>' : ""}`;
        ring.appendChild(div);
      });
    }
  }
  LocalState.players.forEach((player, playerIndex) => {
    const div = document.createElement("div");
    div.className = getPlayerCardClassName(player, playerIndex === LocalState.current);
    const bullets = renderPlayerLifeBullets(player);
    const equipmentRow = renderPlayerEquipment(player);
    const roleDisp = renderPlayerRoleIndicator(player);
    const botTag = player.isBot ? `<span class="bot-tag">BOT</span>` : "";
    const thinking =
      player.isBot &&
      playerIndex === LocalState.current &&
      (LocalState.phase === PHASES.draw || LocalState.phase === PHASES.play);
    div.innerHTML = `<div class="ph"><div class="pname">${player.name}${botTag}</div><div class="prole">${roleDisp}</div></div><div class="pchar">${player.char.name}</div><div class="lbar">${bullets}</div><div class="erow">${equipmentRow}</div><div class="hcount">${player.alive ? `🂠 ${player.hand.length}` : "💀"}</div>${player.jailed ? '<div class="jail-banner">PRESO</div>' : ""}${player.hasDynamite ? '<div class="dyn-banner">💣</div>' : ""}${thinking ? '<div class="bot-thinking">🤔 pensando...</div>' : ""}`;
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
  const activePlayer = currentP();
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
        "background:linear-gradient(135deg,#5c3a1e,#3a1f08);border-color:var(--sand);";
      cardBackEl.innerHTML =
        '<span style="font-size:1.8rem;color:var(--sand)">🂠</span>';
      handCardsEl.appendChild(cardBackEl);
    }
    return;
  }
  if (LocalState.phase === PHASES.draw) {
    const drawButton = document.createElement("button");
    drawButton.className = "btn btn-draw";
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
    endPlayButton.className = "btn btn-phase";
    endPlayButton.textContent = "✓ Encerrar Turno";
    endPlayButton.onclick = endPlay;
    handButtonsEl.appendChild(endPlayButton);
    if (
      activePlayer.char.ability === "selfHeal" &&
      activePlayer.hand.length >= PLAYER_ABILITY_RULES.sidKetchumDiscardCost &&
      activePlayer.life < activePlayer.maxLife
    ) {
      const sidKetchumButton = document.createElement("button");
      sidKetchumButton.className = "btn btn-phase";
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
          disc(activePlayer.hand.pop());
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
      nextTurnButton.className = "btn btn-end";
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
      "background:linear-gradient(135deg,#5c3a1e,#3a1f08);border-color:var(--sand);";
    cardElement.innerHTML =
      '<span style="font-size:1.8rem;color:var(--sand)">🂠</span>';
    return cardElement;
  }
  cardElement.className = "card" + (disabled ? " disabled" : "");
  cardElement.setAttribute("data-type", card.type);
  cardElement.title = CTIPS[card.type] || "";
  cardElement.innerHTML = `<span class="cs" style="color:${card.suit === "♥" || card.suit === "♦" ? "#c00" : "#111"}">${card.suit || ""}</span><span class="ci">${card.icon}</span><span class="cn">${card.label}</span><span class="cv">${card.value || ""}</span>`;
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
  const activePlayer = currentP();
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
        "pdot" + (LocalState.phase === phaseKey ? " on" : "")),
  );
}

// ═══ LOG / HELPERS ═══
function addLog(logText, type = "") {
  LocalState.log.unshift({ msg: logText, type });
  if (LocalState.log.length > GAME_LIMITS.logMaxEntries) LocalState.log.pop();
  const logPanel = document.getElementById("glog");
  if (!logPanel) return;
  logPanel.innerHTML = LocalState.log
    .slice(0, GAME_LIMITS.visibleLogEntries)
    .map((entry) => `<div class="ll ${entry.type}">${entry.msg}</div>`)
    .join("");
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
  toastEl.classList.add("show");
  clearTimeout(toastEl._toastHideTimerId);
  toastEl._toastHideTimerId = setTimeout(
    () => toastEl.classList.remove("show"),
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
      lobbyListItem.textContent = `${lobbyRow.displayName}${lobbyRow.isHost ? " ★ anfitrião" : ""}${lobbyRow.isYou ? " (você)" : ""}`;
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

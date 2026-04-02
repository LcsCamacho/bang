// ═══ MODAL ═══
// ═══ UI ═══ (modal, render, log/toast, lobby online)
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
    const sheriffPrefix =
      t.role === "sheriff" && type === "bang"
        ? `<span style="color:var(--sheriff-gold);font-weight:700;margin-right:4px">${rLabel("sheriff")}</span> `
        : "";
    btn.innerHTML = `${rIcon(t.role)} ${sheriffPrefix}${t.name} <small style="opacity:.6">(${t.char.name})</small> <span class="td">❤️${t.life} dist.${dist(currentP(), t)}</span>`;
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

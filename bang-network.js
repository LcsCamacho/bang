/**
 * Cliente WebSocket — modo online (estado autoritativo no servidor).
 */
(function () {
  const MSG = {
    CREATE_ROOM: "createRoom",
    JOIN_ROOM: "joinRoom",
    LEAVE_ROOM: "leaveRoom",
    START_GAME: "startGame",
    GAME_ACTION: "gameAction",
    PING: "ping",
    RECONNECT: "reconnect",
    ROOM_UPDATE: "roomUpdate",
    GAME_STATE: "gameState",
    ERROR: "error",
    PONG: "pong",
    RECONNECTED: "reconnected",
  };

  let ws = null;
  let myPlayerId = null;
  let sessionToken = null;
  let roomId = null;
  let reconnectTimer = null;

  function wsUrl() {
    const p = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (typeof window.BANG_WS_URL === "string" && window.BANG_WS_URL.trim()) {
      return window.BANG_WS_URL.trim();
    }
    if (typeof window.BANG_WS_PORT !== "undefined" && window.BANG_WS_PORT !== null) {
      const port = String(window.BANG_WS_PORT).trim();
      if (port) return `${p}//${window.location.hostname || "localhost"}:${port}`;
    }
    if (!window.location.host) return `${p}//localhost:3777`;
    return `${p}//${window.location.host}`;
  }

  function send(obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }

  function mergeSnapshot(pub, priv) {
    if (!pub) return;
    myPlayerId = priv ? priv.playerId : myPlayerId;
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const gs = document.getElementById("game-screen");
    if (gs) gs.style.display = "block";
    document.body.classList.add("game-online");
    LocalState.mode = "online";
    LocalState.gameOver = pub.gameOver;
    LocalState.current = pub.current;
    LocalState.phase = pub.phase;
    LocalState.drawPile = Array(Math.max(0, pub.drawPileCount || 0)).fill(null);
    LocalState.discardPile = [];
    LocalState.log = pub.log || [];
    LocalState.pending = pub.pending || null;
    LocalState.storeCards = [];
    LocalState.storeOrder = [];
    LocalState.storePick = 0;

    LocalState.players = pub.players.map((sp) => {
      const isMe = sp.id === myPlayerId;
      const role =
        isMe && priv && priv.role ? priv.role : sp.role === "hidden" ? "hidden" : sp.role;
      const hand =
        isMe && priv && Array.isArray(priv.hand)
          ? priv.hand
          : Array(sp.handCount || 0)
              .fill(null)
              .map(() => ({
                type: "back",
                label: "",
                icon: "🂠",
                suit: "",
                value: "",
              }));
      return {
        id: sp.id,
        name: sp.name,
        role,
        char: sp.char || { name: sp.charName, ability: sp.charAbility, desc: "" },
        life: sp.life,
        maxLife: sp.maxLife,
        hand,
        equipment: sp.equipment || {
          weaponKey: "colt45",
          barrel: false,
          mustang: false,
          scope: false,
        },
        alive: sp.alive,
        jailed: sp.jailed,
        hasDynamite: sp.hasDynamite,
        usedBang: sp.usedBang,
        isBot: false,
        difficulty: null,
      };
    });

    if (pub.winInfo) {
      LocalState.gameOver = true;
      document.getElementById("w-icon").textContent = pub.winInfo.icon || "🤠";
      document.getElementById("w-title").textContent = pub.winInfo.title || "";
      document.getElementById("w-desc").textContent = pub.winInfo.desc || "";
      document.getElementById("w-roles").innerHTML = LocalState.players
        .map((p) => {
          const roleTag =
            p.role === "hidden" ? "?" : typeof rLabel === "function" ? rLabel(p.role) : p.role;
          return `<div><b>${p.name}</b> — ${roleTag} (${p.char.name}) ${p.alive ? "✅" : "💀"}</div>`;
        })
        .join("");
      document.getElementById("win-ov").classList.add("open");
    }

    if (pub.lastToast && typeof toast === "function") toast(pub.lastToast);

    if (!pub.pending || pub.pending.kind !== "storePick") {
      const sm = document.getElementById("store-modal");
      if (sm) sm.classList.remove("open");
    }
  }

  function handlePendingModals() {
    const p = LocalState.pending;
    if (!p || LocalState.gameOver) return;
    if (p.kind === "chooseTarget" && p.playerId === myPlayerId) {
      const tgts = LocalState.players.filter(
        (x) => p.validTargetIds && p.validTargetIds.includes(x.id),
      );
      openModal(p.cardType || "bang", tgts, (tgt) => {
        sendGameAction({ type: "chooseTarget", targetId: tgt.id });
      });
    }
    if (p.kind === "missedAsBang" && p.playerId === myPlayerId) {
      const tgts = LocalState.players.filter(
        (x) => p.validTargetIds && p.validTargetIds.includes(x.id),
      );
      openModal("bang", tgts, (tgt) => {
        sendGameAction({ type: "missedAsBangTarget", targetId: tgt.id });
      });
    }
    if (p.kind === "storePick" && p.pickerId === myPlayerId) {
      const list = document.getElementById("sm-list");
      document.getElementById("sm-desc").textContent = "Escolha uma carta:";
      list.innerHTML = "";
      (p.cards || []).forEach((card, idx) => {
        const btn = document.createElement("button");
        btn.className = "tbtn";
        btn.innerHTML = `${card.icon} ${card.label} <span class="td">${card.suit}${card.value}</span>`;
        btn.onclick = () => {
          document.getElementById("store-modal").classList.remove("open");
          sendGameAction({ type: "storePick", cardIndex: idx });
        };
        list.appendChild(btn);
      });
      document.getElementById("store-modal").classList.add("open");
    }
  }

  function onMessage(ev) {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.type === MSG.ERROR) {
      if (typeof toast === "function") toast(msg.message || "Erro");
      return;
    }
    if (msg.type === MSG.ROOM_UPDATE) {
      sessionToken = msg.sessionToken || sessionToken;
      roomId = msg.roomId || roomId;
      if (typeof renderLobby === "function") renderLobby(msg);
      return;
    }
    if (msg.type === MSG.GAME_STATE) {
      mergeSnapshot(msg.public, msg.private);
      sessionToken = msg.sessionToken || sessionToken;
      if (typeof renderGame === "function") renderGame();
      handlePendingModals();
      return;
    }
    if (msg.type === MSG.RECONNECTED) {
      roomId = msg.roomId || roomId;
      return;
    }
  }

  function connect() {
    if (ws && ws.readyState === 1) return ws;
    const targetUrl = wsUrl();
    console.log("[BangNetwork] connecting to", targetUrl);
    ws = new WebSocket(targetUrl);
    ws.onopen = () => {
      console.log("[BangNetwork] connected");
      if (sessionToken && roomId) {
        send({ type: MSG.RECONNECT, sessionToken, roomId });
      }
    };
    ws.onmessage = onMessage;
    ws.onclose = () => {
      console.warn("[BangNetwork] disconnected, retrying...");
      if (typeof toast === "function") toast("Conexão perdida. Reconectando…");
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 2000);
    };
    ws.onerror = (ev) => {
      console.error("[BangNetwork] websocket error", ev);
    };
    return ws;
  }

  function ensureSend(payload) {
    const sock = connect();
    if (sock.readyState === 1) send(payload);
    else
      sock.addEventListener(
        "open",
        () => {
          send(payload);
        },
        { once: true },
      );
  }

  function sendGameAction(action) {
    ensureSend({ type: MSG.GAME_ACTION, action });
  }

  function createRoom(displayName) {
    console.log("[BangNetwork] createRoom", { displayName });
    ensureSend({ type: MSG.CREATE_ROOM, displayName });
  }

  function joinRoom(id, displayName) {
    ensureSend({ type: MSG.JOIN_ROOM, roomId: id.trim(), displayName });
  }

  function leaveRoom() {
    send({ type: MSG.LEAVE_ROOM });
  }

  function startOnlineGame() {
    ensureSend({ type: MSG.START_GAME });
  }

  window.BangNetwork = {
    MSG,
    get myPlayerId() {
      return myPlayerId;
    },
    get sessionToken() {
      return sessionToken;
    },
    get roomId() {
      return roomId;
    },
    isOnline: () => LocalState.mode === "online",
    connect,
    createRoom,
    joinRoom,
    leaveRoom,
    startOnlineGame,
    sendGameAction,
    mergeSnapshot,
  };
})();

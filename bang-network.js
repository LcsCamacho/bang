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

  let socket = null;
  let myPlayerId = null;
  let sessionToken = null;
  let roomId = null;
  let reconnectTimer = null;

  function wsUrl() {
    const wsScheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (typeof window.BANG_WS_URL === "string" && window.BANG_WS_URL.trim()) {
      return window.BANG_WS_URL.trim();
    }
    if (typeof window.BANG_WS_PORT !== "undefined" && window.BANG_WS_PORT !== null) {
      const port = String(window.BANG_WS_PORT).trim();
      if (port)
        return `${wsScheme}//${window.location.hostname || "localhost"}:${port}`;
    }
    if (!window.location.host) return `${wsScheme}//localhost:3777`;
    return `${wsScheme}//${window.location.host}`;
  }

  function send(payload) {
    if (socket && socket.readyState === 1) socket.send(JSON.stringify(payload));
  }

  function mergeSnapshot(publicSnapshot, privateSnapshot) {
    if (!publicSnapshot) return;
    myPlayerId = privateSnapshot ? privateSnapshot.playerId : myPlayerId;
    document.querySelectorAll(".screen").forEach((screenEl) => screenEl.classList.remove("active"));
    const gameScreenEl = document.getElementById("game-screen");
    if (gameScreenEl) gameScreenEl.style.display = "block";
    document.body.classList.add("game-online");
    LocalState.mode = "online";
    LocalState.gameOver = publicSnapshot.gameOver;
    LocalState.current = publicSnapshot.current;
    LocalState.phase = publicSnapshot.phase;
    LocalState.drawPile = Array(Math.max(0, publicSnapshot.drawPileCount || 0)).fill(null);
    LocalState.discardPile = [];
    LocalState.log = publicSnapshot.log || [];
    LocalState.pending = publicSnapshot.pending || null;
    LocalState.storeCards = [];
    LocalState.storeOrder = [];
    LocalState.storePick = 0;

    LocalState.players = publicSnapshot.players.map((publicPlayer) => {
      const isMe = publicPlayer.id === myPlayerId;
      const role =
        isMe && privateSnapshot && privateSnapshot.role
          ? privateSnapshot.role
          : publicPlayer.role === "hidden"
            ? "hidden"
            : publicPlayer.role;
      const hand =
        isMe && privateSnapshot && Array.isArray(privateSnapshot.hand)
          ? privateSnapshot.hand
          : Array(publicPlayer.handCount || 0)
              .fill(null)
              .map(() => ({
                type: "back",
                label: "",
                icon: "🂠",
                suit: "",
                value: "",
              }));
      return {
        id: publicPlayer.id,
        name: publicPlayer.name,
        role,
        char: publicPlayer.char || {
          name: publicPlayer.charName,
          ability: publicPlayer.charAbility,
          desc: "",
        },
        life: publicPlayer.life,
        maxLife: publicPlayer.maxLife,
        hand,
        equipment: publicPlayer.equipment || {
          weaponKey: "colt45",
          barrel: false,
          mustang: false,
          scope: false,
        },
        alive: publicPlayer.alive,
        jailed: publicPlayer.jailed,
        hasDynamite: publicPlayer.hasDynamite,
        usedBang: publicPlayer.usedBang,
        isBot: false,
        difficulty: null,
      };
    });

    if (publicSnapshot.winInfo) {
      LocalState.gameOver = true;
      document.getElementById("w-icon").textContent = publicSnapshot.winInfo.icon || "🤠";
      document.getElementById("w-title").textContent = publicSnapshot.winInfo.title || "";
      document.getElementById("w-desc").textContent = publicSnapshot.winInfo.desc || "";
      document.getElementById("w-roles").innerHTML = LocalState.players
        .map((player) => {
          const roleTag =
            player.role === "hidden"
              ? "?"
              : typeof rLabel === "function"
                ? rLabel(player.role)
                : player.role;
          return `<div><b>${player.name}</b> — ${roleTag} (${player.char.name}) ${player.alive ? "✅" : "💀"}</div>`;
        })
        .join("");
      document.getElementById("win-ov").classList.add("open");
    }

    if (publicSnapshot.lastToast && typeof toast === "function")
      toast(publicSnapshot.lastToast);

    if (!publicSnapshot.pending || publicSnapshot.pending.kind !== "storePick") {
      const storeModalEl = document.getElementById("store-modal");
      if (storeModalEl) storeModalEl.classList.remove("open");
    }
  }

  function handlePendingModals() {
    const pendingAction = LocalState.pending;
    if (!pendingAction || LocalState.gameOver) return;
    if (pendingAction.kind === "chooseTarget" && pendingAction.playerId === myPlayerId) {
      const validTargets = LocalState.players.filter(
        (player) =>
          pendingAction.validTargetIds && pendingAction.validTargetIds.includes(player.id),
      );
      openModal(pendingAction.cardType || "bang", validTargets, (chosenTarget) => {
        sendGameAction({ type: "chooseTarget", targetId: chosenTarget.id });
      });
    }
    if (pendingAction.kind === "missedAsBang" && pendingAction.playerId === myPlayerId) {
      const validTargets = LocalState.players.filter(
        (player) =>
          pendingAction.validTargetIds && pendingAction.validTargetIds.includes(player.id),
      );
      openModal("bang", validTargets, (chosenTarget) => {
        sendGameAction({ type: "missedAsBangTarget", targetId: chosenTarget.id });
      });
    }
    if (pendingAction.kind === "storePick" && pendingAction.pickerId === myPlayerId) {
      const storeListEl = document.getElementById("sm-list");
      document.getElementById("sm-desc").textContent = "Escolha uma carta:";
      storeListEl.innerHTML = "";
      (pendingAction.cards || []).forEach((card, cardIndex) => {
        const pickCardButton = document.createElement("button");
        pickCardButton.className = "tbtn";
        pickCardButton.innerHTML = `${card.icon} ${card.label} <span class="td">${card.suit}${card.value}</span>`;
        pickCardButton.onclick = () => {
          document.getElementById("store-modal").classList.remove("open");
          sendGameAction({ type: "storePick", cardIndex });
        };
        storeListEl.appendChild(pickCardButton);
      });
      document.getElementById("store-modal").classList.add("open");
    }
  }

  function onMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === MSG.ERROR) {
      if (typeof toast === "function") toast(message.message || "Erro");
      return;
    }
    if (message.type === MSG.ROOM_UPDATE) {
      sessionToken = message.sessionToken || sessionToken;
      roomId = message.roomId || roomId;
      if (typeof renderLobby === "function") renderLobby(message);
      return;
    }
    if (message.type === MSG.GAME_STATE) {
      mergeSnapshot(message.public, message.private);
      sessionToken = message.sessionToken || sessionToken;
      if (typeof renderGame === "function") renderGame();
      handlePendingModals();
      return;
    }
    if (message.type === MSG.RECONNECTED) {
      roomId = message.roomId || roomId;
      return;
    }
  }

  function connect() {
    if (socket && socket.readyState === 1) return socket;
    const targetUrl = wsUrl();
    console.log("[BangNetwork] connecting to", targetUrl);
    socket = new WebSocket(targetUrl);
    socket.onopen = () => {
      console.log("[BangNetwork] connected");
      if (sessionToken && roomId) {
        send({ type: MSG.RECONNECT, sessionToken, roomId });
      }
    };
    socket.onmessage = onMessage;
    socket.onclose = () => {
      console.warn("[BangNetwork] disconnected, retrying...");
      if (typeof toast === "function") toast("Conexão perdida. Reconectando…");
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 2000);
    };
    socket.onerror = (errorEvent) => {
      console.error("[BangNetwork] websocket error", errorEvent);
    };
    return socket;
  }

  function ensureSend(payload) {
    const activeSocket = connect();
    if (activeSocket.readyState === 1) send(payload);
    else
      activeSocket.addEventListener(
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

  function joinRoom(roomCode, displayName) {
    ensureSend({ type: MSG.JOIN_ROOM, roomId: roomCode.trim(), displayName });
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

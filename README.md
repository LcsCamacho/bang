# BANG! — Jogo de cartas (offline, hotseat e online)

Documentação do que foi implementado: **servidor autoritativo** para partidas em rede, **protocolo WebSocket**, **motor de regras no Node** e **cliente** com modo online e layout inspirado em “mesa + mão própria em destaque”.

---

## Visão geral

| Modo | Descrição | Onde roda a lógica |
|------|-----------|-------------------|
| **Offline** | Você vs bots | No navegador (`bang-engine.js` + bots/UI) |
| **Hotseat** | Vários jogadores no mesmo aparelho | No navegador (`bang-engine.js` + bots/UI) |
| **Online** | Jogadores em rede | **Servidor** (`server/game/engine.js`) — o cliente só aplica snapshots e envia ações |

No **online**, o servidor é a fonte da verdade: baralho, mãos, turno e validação de jogadas. Cada cliente recebe apenas **sua mão** (payload privado) e um **estado público** dos demais (contagem de cartas, vida, equipamentos, etc.).

---

## Arquitetura (online)

```
Cliente A ←→ WebSocket ←→ Servidor (Express + ws)
Cliente B ←→              │
                          ├─ Salas (roomId, host, jogadores)
                          └─ Motor Bang (applyAction, applyGameState)
```

Fluxo típico:

1. Conexão WebSocket (mesmo host/porta do HTTP).
2. **Lobby:** `createRoom` / `joinRoom` (até 7 jogadores), `roomUpdate` com lista e `sessionToken` por jogador.
3. Host envia `startGame` (mínimo 4 jogadores).
4. **Partida:** `gameAction` com `{ type, ... }` (ex.: `draw`, `playCard`, `chooseTarget`, `storePick`).
5. Servidor responde com `gameState` (público + privado por socket) ou `error` (toast no cliente).

---

## Estrutura de pastas (relevante)

```
Bang/
├── bang.html          # Telas: menu, offline, hotseat, online (lobby), jogo
├── bang.css           # Layout da mesa, oponentes, mão (hand-dock), etc.
├── bang-nav.js        # Navegação entre telas (`goTo`)
├── bang-data.js       # Constantes e tabelas (cartas, personagens, limites)
├── bang-engine.js     # Estado local, turno, jogadas, combate, loja (offline/hotseat)
├── bang-bots.js       # IA dos bots
├── bang-ui.js         # Render, modal, log/toast, lobby online
├── bang-network.js    # WebSocket, merge de snapshot, envio de ações
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── index.js       # HTTP estático (raiz do repo) + WebSocketServer
│   ├── rooms.js       # Salas, host, startGame, broadcast de estado
│   ├── protocol.js    # Nomes de mensagens / contrato (comentários)
│   └── game/
│       ├── constants.js
│       ├── engine.js  # Motor (regras espelhadas de bang-engine.js)
│       ├── snapshot.js
│       └── engine.test.js
```

Os arquivos estáticos (`bang.html`, `bang.css`, `bang-*.js`) são servidos a partir da **raiz do repositório** (não há pasta `public/` obrigatória).

---

## Como rodar o servidor

```bash
cd server
npm install
cp .env.example .env   # opcional: ajustar PORT
npm start
```

Por padrão: **http://localhost:3000/** (redireciona para o jogo conforme `index.js`).

- **`PORT`** — porta HTTP + WebSocket (mesmo servidor).
- **`CORS_ORIGIN`** — opcional; se vazio, o servidor reflete o `Origin` do request.

### Testes do motor (servidor)

```bash
cd server
npm test
```

Cobre cenários mínimos: iniciar partida, comprar, BANG com alvo, Loja Geral com ordem de escolha.

---

## Protocolo de mensagens (resumo)

Definições e comentários em `server/protocol.js`. Tipos usados na prática:

| Direção | Tipo | Função |
|---------|------|--------|
| C→S | `createRoom`, `joinRoom`, `leaveRoom` | Lobby |
| C→S | `startGame` | Apenas host |
| C→S | `gameAction` | `{ action: { type, ... } }` |
| C→S | `reconnect` | `sessionToken` + `roomId` (reconexão) |
| C→S | `ping` | Ping |
| S→C | `roomUpdate` | Sala, jogadores, `youAreHost`, `sessionToken` |
| S→C | `gameState` | `public` + `private` (mão só do destinatário) |
| S→C | `error` | Mensagem para toast |
| S→C | `pong`, `reconnected` | Auxiliares |

Ações de jogo (`gameAction.action`) incluem, entre outras: `draw`, `endPlay`, `discard`, `endDiscard`, `playCard`, `chooseTarget`, `missedAsBangTarget`, `storePick`, `sidKetchum`.

O **turno** no servidor usa `player.id` (0…n−1) e o índice `current` na mesa; **não** confundir índice do array com `playerId` nas validações.

---

## Motor no servidor (`server/game/engine.js`)

- Estado de jogo completo (baralho, descarte, fases, loja com `pending`, alvos com `pending`, etc.).
- **`applyAction(playerId, action)`** — único ponto de entrada para jogadas.
- **Loja Geral:** `pending` com `kind: 'storePick'`, `pickerId` (id do jogador), `cards`; cada escolha avança a ordem até esgotar.

---

## Cliente (`bang-nav.js` … `bang-ui.js` + `bang-network.js`)

- **`LocalState.mode === 'online'`** — não muta estado local como no offline; atualiza a partir de `gameState`.
- **`BangNetwork.mergeSnapshot`** — monta `LocalState` a partir de `public` + `private` (mão real só para o jogador local).
- Botões/ações do turno (`playCard`, `draw`, `endPlay`, `discard`, etc.) no online chamam **`BangNetwork.sendGameAction`**.
- Modais de **alvo** e **Loja Geral** são abertos quando o snapshot traz `pending` para o seu `playerId`.

---

## Layout (referência “Hearthstone”)

- **Oponentes** (`#opponents-ring`): cartas/resumo sem revelar a mão alheia.
- **Mesa central** (`#pgrid`): cartas dos jogadores.
- **Mão** (`#hand-dock` / `.hand-area`): fan com hover; só o jogador local vê as faces das cartas da própria mão no seu turno.
- **Sidebar:** turno, baralho, log.

---

## Reconexão e desconexão

- Cada jogador recebe um **`sessionToken`** no `roomUpdate`.
- Com partida **já iniciada**, desconectar **não** remove o jogador da sala imediatamente (permite reassumir com `reconnect`).
- No lobby (partida não iniciada), a desconexão remove a sala como antes.

---

## Problemas comuns

- **404 em recursos** — abrir o jogo pela mesma origem do servidor (ex.: `http://localhost:3000/bang.html` ou `/`), não misturar `file://` com `ws://localhost`.
- **`LocalState.createGameState is not a function`** — no offline/hotseat, `createGameState` deve ser função global (carregada com `bang-engine.js`); não deve ser anexada por engano a `LocalState`.

---

## Referência de planejamento

O plano original (fases 0–6) está descrito em um arquivo de plano no Cursor; este README descreve o **estado implementado** no repositório, sem substituir esse plano.

---

*Última atualização da documentação: alinhada ao código em `server/`, `bang-*.js`, `bang-network.js`, `bang.html` e `bang.css`.*

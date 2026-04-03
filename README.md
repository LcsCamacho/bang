# BANG! — Jogo de cartas (offline, hotseat e online)

Documentação do que foi implementado: **servidor autoritativo** para partidas em rede, **protocolo WebSocket**, **motor de regras no Node** e **cliente** com modo online e layout inspirado em “mesa + mão própria em destaque”.

---

## Visão geral

| Modo | Descrição | Onde roda a lógica |
|------|-----------|-------------------|
| **Offline** | Você vs bots | No navegador (`bang-engine.js` + bots/UI) |
| **Hotseat** | Vários jogadores no mesmo aparelho | No navegador (`bang-engine.js` + bots/UI) |
| **Online** | Jogadores em rede | **Servidor** (`server/src/game/engine.ts`, compilado em `dist/`) — o cliente só aplica snapshots e envia ações |

No **online**, o servidor é a fonte da verdade: baralho, mãos, turno e validação de jogadas. Cada cliente recebe apenas **sua mão** (payload privado) e um **estado público** dos demais (contagem de cartas, vida, equipamentos, etc.).

---

## Arquitetura (online)

```
Cliente A ←→ WebSocket ←→ Servidor (Express + ws)
Cliente B ←→              │
                          ├─ Salas (roomId, host, jogadores)
                          └─ Motor Bang (`applyAction` via `RoomManager.applyGameAction`)
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
│   ├── tsconfig.json          # Compilação: src/ → dist/
│   ├── tsconfig.scripts.json  # Typecheck dos utilitários em scripts/ (sem emit)
│   ├── .env.example
│   ├── src/                   # Código TypeScript do servidor
│   │   ├── index.ts           # HTTP estático (raiz do repo) + WebSocketServer
│   │   ├── rooms.ts           # Salas, host, startGame, broadcast de estado
│   │   ├── protocol.ts        # Nomes de mensagens / contrato
│   │   └── game/
│   │       ├── types.ts       # Tipos compartilhados (estado, cartas, ações)
│   │       ├── constants.ts
│   │       ├── engine.ts      # Motor (regras espelhadas de bang-engine.js)
│   │       ├── snapshot.ts
│   │       └── engine.test.ts
│   ├── scripts/
│   │   └── generate-engine-fragment.ts  # Gera game/_engine_fragment.js a partir de bang-engine.js
│   ├── game/
│   │   └── _engine_fragment.js            # Saída gerada (referência / diff com engine.ts)
│   └── dist/                  # JavaScript emitido pelo tsc (ignorado no git)
```

Os arquivos estáticos (`bang.html`, `bang.css`, `bang-*.js`) são servidos a partir da **raiz do repositório** (não há pasta `public/` obrigatória).

---

## Como rodar o servidor

O servidor está em **TypeScript** (`server/src/`). Em produção ou para `npm start`, é preciso **compilar** antes (saída em `server/dist/`).

```bash
cd server
npm install
cp .env.example .env   # opcional: ajustar PORT
npm run build          # tsc → dist/
npm start              # node dist/index.js
```

**Desenvolvimento** (recompila ao salvar, sem precisar rodar `build` manualmente a cada mudança):

```bash
cd server
npm run dev            # tsx watch src/index.ts
```

URL típica com `.env` igual ao `.env.example` (`PORT=3000`): **http://localhost:3000/** (redireciona para o jogo conforme `src/index.ts`). Sem `PORT` definido, o código usa o fallback em `src/index.ts` (atualmente **3777**).

- **`PORT`** — porta HTTP + WebSocket (mesmo servidor).
- **`CORS_ORIGIN`** — opcional; se vazio, o servidor reflete o `Origin` do request.
- **`.env`** — o processo carrega `server/.env` (caminho relativo ao `dist/`: um nível acima, na pasta `server`).

### Scripts npm (`server/package.json`)

| Script | Descrição |
|--------|-----------|
| `npm run build` | Compila `src/` para `dist/` (`tsc`). |
| `npm start` | Sobe o servidor a partir de `dist/index.js` (rode `build` antes). |
| `npm run dev` | `tsx watch src/index.ts` — desenvolvimento com reload. |
| `npm test` | `build` + testes Node em `dist/game/engine.test.js`. |
| `npm run typecheck` | Verifica tipos do app (`tsc`) e de `scripts/` (`tsconfig.scripts.json`). |
| `npm run check:scripts` | Só a checagem de tipos de `scripts/**/*.ts`. |
| `npm run gen:fragment` | Regenera `server/game/_engine_fragment.js` a partir da raiz `bang-engine.js`. |

A pasta **`server/dist/`** está no `.gitignore`; em clone limpo, use `npm run build` (ou `npm test`, que já compila).

### Testes do motor (servidor)

```bash
cd server
npm test
```

Cobre cenários mínimos: iniciar partida, comprar, BANG com alvo, Loja Geral com ordem de escolha. Os testes vivem em **`src/game/engine.test.ts`** e são executados após o build, em **`dist/game/engine.test.js`**.

---

## Protocolo de mensagens (resumo)

Definições e comentários em `server/src/protocol.ts`. Tipos usados na prática:

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

## Motor no servidor (`server/src/game/engine.ts`)

- Estado de jogo completo (baralho, descarte, fases, loja com `pending`, alvos com `pending`, etc.).
- **`applyAction(playerId, action)`** — único ponto de entrada para jogadas.
- **Loja Geral:** `pending` com `kind: 'storePick'`, `pickerId` (id do jogador), `cards`; cada escolha avança a ordem até esgotar.

### Fragmento de referência (`server/game/_engine_fragment.js`)

Arquivo **gerado**, não editado à mão: espelha trechos de `bang-engine.js` adaptados ao estilo do servidor (prelúdio com `addLog` / `toast`, remoção de UI/offline). Para atualizar após mudanças grandes no motor do cliente:

```bash
cd server
npm run gen:fragment
```

O diff entre esse fragmento e `src/game/engine.ts` ajuda a manter regras alinhadas entre cliente offline e servidor autoritativo.

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

*Última atualização da documentação: servidor em TypeScript (`server/src/`, build `dist/`), scripts `gen:fragment` / `typecheck`, cliente em `bang-*.js`, `bang-network.js`, `bang.html` e `bang.css`.*

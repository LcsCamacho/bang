/** Carta no baralho / mão (campos opcionais conforme tipo). */
export interface Card {
  type: string;
  label?: string;
  icon?: string;
  suit?: string;
  value?: string;
  weaponKey?: string;
}

export interface CharDef {
  name: string;
  ability: string;
  desc: string;
  life: number;
}

export interface Equipment {
  weaponKey: string;
  barrel: boolean;
  mustang: boolean;
  scope: boolean;
}

export interface Player {
  id: number;
  name: string;
  role: string;
  char: CharDef;
  life: number;
  maxLife: number;
  hand: Card[];
  equipment: Equipment;
  alive: boolean;
  jailed: boolean;
  hasDynamite: boolean;
  usedBang: boolean;
  isBot: boolean;
  difficulty: string | null;
}

export type GamePending =
  | {
      kind: "chooseTarget";
      playerId: number;
      cardIndex: number;
      cardType: string;
      validTargetIds: number[];
    }
  | {
      kind: "missedAsBang";
      playerId: number;
      cardIndex: number;
      validTargetIds: number[];
    }
  | {
      kind: "storePick";
      pickerId: number;
      cards: Card[];
    };

export interface WinInfo {
  icon: string;
  title: string;
  desc: string;
}

export interface GameState {
  players: Player[];
  mode: string;
  drawPile: Card[];
  discardPile: Card[];
  current: number;
  phase: string;
  log: { msg: string; type?: string }[];
  gameOver: boolean;
  pendingCard: Card | null;
  pendingIdx: number | null;
  storeCards: Card[];
  storeOrder: number[];
  storePick: number;
  pending: GamePending | null;
  lastToast: string | null;
  winInfo: WinInfo | null;
}

/** Ações enviadas pelo cliente WebSocket. */
export type ClientGameAction =
  | { type: "draw" }
  | { type: "endPlay" }
  | { type: "discard"; index: number }
  | { type: "endDiscard" }
  | { type: "playCard"; index: number }
  | { type: "chooseTarget"; targetId: number }
  | { type: "missedAsBangTarget"; targetId: number }
  | { type: "storePick"; cardIndex: number }
  | { type: "sidKetchum" };

/** Resultado de `applyAction` / jogadas no motor (formato histórico do protocolo). */
export type ApplyResult = {
  ok?: boolean;
  pending?: boolean;
  error?: string | null;
};

export interface CardActionContext {
  player: Player;
  cardIndex: number;
  card: Card;
  target: Player | null;
  type: string;
}

export type CardType = 'GREEN' | 'RED';
export type ItemType = 'Apples' | 'Cheese' | 'Bread' | 'Silk' | 'Treasure';
export type Avatar = 'Owl' | 'Fox' | 'Bear' | 'Rabbit';
export type GamePhase = 'LOBBY' | 'DEAL' | 'DRAW' | 'BAG_SUBMIT' | 'INSPECT_QUEUE' | 'GAME_OVER';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  subType: ItemType;
  pointValue: number;
  penaltyValue: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: Avatar;
  gold: number;
  hand: Card[];
  marketStand: Card[];
  vault: Card[];
  isSheriff: boolean;
}

export interface Bribe {
  fromPlayerId: string;
  offerGold: number;
  demandGold: number;
}

export interface GameState {
  roomCode: string;
  maxRounds: number;
  currentRound: number;
  sheriffIndex: number;
  phase: GamePhase;
  players: Player[];
  deck: Card[];
  leftDiscard: Card[];
  rightDiscard: Card[];
  inspectionQueue: string[];
  currentBribe: Bribe | null;
}

export interface ScoreRow {
  playerId: string;
  name: string;
  avatar: Avatar;
  gold: number;
  greenPoints: number;
  redPoints: number;
  total: number;
}

export interface InspectionResolution {
  id: number;
  kind: 'PASS' | 'INSPECT_HONEST' | 'INSPECT_LIAR';
  merchantId: string;
  sheriffId: string;
  declaration: ItemType;
  cards: Card[];
  discardPile: DiscardPile | null;
}

export interface ClientGameState extends GameState {
  hostPlayerId: string;
  youPlayerId: string;
  drawCompletedPlayerIds: string[];
  drawPreparedPlayerIds: string[];
  dealPlayerIds: string[];
  activeDrawPlayerId?: string | null;
  submittedPlayerIds: string[];
  bagCounts: Record<string, number>;
  declarations: Record<string, ItemType>;
  activeInspectionPlayerId: string | null;
  inspectionResolution: InspectionResolution | null;
  scores: ScoreRow[];
  lastEvent: string;
}

export type DrawSource = 'DECK' | 'LEFT' | 'RIGHT';
export type DiscardPile = 'LEFT' | 'RIGHT';

export interface ServerError { message: string }

import { randomUUID } from 'node:crypto';
import type {
  Avatar, Card, ClientGameState, DiscardPile, DrawSource, GameState, InspectionResolution, ItemType, Player, ScoreRow,
} from '../shared/types.js';

export interface Room {
  hostPlayerId: string;
  state: GameState;
  drawCompleted: Set<string>;
  drawPrepared: Set<string>;
  dealPlayers: Set<string>;
  bags: Map<string, Card[]>;
  declarations: Map<string, ItemType>;
  inspectionResolution: InspectionResolution | null;
  nextResolutionId: number;
  lastEvent: string;
}

const AVATARS: Avatar[] = ['Owl', 'Fox', 'Bear', 'Rabbit'];
const goods: Array<[ItemType, 'GREEN' | 'RED', number, number, number]> = [
  ['Apples', 'GREEN', 2, 2, 18],
  ['Cheese', 'GREEN', 3, 2, 14],
  ['Bread', 'GREEN', 3, 2, 14],
  ['Silk', 'RED', 6, 4, 10],
  ['Treasure', 'RED', 9, 6, 8],
];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const [subType, type, pointValue, penaltyValue, count] of goods) {
    for (let i = 0; i < count; i += 1) {
      cards.push({
        id: `${subType.toLowerCase()}-${i}-${randomUUID().slice(0, 8)}`,
        name: subType === 'Treasure' ? 'Royal Treasure' : subType,
        type,
        subType,
        pointValue,
        penaltyValue,
      });
    }
  }
  return shuffle(cards);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function drawOne(room: Room, source: DrawSource): Card | undefined {
  const state = room.state;
  if (source === 'LEFT') return state.leftDiscard.pop();
  if (source === 'RIGHT') return state.rightDiscard.pop();
  if (!state.deck.length) {
    const recyclable = [...state.leftDiscard.splice(0), ...state.rightDiscard.splice(0)];
    state.deck.push(...shuffle(recyclable));
  }
  return state.deck.pop();
}

function activeMerchants(room: Room): Player[] {
  return room.state.players.filter((player) => !player.isSheriff);
}

export function createRoom(roomCode: string, hostId: string, hostName: string, avatar: Avatar, maxRounds = 4): Room {
  return {
    hostPlayerId: hostId,
    state: {
      roomCode,
      maxRounds: Math.min(8, Math.max(1, maxRounds)),
      currentRound: 0,
      sheriffIndex: 0,
      phase: 'LOBBY',
      players: [{ id: hostId, name: hostName, avatar, gold: 50, hand: [], marketStand: [], vault: [], isSheriff: true }],
      deck: [], leftDiscard: [], rightDiscard: [], inspectionQueue: [], currentBribe: null,
    },
    drawCompleted: new Set(), drawPrepared: new Set(), dealPlayers: new Set(), bags: new Map(), declarations: new Map(), inspectionResolution: null, nextResolutionId: 0, lastEvent: `${hostName} opened the market`,
  };
}

export function addPlayer(room: Room, id: string, name: string, requestedAvatar?: Avatar): Player {
  assert(room.state.phase === 'LOBBY', 'The game has already started');
  assert(room.state.players.length < 5, 'This room is full');
  const avatar = requestedAvatar && !room.state.players.some((p) => p.avatar === requestedAvatar)
    ? requestedAvatar
    : AVATARS.find((candidate) => !room.state.players.some((p) => p.avatar === candidate)) ?? 'Owl';
  const player: Player = { id, name: name.trim().slice(0, 18) || 'Merchant', avatar, gold: 50, hand: [], marketStand: [], vault: [], isSheriff: false };
  room.state.players.push(player);
  room.lastEvent = `${player.name} joined the market`;
  return player;
}

export function startGame(room: Room, playerId: string): void {
  assert(playerId === room.hostPlayerId, 'Only the host can start the game');
  assert(room.state.phase === 'LOBBY', 'The game is already underway');
  assert(room.state.players.length >= 3, 'At least 3 players are required');
  room.state.deck = createDeck();
  room.state.currentRound = 1;
  room.state.phase = 'DEAL';
  room.state.players.forEach((player, index) => {
    player.gold = 50; player.hand = []; player.marketStand = []; player.vault = []; player.isSheriff = index === 0;
  });
  room.drawCompleted.clear(); room.drawPrepared.clear(); room.dealPlayers = new Set(room.state.players.map((player) => player.id)); room.bags.clear(); room.declarations.clear();
  room.inspectionResolution = null; room.nextResolutionId = 0;
  room.lastEvent = 'Draw opening cards from the Royal Deck';
}

export function drawDealCard(room: Room, playerId: string): void {
  assert(room.state.phase === 'DEAL', 'It is not the deal phase');
  assert(room.dealPlayers.has(playerId), 'You are not drawing in this deal');
  const player = room.state.players.find((candidate) => candidate.id === playerId)!;
  assert(player.hand.length < 6, 'Your hand is already full');
  const card = drawOne(room, 'DECK');
  assert(card, 'No cards are available to draw');
  player.hand.push(card);
  room.lastEvent = `${player.name} drew a card · ${player.hand.length}/6`;
  if (player.hand.length === 6) room.dealPlayers.delete(playerId);
  if (!room.dealPlayers.size) {
    room.state.phase = 'DRAW';
    room.lastEvent = room.state.currentRound === 1 ? 'Opening hands ready · merchants may trade' : 'The Sheriff is ready · merchants may trade';
  }
}

function finishMerchantDraw(room: Room, player: Player): void {
  room.drawCompleted.add(player.id);
  room.lastEvent = `${player.name} finished trading`;
  if (activeMerchants(room).every((merchant) => room.drawCompleted.has(merchant.id))) {
    room.state.phase = 'BAG_SUBMIT';
    room.lastEvent = 'Merchants are packing their bags';
  }
}

export function tradeCards(room: Room, playerId: string, cardIds: string[], discardPile: DiscardPile): void {
  assert(room.state.phase === 'DRAW', 'It is not the draw phase');
  const player = room.state.players.find((p) => p.id === playerId);
  assert(player && !player.isSheriff, 'Only active merchants draw cards');
  assert(!room.drawCompleted.has(playerId), 'You already completed your draw');
  assert(!room.drawPrepared.has(playerId), 'You already traded cards this round');
  const unique = [...new Set(cardIds)];
  assert(unique.length <= 5, 'Select at most 5 cards to trade');
  assert(unique.length > 0 || player.hand.length < 6, 'Select cards to trade, or skip with a full hand');
  assert(unique.every((id) => player.hand.some((card) => card.id === id)), 'A selected card is not in your hand');
  const discarded = player.hand.filter((card) => unique.includes(card.id));
  player.hand = player.hand.filter((card) => !unique.includes(card.id));
  (discardPile === 'LEFT' ? room.state.leftDiscard : room.state.rightDiscard).push(...discarded);
  room.drawPrepared.add(playerId);
  room.lastEvent = `${player.name} traded ${discarded.length} card${discarded.length === 1 ? '' : 's'}`;
}

export function drawCard(room: Room, playerId: string, source: DrawSource): void {
  assert(room.state.phase === 'DRAW', 'It is not the draw phase');
  const player = room.state.players.find((p) => p.id === playerId);
  assert(player && !player.isSheriff, 'Only active merchants draw cards');
  assert(room.drawPrepared.has(playerId), 'Trade cards before drawing, or skip with a full hand');
  assert(!room.drawCompleted.has(playerId), 'You already completed your draw');
  assert(player.hand.length < 6, 'Your hand is already full');
  const card = drawOne(room, source) ?? drawOne(room, 'DECK');
  assert(card, 'No cards are available to draw');
  player.hand.push(card);
  room.lastEvent = `${player.name} drew one card`;
  if (player.hand.length === 6) finishMerchantDraw(room, player);
}

export function skipDraw(room: Room, playerId: string): void {
  assert(room.state.phase === 'DRAW', 'It is not the draw phase');
  const player = room.state.players.find((p) => p.id === playerId);
  assert(player && !player.isSheriff, 'Only active merchants can skip');
  assert(!room.drawCompleted.has(playerId), 'You already completed your draw');
  assert(!room.drawPrepared.has(playerId), 'Finish drawing back to 6 cards');
  assert(player.hand.length === 6, 'You can skip only with 6 cards');
  room.lastEvent = `${player.name} kept their hand`;
  finishMerchantDraw(room, player);
}

// Backward-compatible batch action for existing integrations.
export function completeDraw(room: Room, playerId: string, cardIds: string[], source: DrawSource, discardPile: DiscardPile): void {
  if (!cardIds.length) { skipDraw(room, playerId); return; }
  tradeCards(room, playerId, cardIds, discardPile);
  const player = room.state.players.find((candidate) => candidate.id === playerId)!;
  while (!room.drawCompleted.has(playerId) && player.hand.length < 6) drawCard(room, playerId, source);
}

export function submitBag(room: Room, playerId: string, cardIds: string[], declaration: ItemType): void {
  assert(room.state.phase === 'BAG_SUBMIT', 'It is not time to submit bags');
  const player = room.state.players.find((p) => p.id === playerId);
  assert(player && !player.isSheriff, 'The Sheriff does not submit a bag');
  assert(!room.bags.has(playerId), 'Your bag is already in the queue');
  const unique = [...new Set(cardIds)];
  assert(unique.length >= 1 && unique.length <= 5, 'A bag must contain 1–5 cards');
  assert(unique.every((id) => player.hand.some((card) => card.id === id)), 'A selected card is not in your hand');
  const cards = player.hand.filter((card) => unique.includes(card.id));
  const greenTypes = new Set(cards.filter((card) => card.type === 'GREEN').map((card) => card.subType));
  assert(greenTypes.size <= 1, 'Legal goods in one bag must be a single item type');
  player.hand = player.hand.filter((card) => !unique.includes(card.id));
  room.bags.set(playerId, cards); room.declarations.set(playerId, declaration);
  room.lastEvent = `${player.name} handed over a sealed bag`;
  if (activeMerchants(room).every((merchant) => room.bags.has(merchant.id))) {
    const count = room.state.players.length;
    const queue: string[] = [];
    for (let offset = 1; offset < count; offset += 1) {
      const playerAt = room.state.players[(room.state.sheriffIndex + offset) % count];
      if (!playerAt.isSheriff) queue.push(playerAt.id);
    }
    room.state.inspectionQueue = queue;
    room.state.phase = 'INSPECT_QUEUE';
    setBribeForActive(room);
  }
}

function setBribeForActive(room: Room): void {
  const active = room.state.inspectionQueue[0];
  room.state.currentBribe = active ? { fromPlayerId: active, offerGold: 0, demandGold: 0 } : null;
  const merchant = room.state.players.find((p) => p.id === active);
  if (merchant) room.lastEvent = `${merchant.name} faces the Sheriff`;
}

export function updateBribe(room: Room, playerId: string, amount: number): void {
  assert(room.state.phase === 'INSPECT_QUEUE' && room.state.currentBribe, 'No negotiation is active');
  const bribe = room.state.currentBribe;
  const sheriff = room.state.players[room.state.sheriffIndex];
  const merchant = room.state.players.find((p) => p.id === bribe.fromPlayerId)!;
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  if (playerId === merchant.id) bribe.offerGold = Math.min(safeAmount, Math.max(0, merchant.gold));
  else if (playerId === sheriff.id) bribe.demandGold = Math.min(safeAmount, Math.max(0, merchant.gold));
  else throw new Error('Only this merchant and the Sheriff may negotiate');
  room.lastEvent = `${playerId === sheriff.id ? sheriff.name : merchant.name} adjusted the offer`;
}

function finishInspection(room: Room): void {
  room.state.inspectionQueue.shift();
  if (room.state.inspectionQueue.length) { setBribeForActive(room); return; }
  if (room.state.currentRound >= room.state.maxRounds) {
    room.state.phase = 'GAME_OVER'; room.state.currentBribe = null; room.lastEvent = 'The market is closed — final scores are in'; return;
  }
  room.state.currentRound += 1;
  room.state.sheriffIndex = (room.state.sheriffIndex + 1) % room.state.players.length;
  room.state.players.forEach((player, index) => { player.isSheriff = index === room.state.sheriffIndex; });
  const nextSheriff = room.state.players[room.state.sheriffIndex];
  room.state.currentBribe = null; room.drawCompleted.clear(); room.drawPrepared.clear(); room.bags.clear(); room.declarations.clear();
  room.dealPlayers.clear();
  if (nextSheriff.hand.length < 6) {
    room.state.phase = 'DEAL';
    room.dealPlayers.add(nextSheriff.id);
    room.lastEvent = `${nextSheriff.name} must refill the Sheriff’s hand · ${nextSheriff.hand.length}/6`;
  } else {
    room.state.phase = 'DRAW';
    room.lastEvent = `${nextSheriff.name} is the new Sheriff`;
  }
}

export function passBag(room: Room, sheriffId: string): void {
  const sheriff = room.state.players[room.state.sheriffIndex];
  assert(room.state.phase === 'INSPECT_QUEUE' && sheriff?.id === sheriffId, 'Only the Sheriff can pass a bag');
  const merchantId = room.state.inspectionQueue[0];
  const merchant = room.state.players.find((p) => p.id === merchantId)!;
  const cards = room.bags.get(merchantId) ?? [];
  const bribe = room.state.currentBribe!;
  const agreed = bribe.offerGold === bribe.demandGold ? bribe.offerGold : 0;
  merchant.gold -= agreed; sheriff.gold += agreed;
  merchant.marketStand.push(...cards.filter((card) => card.type === 'GREEN'));
  merchant.vault.push(...cards.filter((card) => card.type === 'RED'));
  room.inspectionResolution = { id: ++room.nextResolutionId, kind: 'PASS', merchantId, sheriffId, declaration: room.declarations.get(merchantId) ?? 'Apples', cards: structuredClone(cards), discardPile: null };
  room.bags.delete(merchantId);
  room.lastEvent = `${sheriff.name} passed ${merchant.name}'s bag${agreed ? ` for ${agreed} gold` : ''}`;
  finishInspection(room);
}

export function inspectBag(room: Room, sheriffId: string, pile: DiscardPile): void {
  const sheriff = room.state.players[room.state.sheriffIndex];
  assert(room.state.phase === 'INSPECT_QUEUE' && sheriff?.id === sheriffId, 'Only the Sheriff can inspect a bag');
  const merchantId = room.state.inspectionQueue[0];
  const merchant = room.state.players.find((p) => p.id === merchantId)!;
  const cards = room.bags.get(merchantId) ?? [];
  const declaration = room.declarations.get(merchantId);
  const honest = cards.every((card) => card.type === 'GREEN' && card.subType === declaration);
  const penalty = cards.reduce((sum, card) => sum + card.penaltyValue, 0);
  room.inspectionResolution = { id: ++room.nextResolutionId, kind: honest ? 'INSPECT_HONEST' : 'INSPECT_LIAR', merchantId, sheriffId, declaration: declaration ?? 'Apples', cards: structuredClone(cards), discardPile: honest ? null : pile };
  if (honest) {
    sheriff.gold -= penalty; merchant.gold += penalty; merchant.marketStand.push(...cards);
    room.lastEvent = `${merchant.name} was honest — the Sheriff paid ${penalty} gold`;
  } else {
    merchant.gold -= penalty; sheriff.gold += penalty;
    (pile === 'LEFT' ? room.state.leftDiscard : room.state.rightDiscard).push(...cards);
    room.lastEvent = `${merchant.name} was caught — ${penalty} gold penalty`;
  }
  room.bags.delete(merchantId);
  finishInspection(room);
}

export function scores(room: Room): ScoreRow[] {
  return room.state.players.map((player) => {
    const greenPoints = player.marketStand.reduce((sum, card) => sum + card.pointValue, 0);
    const redPoints = player.vault.reduce((sum, card) => sum + card.pointValue, 0);
    return { playerId: player.id, name: player.name, avatar: player.avatar, gold: player.gold, greenPoints, redPoints, total: player.gold + greenPoints + redPoints };
  }).sort((a, b) => b.total - a.total || b.gold - a.gold);
}

export function resetGame(room: Room, playerId: string): void {
  assert(playerId === room.hostPlayerId, 'Only the host can play again');
  room.state.phase = 'LOBBY'; room.state.currentRound = 0; room.state.sheriffIndex = 0;
  room.state.deck = []; room.state.leftDiscard = []; room.state.rightDiscard = []; room.state.inspectionQueue = []; room.state.currentBribe = null;
  room.state.players.forEach((player, index) => { player.gold = 50; player.hand = []; player.marketStand = []; player.vault = []; player.isSheriff = index === 0; });
  room.drawCompleted.clear(); room.drawPrepared.clear(); room.dealPlayers.clear(); room.bags.clear(); room.declarations.clear(); room.inspectionResolution = null; room.nextResolutionId = 0; room.lastEvent = 'The market is ready for another game';
}

export function clientState(room: Room, viewerId: string): ClientGameState {
  const state = structuredClone(room.state);
  const hiddenCard = (card: Card, index: number, label: string): Card => ({
    ...card, id: `${label}-${index}`, name: label, type: 'GREEN', subType: 'Apples', pointValue: 0, penaltyValue: 0,
  });
  state.deck = state.deck.map((card, index) => hiddenCard(card, index, 'Deck card'));
  state.players.forEach((player) => {
    if (player.id !== viewerId) player.hand = player.hand.map((card, index) => hiddenCard(card, index, 'Hidden'));
    if (player.id !== viewerId && room.state.phase !== 'GAME_OVER') player.vault = player.vault.map((card, index) => hiddenCard(card, index, 'Contraband'));
  });
  const inspectionResolution = structuredClone(room.inspectionResolution);
  if (inspectionResolution?.kind === 'PASS') {
    inspectionResolution.cards = inspectionResolution.cards.map((card, index) => card.type === 'RED' ? { ...card, id: `Sealed-${index}`, name: 'Sealed card', subType: 'Apples', pointValue: 0, penaltyValue: 0 } : card);
  }
  return {
    ...state,
    hostPlayerId: room.hostPlayerId,
    youPlayerId: viewerId,
    drawCompletedPlayerIds: [...room.drawCompleted],
    drawPreparedPlayerIds: [...room.drawPrepared],
    dealPlayerIds: [...room.dealPlayers],
    submittedPlayerIds: [...room.bags.keys()],
    bagCounts: Object.fromEntries([...room.bags].map(([id, cards]) => [id, cards.length])),
    declarations: Object.fromEntries(room.declarations),
    activeInspectionPlayerId: room.state.inspectionQueue[0] ?? null,
    inspectionResolution,
    scores: room.state.phase === 'GAME_OVER' ? scores(room) : [],
    lastEvent: room.lastEvent,
  };
}

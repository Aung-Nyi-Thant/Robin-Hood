import type { Card, ItemType } from '../shared/types.js';
import { addPlayer, completeDraw, createRoom, drawDealCard, startGame, type Room } from './gameEngine.js';

export const green = (id: string, subType: Extract<ItemType, 'Apples' | 'Cheese' | 'Bread'> = 'Apples', pointValue = 3, penaltyValue = 2): Card => ({
  id, name: subType, type: 'GREEN', subType, pointValue, penaltyValue,
});

export const red = (id: string, subType: Extract<ItemType, 'Silk' | 'Treasure'> = 'Silk', pointValue = 6, penaltyValue = 4): Card => ({
  id, name: subType === 'Treasure' ? 'Royal Treasure' : subType, type: 'RED', subType, pointValue, penaltyValue,
});

export function openingRoom(maxRounds = 2): Room {
  const room = createRoom('TEST', 'p1', 'Ada', 'Owl', maxRounds);
  addPlayer(room, 'p2', 'Bea', 'Fox');
  addPlayer(room, 'p3', 'Cal', 'Bear');
  startGame(room, 'p1');
  return room;
}

export function startedRoom(maxRounds = 2): Room {
  const room = openingRoom(maxRounds);
  for (const player of room.state.players) {
    while (player.hand.length < 6) drawDealCard(room, player.id);
  }
  return room;
}

export function bagPhaseRoom(maxRounds = 2): Room {
  const room = startedRoom(maxRounds);
  for (const merchant of room.state.players.filter((player) => !player.isSheriff)) {
    completeDraw(room, merchant.id, [], 'DECK', 'LEFT');
  }
  return room;
}

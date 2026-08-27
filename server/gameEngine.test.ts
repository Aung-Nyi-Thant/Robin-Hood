import test from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '../shared/types.js';
import {
  addPlayer, clientState, completeDraw, createRoom, drawCard, drawDealCard, inspectBag, passBag, scores, skipDraw, startGame, submitBag, tradeCards, updateBribe,
} from './gameEngine.js';

const green = (id: string, subType: 'Apples' | 'Cheese' = 'Apples'): Card => ({ id, name: subType, type: 'GREEN', subType, pointValue: 3, penaltyValue: 2 });
const red = (id: string): Card => ({ id, name: 'Silk', type: 'RED', subType: 'Silk', pointValue: 6, penaltyValue: 4 });

function roomAtOpeningDeal(maxRounds = 2) {
  const room = createRoom('TEST', 'p1', 'Ada', 'Owl', maxRounds);
  addPlayer(room, 'p2', 'Bea', 'Fox');
  addPlayer(room, 'p3', 'Cal', 'Bear');
  startGame(room, 'p1');
  return room;
}

function started(maxRounds = 2) {
  const room = roomAtOpeningDeal(maxRounds);
  for (const player of room.state.players) {
    while (player.hand.length < 6) drawDealCard(room, player.id);
  }
  return room;
}

test('players build opening hands one card at a time before the draw phase', () => {
  const room = roomAtOpeningDeal();
  assert.equal(room.state.phase, 'DEAL');
  assert.ok(room.state.players.every((player) => player.gold === 50 && player.hand.length === 0));
  drawDealCard(room, 'p1');
  assert.equal(room.state.players[0].hand.length, 1);
  assert.equal(room.state.phase, 'DEAL');
  for (const player of room.state.players) {
    while (player.hand.length < 6) drawDealCard(room, player.id);
  }
  assert.equal(room.state.phase, 'DRAW');
  const view = clientState(room, 'p1');
  assert.ok(view.players[1].hand.every((card) => card.name === 'Hidden' && card.id.startsWith('Hidden-')));
  assert.ok(view.deck.every((card) => card.name === 'Deck card' && card.pointValue === 0));
  completeDraw(room, 'p2', [], 'DECK', 'LEFT');
  assert.equal(room.state.phase, 'DRAW');
  completeDraw(room, 'p3', [], 'DECK', 'RIGHT');
  assert.equal(room.state.phase, 'BAG_SUBMIT');
});

test('the incoming Sheriff refills to six before the next round begins', () => {
  const room = started(2);
  completeDraw(room, 'p2', [], 'DECK', 'LEFT');
  completeDraw(room, 'p3', [], 'DECK', 'RIGHT');
  const p2Card = room.state.players[1].hand[0].id;
  const p3Card = room.state.players[2].hand[0].id;
  submitBag(room, 'p2', [p2Card], room.state.players[1].hand[0].subType);
  submitBag(room, 'p3', [p3Card], room.state.players[2].hand[0].subType);
  passBag(room, 'p1');
  passBag(room, 'p1');
  assert.equal(room.state.currentRound, 2);
  assert.equal(room.state.sheriffIndex, 1);
  assert.equal(room.state.phase, 'DEAL');
  assert.deepEqual([...room.dealPlayers], ['p2']);
  assert.equal(room.state.players[1].hand.length, 5);
  drawDealCard(room, 'p2');
  assert.equal(room.state.players[1].hand.length, 6);
  assert.equal(room.state.phase, 'DRAW');
});

test('merchants trade once, draw one card at a time, or skip with a full hand', () => {
  const room = started(6);
  assert.equal(room.state.maxRounds, 6);
  const merchant = room.state.players[1];
  const tradedIds = merchant.hand.slice(0, 2).map((card) => card.id);
  tradeCards(room, merchant.id, tradedIds, 'LEFT');
  assert.equal(merchant.hand.length, 4);
  assert.ok(room.drawPrepared.has(merchant.id));
  assert.throws(() => skipDraw(room, merchant.id), /Finish drawing back to 6/);
  drawCard(room, merchant.id, 'DECK');
  assert.equal(merchant.hand.length, 5);
  assert.ok(!room.drawCompleted.has(merchant.id));
  drawCard(room, merchant.id, 'RIGHT');
  assert.equal(merchant.hand.length, 6);
  assert.ok(room.drawCompleted.has(merchant.id));
  skipDraw(room, 'p3');
  assert.equal(room.state.phase, 'BAG_SUBMIT');
});

test('bags enforce one legal subtype and queue clockwise left of the Sheriff', () => {
  const room = started();
  completeDraw(room, 'p2', [], 'DECK', 'LEFT'); completeDraw(room, 'p3', [], 'DECK', 'RIGHT');
  room.state.players[1].hand = [green('a'), green('c', 'Cheese')];
  assert.throws(() => submitBag(room, 'p2', ['a', 'c'], 'Apples'), /single item type/);
  room.state.players[1].hand = [green('a'), red('r')];
  room.state.players[2].hand = [green('b')];
  submitBag(room, 'p2', ['a', 'r'], 'Apples'); submitBag(room, 'p3', ['b'], 'Apples');
  assert.equal(room.state.phase, 'INSPECT_QUEUE');
  assert.deepEqual(room.state.inspectionQueue, ['p2', 'p3']);
});

test('matched bribe passes goods, then a lying inspection pays penalties and ends the game', () => {
  const room = started(1);
  completeDraw(room, 'p2', [], 'DECK', 'LEFT'); completeDraw(room, 'p3', [], 'DECK', 'RIGHT');
  room.state.players[1].hand = [green('a'), red('r')]; room.state.players[2].hand = [green('b', 'Cheese')];
  submitBag(room, 'p2', ['a', 'r'], 'Apples'); submitBag(room, 'p3', ['b'], 'Apples');
  updateBribe(room, 'p2', 5); updateBribe(room, 'p1', 5); passBag(room, 'p1');
  assert.equal(room.state.players[0].gold, 55); assert.equal(room.state.players[1].gold, 45);
  assert.equal(room.state.players[1].marketStand.length, 1); assert.equal(room.state.players[1].vault.length, 1);
  assert.equal(room.inspectionResolution?.kind, 'PASS');
  assert.equal(room.inspectionResolution?.merchantId, 'p2');
  const spectatorPass = clientState(room, 'p3').inspectionResolution;
  assert.equal(spectatorPass?.id, room.inspectionResolution?.id);
  assert.equal(spectatorPass?.cards[0].name, 'Apples');
  assert.equal(spectatorPass?.cards[1].name, 'Sealed card');
  inspectBag(room, 'p1', 'RIGHT');
  assert.equal(room.state.phase, 'GAME_OVER');
  assert.equal(room.state.rightDiscard.at(-1)?.id, 'b');
  assert.equal(room.state.players[0].gold, 57); assert.equal(room.state.players[2].gold, 48);
  assert.equal(room.inspectionResolution?.kind, 'INSPECT_LIAR');
  assert.equal(clientState(room, 'p2').inspectionResolution?.cards[0].subType, 'Cheese');
  assert.equal(clientState(room, 'p2').inspectionResolution?.discardPile, 'RIGHT');
  assert.deepEqual(scores(room).map((row) => row.playerId), ['p1', 'p2', 'p3']);
});

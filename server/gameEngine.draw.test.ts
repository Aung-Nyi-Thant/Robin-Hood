import assert from 'node:assert/strict';
import test from 'node:test';
import { clientState, completeDraw, drawCard, skipDraw, tradeCards } from './gameEngine.js';
import { green, startedRoom } from './testHelpers.js';

test('trade validates phase, merchant role, completion, selection size, and ownership', () => {
  const room = startedRoom();
  const merchant = room.state.players[1];
  room.state.phase = 'DEAL';
  assert.throws(() => tradeCards(room, merchant.id, [], 'LEFT'), /not the draw phase/);
  room.state.phase = 'DRAW';
  assert.throws(() => tradeCards(room, 'p1', [], 'LEFT'), /Only active merchants/);
  assert.throws(() => tradeCards(room, merchant.id, [], 'LEFT'), /Select cards to trade/);
  assert.throws(() => tradeCards(room, merchant.id, [...merchant.hand.map((card) => card.id), 'extra'], 'LEFT'), /at most 5/);
  assert.throws(() => tradeCards(room, merchant.id, ['not-owned'], 'LEFT'), /not in your hand/);
  room.drawCompleted.add(merchant.id);
  assert.throws(() => tradeCards(room, merchant.id, [merchant.hand[0].id], 'LEFT'), /already completed/);
});

test('duplicate card ids trade only one card and the chosen pile receives it', () => {
  const room = startedRoom();
  const merchant = room.state.players[1];
  const card = merchant.hand[0];
  tradeCards(room, merchant.id, [card.id, card.id], 'RIGHT');
  assert.equal(merchant.hand.length, 5);
  assert.deepEqual(room.state.rightDiscard.map((item) => item.id), [card.id]);
  assert.throws(() => tradeCards(room, merchant.id, [merchant.hand[0].id], 'LEFT'), /already traded/);
});

test('merchant turns advance clockwise from the player left of the Sheriff', () => {
  const room = startedRoom();
  assert.equal(room.drawQueue[0], 'p2');
  assert.equal(room.state.sheriffIndex, 0);
  assert.throws(() => skipDraw(room, 'p3'), /clockwise draw turn/);
  skipDraw(room, 'p2');
  assert.equal(room.drawQueue[0], 'p3');
  assert.equal(clientState(room, 'p1').activeDrawPlayerId, 'p3');
  skipDraw(room, 'p3');
  assert.equal(room.drawQueue.length, 0);
  assert.equal(room.state.phase, 'BAG_SUBMIT');
});

test('a merchant can draw the visible top card directly from either discard pile', () => {
  const room = startedRoom();
  const merchant = room.state.players[1];
  const leftCard = merchant.hand[0];
  tradeCards(room, merchant.id, [leftCard.id], 'LEFT');
  drawCard(room, merchant.id, 'LEFT');
  assert.equal(merchant.hand.at(-1)?.id, leftCard.id);
  skipDraw(room, 'p3');

  room.state.phase = 'DRAW'; room.drawCompleted.clear(); room.drawPrepared.clear(); room.drawQueue = ['p2', 'p3'];
  const rightCard = merchant.hand[0];
  tradeCards(room, merchant.id, [rightCard.id], 'RIGHT');
  drawCard(room, merchant.id, 'RIGHT');
  assert.equal(merchant.hand.at(-1)?.id, rightCard.id);
});

test('players draw one by one and empty discard sources fall back to the deck', () => {
  const room = startedRoom();
  const merchant = room.state.players[1];
  const removed = merchant.hand[0];
  tradeCards(room, merchant.id, [removed.id], 'LEFT');
  room.state.leftDiscard.length = 0;
  const deckTop = room.state.deck.at(-1)!.id;
  drawCard(room, merchant.id, 'LEFT');
  assert.equal(merchant.hand.at(-1)?.id, deckTop);
  assert.ok(room.drawCompleted.has(merchant.id));
  assert.throws(() => drawCard(room, merchant.id, 'DECK'), /clockwise draw turn/);
});

test('main deck recycles both discard piles when exhausted', () => {
  const room = startedRoom();
  const merchant = room.state.players[1];
  merchant.hand = merchant.hand.slice(0, 5);
  room.drawPrepared.add(merchant.id);
  room.state.deck = [];
  room.state.leftDiscard = [green('left')];
  room.state.rightDiscard = [green('right', 'Cheese')];
  drawCard(room, merchant.id, 'DECK');
  assert.equal(merchant.hand.length, 6);
  assert.equal(room.state.deck.length, 1);
  assert.equal(room.state.leftDiscard.length, 0);
  assert.equal(room.state.rightDiscard.length, 0);
  assert.ok(['left', 'right'].includes(merchant.hand.at(-1)!.id));
});

test('drawing rejects unprepared, Sheriff, full-hand, and unavailable-card attempts', () => {
  const room = startedRoom();
  assert.throws(() => drawCard(room, 'p2', 'DECK'), /Trade cards before drawing/);
  room.drawPrepared.add('p1');
  assert.throws(() => drawCard(room, 'p1', 'DECK'), /Only active merchants/);
  room.drawPrepared.add('p2');
  assert.throws(() => drawCard(room, 'p2', 'DECK'), /already full/);
  const merchant = room.state.players[1];
  merchant.hand.pop(); room.state.deck = []; room.state.leftDiscard = []; room.state.rightDiscard = [];
  assert.throws(() => drawCard(room, merchant.id, 'DECK'), /No cards are available/);
});

test('skip requires an untouched full merchant hand and advances after all merchants finish', () => {
  const room = startedRoom();
  assert.throws(() => skipDraw(room, 'p1'), /Only active merchants/);
  room.state.players[1].hand.pop();
  assert.throws(() => skipDraw(room, 'p2'), /only with 6 cards/);
  room.state.players[1].hand.push(room.state.deck.pop()!);
  skipDraw(room, 'p2');
  assert.throws(() => skipDraw(room, 'p2'), /clockwise draw turn/);
  skipDraw(room, 'p3');
  assert.equal(room.state.phase, 'BAG_SUBMIT');
});

test('backward-compatible completeDraw handles both skip and batch trade/refill', () => {
  const room = startedRoom();
  completeDraw(room, 'p2', [], 'DECK', 'LEFT');
  const merchant = room.state.players[2];
  const ids = merchant.hand.slice(0, 3).map((card) => card.id);
  completeDraw(room, merchant.id, ids, 'DECK', 'RIGHT');
  assert.equal(merchant.hand.length, 6);
  assert.deepEqual(room.state.rightDiscard.map((card) => card.id), ids);
  assert.equal(room.state.phase, 'BAG_SUBMIT');
});

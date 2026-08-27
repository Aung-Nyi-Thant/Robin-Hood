import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectBag, passBag, submitBag, updateBribe } from './gameEngine.js';
import { bagPhaseRoom, green, red } from './testHelpers.js';

function queueBags(maxRounds = 2) {
  const room = bagPhaseRoom(maxRounds);
  room.state.players[1].hand = [green('p2-apple'), red('p2-silk')];
  room.state.players[2].hand = [green('p3-cheese', 'Cheese')];
  submitBag(room, 'p2', ['p2-apple', 'p2-silk'], 'Apples');
  submitBag(room, 'p3', ['p3-cheese'], 'Cheese');
  return room;
}

test('bag submission validates phase, role, size, uniqueness, ownership, and legal goods type', () => {
  const room = bagPhaseRoom();
  const merchant = room.state.players[1];
  assert.throws(() => submitBag(room, 'p1', [room.state.players[0].hand[0].id], 'Apples'), /Sheriff does not submit/);
  assert.throws(() => submitBag(room, merchant.id, [], 'Apples'), /1–5/);
  assert.throws(() => submitBag(room, merchant.id, [...merchant.hand.map((card) => card.id), 'extra'], 'Apples'), /1–5/);
  assert.throws(() => submitBag(room, merchant.id, ['missing'], 'Apples'), /not in your hand/);
  merchant.hand = [green('apple'), green('cheese', 'Cheese'), red('silk'), red('treasure', 'Treasure')];
  assert.throws(() => submitBag(room, merchant.id, ['apple', 'cheese'], 'Apples'), /single item type/);
  submitBag(room, merchant.id, ['apple', 'apple', 'silk', 'treasure'], 'Cheese');
  assert.equal(room.bags.get(merchant.id)?.length, 3);
  assert.equal(room.declarations.get(merchant.id), 'Cheese');
  assert.throws(() => submitBag(room, merchant.id, ['cheese'], 'Cheese'), /already in the queue/);
  room.state.phase = 'DRAW';
  assert.throws(() => submitBag(room, 'p3', ['anything'], 'Apples'), /not time to submit/);
});

test('inspection queue wraps clockwise from the current Sheriff', () => {
  const room = bagPhaseRoom();
  room.state.sheriffIndex = 2;
  room.state.players.forEach((player, index) => { player.isSheriff = index === 2; });
  room.state.players[0].hand = [green('p1')];
  room.state.players[1].hand = [green('p2')];
  submitBag(room, 'p1', ['p1'], 'Apples');
  submitBag(room, 'p2', ['p2'], 'Apples');
  assert.deepEqual(room.state.inspectionQueue, ['p1', 'p2']);
  assert.equal(room.state.currentBribe?.fromPlayerId, 'p1');
});

test('bribes are bidirectional, integer, clamped to merchant gold, and limited to active parties', () => {
  const room = queueBags();
  updateBribe(room, 'p2', 7.9);
  updateBribe(room, 'p1', 999);
  assert.equal(room.state.currentBribe?.offerGold, 7);
  assert.equal(room.state.currentBribe?.demandGold, 50);
  updateBribe(room, 'p2', -4);
  assert.equal(room.state.currentBribe?.offerGold, 0);
  updateBribe(room, 'p2', Number.NaN);
  assert.equal(room.state.currentBribe?.offerGold, 0);
  assert.throws(() => updateBribe(room, 'p3', 3), /Only this merchant/);
  room.state.phase = 'DRAW';
  assert.throws(() => updateBribe(room, 'p2', 3), /No negotiation/);
});

test('a matched bribe transfers gold while a mismatched offer passes for free', () => {
  const room = queueBags();
  updateBribe(room, 'p2', 6); updateBribe(room, 'p1', 6);
  passBag(room, 'p1');
  assert.equal(room.state.players[0].gold, 56);
  assert.equal(room.state.players[1].gold, 44);
  assert.deepEqual(room.state.players[1].marketStand.map((card) => card.id), ['p2-apple']);
  assert.deepEqual(room.state.players[1].vault.map((card) => card.id), ['p2-silk']);
  assert.equal(room.inspectionResolution?.kind, 'PASS');
  assert.equal(room.inspectionResolution?.id, 1);
  updateBribe(room, 'p3', 3); updateBribe(room, 'p1', 4);
  passBag(room, 'p1');
  assert.equal(room.state.players[0].gold, 56);
  assert.equal(room.state.players[2].gold, 50);
  assert.equal(room.inspectionResolution?.id, 2);
});

test('only the Sheriff can pass or inspect the active bag', () => {
  const room = queueBags();
  assert.throws(() => passBag(room, 'p2'), /Only the Sheriff/);
  assert.throws(() => inspectBag(room, 'p3', 'LEFT'), /Only the Sheriff/);
});

test('honest inspection makes Sheriff pay all penalties and places goods face-up', () => {
  const room = bagPhaseRoom(1);
  room.state.players[1].hand = [green('a1', 'Apples', 2, 2), green('a2', 'Apples', 2, 3)];
  room.state.players[2].hand = [green('b', 'Bread')];
  submitBag(room, 'p2', ['a1', 'a2'], 'Apples'); submitBag(room, 'p3', ['b'], 'Cheese');
  inspectBag(room, 'p1', 'LEFT');
  assert.equal(room.inspectionResolution?.kind, 'INSPECT_HONEST');
  assert.equal(room.inspectionResolution?.discardPile, null);
  assert.equal(room.state.players[0].gold, 45);
  assert.equal(room.state.players[1].gold, 55);
  assert.deepEqual(room.state.players[1].marketStand.map((card) => card.id), ['a1', 'a2']);
  assert.equal(room.state.leftDiscard.length, 0);
});

test('lying inspection charges every card penalty and discards the whole bag to the selected pile', () => {
  const room = queueBags(1);
  inspectBag(room, 'p1', 'RIGHT');
  assert.equal(room.inspectionResolution?.kind, 'INSPECT_LIAR');
  assert.equal(room.inspectionResolution?.discardPile, 'RIGHT');
  assert.equal(room.state.players[0].gold, 56);
  assert.equal(room.state.players[1].gold, 44);
  assert.deepEqual(room.state.rightDiscard.map((card) => card.id), ['p2-apple', 'p2-silk']);
  assert.equal(room.state.players[1].marketStand.length + room.state.players[1].vault.length, 0);
});

test('finishing a queue rotates Sheriff and skips refill when the new Sheriff still has six cards', () => {
  const room = queueBags(2);
  room.state.players[1].hand = Array.from({ length: 6 }, (_, index) => green(`reserve-${index}`));
  passBag(room, 'p1');
  passBag(room, 'p1');
  assert.equal(room.state.currentRound, 2);
  assert.equal(room.state.sheriffIndex, 1);
  assert.equal(room.state.players[1].isSheriff, true);
  assert.equal(room.state.phase, 'DRAW');
  assert.equal(room.dealPlayers.size, 0);
  assert.equal(room.bags.size, 0);
  assert.equal(room.declarations.size, 0);
});

test('final inspection ends the configured last round and clears negotiation', () => {
  const room = queueBags(1);
  passBag(room, 'p1'); passBag(room, 'p1');
  assert.equal(room.state.phase, 'GAME_OVER');
  assert.equal(room.state.currentBribe, null);
  assert.equal(room.lastEvent, 'The market is closed — final scores are in');
});

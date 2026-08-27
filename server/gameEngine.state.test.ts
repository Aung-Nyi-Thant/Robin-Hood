import assert from 'node:assert/strict';
import test from 'node:test';
import { clientState, inspectBag, passBag, scores, submitBag, updateBribe } from './gameEngine.js';
import { bagPhaseRoom, green, red, startedRoom } from './testHelpers.js';

test('scores combine gold, legal goods, and secret goods, sorting total then gold', () => {
  const room = startedRoom();
  const [ada, bea, cal] = room.state.players;
  ada.gold = 40; ada.marketStand = [green('a', 'Apples', 5)]; ada.vault = [red('r', 'Silk', 5)];
  bea.gold = 45; bea.marketStand = [green('b', 'Bread', 5)]; bea.vault = [];
  cal.gold = 49; cal.marketStand = [green('c', 'Cheese', 1)]; cal.vault = [];
  const result = scores(room);
  assert.deepEqual(result.map((row) => row.playerId), ['p3', 'p2', 'p1']);
  assert.deepEqual(result.find((row) => row.playerId === 'p1'), { playerId: 'p1', name: 'Ada', avatar: 'Owl', gold: 40, greenPoints: 5, redPoints: 5, total: 50 });
  assert.equal(result[0].total, 50);
  assert.equal(result[0].gold, 49);
});

test('client state hides deck, opponent hands, and opponent vault before game over without mutating server state', () => {
  const room = startedRoom();
  room.state.players[0].vault = [red('own-secret')];
  room.state.players[1].vault = [red('other-secret', 'Treasure')];
  const serverDeckTop = structuredClone(room.state.deck[0]);
  const serverOpponentHand = structuredClone(room.state.players[1].hand[0]);
  const view = clientState(room, 'p1');
  assert.ok(view.deck.every((card) => card.name === 'Deck card' && card.pointValue === 0 && card.penaltyValue === 0));
  assert.ok(view.players[1].hand.every((card) => card.name === 'Hidden' && card.type === 'GREEN' && card.pointValue === 0));
  assert.equal(view.players[0].vault[0].id, 'own-secret');
  assert.equal(view.players[1].vault[0].name, 'Contraband');
  assert.deepEqual(room.state.deck[0], serverDeckTop);
  assert.deepEqual(room.state.players[1].hand[0], serverOpponentHand);
  assert.equal(room.state.players[1].vault[0].id, 'other-secret');
});

test('client state exposes bag counts and declarations but never sealed bag contents', () => {
  const room = bagPhaseRoom();
  room.state.players[1].hand = [green('apple'), red('silk')];
  submitBag(room, 'p2', ['apple', 'silk'], 'Cheese');
  const view = clientState(room, 'p3');
  assert.deepEqual(view.submittedPlayerIds, ['p2']);
  assert.equal(view.bagCounts.p2, 2);
  assert.equal(view.declarations.p2, 'Cheese');
  assert.equal(view.activeInspectionPlayerId, null);
  assert.equal('bags' in view, false);
});

test('passed inspection reveals legal cards but masks red cards for every viewer', () => {
  const room = bagPhaseRoom();
  room.state.players[1].hand = [green('apple'), red('silk')];
  room.state.players[2].hand = [green('cheese', 'Cheese')];
  submitBag(room, 'p2', ['apple', 'silk'], 'Apples'); submitBag(room, 'p3', ['cheese'], 'Cheese');
  passBag(room, 'p1');
  for (const viewer of room.state.players) {
    const resolution = clientState(room, viewer.id).inspectionResolution!;
    assert.equal(resolution.cards[0].id, 'apple');
    assert.equal(resolution.cards[1].name, 'Sealed card');
    assert.equal(resolution.cards[1].pointValue, 0);
  }
  assert.equal(room.inspectionResolution?.cards[1].id, 'silk');
});

test('inspection reveal shows all cards and game over exposes vaults and sorted scores', () => {
  const room = bagPhaseRoom(1);
  room.state.players[1].hand = [red('silk')];
  room.state.players[2].hand = [green('cheese', 'Cheese')];
  submitBag(room, 'p2', ['silk'], 'Apples'); submitBag(room, 'p3', ['cheese'], 'Cheese');
  inspectBag(room, 'p1', 'LEFT');
  assert.equal(clientState(room, 'p3').inspectionResolution?.cards[0].id, 'silk');
  updateBribe(room, 'p3', 0); passBag(room, 'p1');
  assert.equal(room.state.phase, 'GAME_OVER');
  room.state.players[1].vault.push(red('post-game-secret'));
  const view = clientState(room, 'p1');
  assert.equal(view.players[1].vault[0].id, 'post-game-secret');
  assert.deepEqual(view.scores, scores(room));
  assert.equal(view.activeInspectionPlayerId, null);
});

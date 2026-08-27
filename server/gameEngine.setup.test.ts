import assert from 'node:assert/strict';
import test from 'node:test';
import { addPlayer, createDeck, createRoom, drawDealCard, resetGame, startGame } from './gameEngine.js';
import { openingRoom } from './testHelpers.js';

test('deck has the configured 64 unique cards with correct goods values', () => {
  const deck = createDeck();
  assert.equal(deck.length, 64);
  assert.equal(new Set(deck.map((card) => card.id)).size, 64);
  assert.deepEqual(Object.fromEntries(['Apples', 'Cheese', 'Bread', 'Silk', 'Treasure'].map((item) => [item, deck.filter((card) => card.subType === item).length])), {
    Apples: 18, Cheese: 14, Bread: 14, Silk: 10, Treasure: 8,
  });
  assert.ok(deck.filter((card) => card.subType === 'Apples').every((card) => card.type === 'GREEN' && card.pointValue === 2 && card.penaltyValue === 2));
  assert.ok(deck.filter((card) => card.subType === 'Silk').every((card) => card.type === 'RED' && card.pointValue === 6 && card.penaltyValue === 4));
  assert.ok(deck.filter((card) => card.subType === 'Treasure').every((card) => card.name === 'Royal Treasure' && card.pointValue === 9 && card.penaltyValue === 6));
});

test('room creation clamps custom rounds and initializes the host', () => {
  const short = createRoom('ABCD', 'host', 'Robin', 'Owl', 0);
  const long = createRoom('EFGH', 'host', 'Robin', 'Fox', 99);
  assert.equal(short.state.maxRounds, 1);
  assert.equal(long.state.maxRounds, 8);
  assert.equal(short.state.phase, 'LOBBY');
  assert.equal(short.state.currentRound, 0);
  assert.deepEqual(short.state.players[0], { id: 'host', name: 'Robin', avatar: 'Owl', gold: 50, hand: [], marketStand: [], vault: [], isSheriff: true });
});

test('joining normalizes names, selects available avatars, and enforces lobby capacity', () => {
  const room = createRoom('TEST', 'p1', 'Ada', 'Owl');
  const fallback = addPlayer(room, 'p2', '   Bea   ', 'Owl');
  const blank = addPlayer(room, 'p3', '   ', 'Bear');
  const clipped = addPlayer(room, 'p4', '12345678901234567890', 'Rabbit');
  addPlayer(room, 'p5', 'Eve', 'Fox');
  assert.equal(fallback.avatar, 'Fox');
  assert.equal(fallback.name, 'Bea');
  assert.equal(blank.name, 'Merchant');
  assert.equal(clipped.name.length, 18);
  assert.throws(() => addPlayer(room, 'p6', 'Fin', 'Owl'), /room is full/);
  room.state.phase = 'DRAW';
  assert.throws(() => addPlayer(room, 'late', 'Late', 'Owl'), /already started/);
});

test('only the host can start and at least three players are required', () => {
  const room = createRoom('TEST', 'p1', 'Ada', 'Owl');
  assert.throws(() => startGame(room, 'intruder'), /Only the host/);
  assert.throws(() => startGame(room, 'p1'), /At least 3/);
  addPlayer(room, 'p2', 'Bea', 'Fox');
  addPlayer(room, 'p3', 'Cal', 'Bear');
  startGame(room, 'p1');
  assert.equal(room.state.phase, 'DEAL');
  assert.equal(room.state.currentRound, 1);
  assert.equal(room.dealPlayers.size, 3);
  assert.throws(() => startGame(room, 'p1'), /already underway/);
});

test('deal phase rejects invalid, completed, and overfilled draw attempts', () => {
  const room = openingRoom();
  assert.throws(() => drawDealCard(room, 'unknown'), /not drawing/);
  const player = room.state.players[0];
  for (let count = 0; count < 6; count += 1) drawDealCard(room, player.id);
  assert.ok(!room.dealPlayers.has(player.id));
  assert.throws(() => drawDealCard(room, player.id), /not drawing/);
  room.state.phase = 'DRAW';
  assert.throws(() => drawDealCard(room, 'p2'), /not the deal phase/);
});

test('reset is host-only and restores every mutable game collection', () => {
  const room = openingRoom();
  room.state.leftDiscard.push(room.state.deck.pop()!);
  room.drawCompleted.add('p2'); room.drawPrepared.add('p2'); room.bags.set('p2', []); room.declarations.set('p2', 'Cheese');
  room.inspectionResolution = { id: 7, kind: 'PASS', merchantId: 'p2', sheriffId: 'p1', declaration: 'Cheese', cards: [], discardPile: null };
  room.nextResolutionId = 7;
  assert.throws(() => resetGame(room, 'p2'), /Only the host/);
  resetGame(room, 'p1');
  assert.equal(room.state.phase, 'LOBBY');
  assert.equal(room.state.currentRound, 0);
  assert.equal(room.state.deck.length + room.state.leftDiscard.length + room.state.rightDiscard.length, 0);
  assert.ok(room.state.players.every((player, index) => player.gold === 50 && !player.hand.length && !player.marketStand.length && !player.vault.length && player.isSheriff === (index === 0)));
  assert.equal(room.drawCompleted.size + room.drawPrepared.size + room.dealPlayers.size + room.bags.size + room.declarations.size, 0);
  assert.equal(room.inspectionResolution, null);
  assert.equal(room.nextResolutionId, 0);
});

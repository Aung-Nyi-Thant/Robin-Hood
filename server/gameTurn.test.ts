import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveActiveDrawPlayerId } from '../app/gameTurn.js';
import { clientState, skipDraw } from './gameEngine.js';
import { startedRoom } from './testHelpers.js';

test('clockwise UI turn falls back safely when an older backend omits activeDrawPlayerId', () => {
  const room = startedRoom();
  const first = clientState(room, 'p1');
  delete first.activeDrawPlayerId;
  assert.equal(resolveActiveDrawPlayerId(first), 'p2');
  skipDraw(room, 'p2');
  const second = clientState(room, 'p1');
  delete second.activeDrawPlayerId;
  assert.equal(resolveActiveDrawPlayerId(second), 'p3');
});

test('authoritative active turn wins and non-draw phases have no active draw player', () => {
  const room = startedRoom();
  const state = clientState(room, 'p1');
  state.activeDrawPlayerId = 'p3';
  assert.equal(resolveActiveDrawPlayerId(state), 'p3');
  state.phase = 'BAG_SUBMIT';
  assert.equal(resolveActiveDrawPlayerId(state), null);
});

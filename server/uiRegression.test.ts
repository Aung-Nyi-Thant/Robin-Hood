import test from 'node:test';
import assert from 'node:assert/strict';
import { dismissCoinEffects } from '../app/gameEffects.js';

test('dismissing a gold result clears only coins and preserves card-drop effects', () => {
  const current = {
    id: 42,
    coins: [{ playerId: 'merchant', amount: -4 }, { playerId: 'sheriff', amount: 4 }],
    cards: [{ id: 'silk-1', icon: '🧵', pile: 'LEFT' as const }],
  };

  const dismissed = dismissCoinEffects(current);
  assert.deepEqual(dismissed, {
    id: 42,
    coins: [],
    cards: [{ id: 'silk-1', icon: '🧵', pile: 'LEFT' }],
  });
  assert.equal(current.coins.length, 2);
  assert.notEqual(dismissed, current);
});

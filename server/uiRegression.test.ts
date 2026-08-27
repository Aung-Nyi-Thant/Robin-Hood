import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('game phase changes do not remount the table and replay completed animations', () => {
  const pageSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(pageSource, /<Game\s+key=/);
  assert.match(pageSource, /inspectionResolution\.id !== dismissedResolutionId/);
});

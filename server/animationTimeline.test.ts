import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PASS_BAG_RETURN_MS, PASS_CARD_PLACE_MS, PASS_CARD_STAGGER_MS, PASS_HANDOFF_GAP_MS, PASS_RESOLUTION_DURATION_MS, passCardDelayMs,
} from '../app/animationTimeline.js';

test('passed cards start only after the returning bag finishes', () => {
  assert.ok(passCardDelayMs(0) > PASS_BAG_RETURN_MS);
  assert.ok(passCardDelayMs(4) + PASS_CARD_PLACE_MS <= PASS_RESOLUTION_DURATION_MS);
});

test('passed cards are placed in stable staggered order within the resolution window', () => {
  const delays = Array.from({ length: 5 }, (_, index) => passCardDelayMs(index));
  assert.deepEqual(delays, [...delays].sort((a, b) => a - b));
  for (let index = 1; index < delays.length; index += 1) {
    assert.equal(delays[index] - delays[index - 1], PASS_CARD_STAGGER_MS);
  }
  assert.equal(delays[0], PASS_BAG_RETURN_MS + PASS_HANDOFF_GAP_MS);
});

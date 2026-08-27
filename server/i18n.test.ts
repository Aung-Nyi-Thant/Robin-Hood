import assert from 'node:assert/strict';
import test from 'node:test';
import { avatarLabel, cardLabel, itemLabel, localizeError, localizeEvent, translate } from '../app/i18n';

test('translates interface labels and interpolates dynamic values in Thai', () => {
  assert.equal(translate('th', 'createRoom', { count: 5 }), 'สร้างห้อง 5 รอบ');
  assert.equal(translate('th', 'handBag', { count: 3 }), 'ส่งถุงให้นายอำเภอ · 3/5');
  assert.equal(itemLabel('th', 'Apples'), 'แอปเปิล');
  assert.equal(avatarLabel('th', 'Fox'), 'สุนัขจิ้งจอก');
  assert.equal(cardLabel('th', 'Royal Treasure', 'Treasure'), 'สมบัติหลวง');
  assert.equal(translate('th', 'tapEnter'), 'แตะเพื่อเข้าสู่ตลาด');
  assert.equal(cardLabel('th', 'Hidden', 'Apples'), 'ไพ่ที่ซ่อน');
  assert.equal(cardLabel('th', 'Deck card', 'Apples'), 'ไพ่ในกอง');
  assert.equal(cardLabel('th', 'Sealed card', 'Apples'), 'ไพ่ปิดผนึก');
});

test('keeps English labels unchanged', () => {
  assert.equal(translate('en', 'playAgain'), 'Play again');
  assert.equal(itemLabel('en', 'Silk'), 'Silk');
});

test('localizes server errors and live event patterns without changing player names', () => {
  assert.equal(localizeError('th', 'Room not found'), 'ไม่พบห้อง');
  assert.equal(localizeEvent('th', "Robin passed Mali's bag for 4 gold"), 'Robin ปล่อยถุงของ Mali ผ่าน แลก 4 ทอง');
  assert.equal(localizeEvent('th', 'Mali traded 3 cards'), 'Mali แลกไพ่ 3 ใบ');
  assert.equal(localizeEvent('en', 'Mali traded 3 cards'), 'Mali traded 3 cards');
});

test('localizes every server event shape used by the game lifecycle', () => {
  const events = [
    'Draw opening cards from the Royal Deck', 'Opening hands ready · merchants may trade', 'The Sheriff is ready · merchants may trade', 'Merchants are packing their bags',
    'The market is closed — final scores are in', 'The market is ready for another game', 'Ada opened the market', 'Bea joined the market', 'Ada drew a card · 3/6',
    'Bea finished trading', 'Bea traded 1 card', 'Bea traded 4 cards', 'Bea drew one card', 'Bea kept their hand', 'Bea handed over a sealed bag', 'Bea faces the Sheriff',
    'Ada adjusted the offer', 'Bea must refill the Sheriff’s hand · 5/6', 'Bea is the new Sheriff', "Ada passed Bea's bag", "Ada passed Bea's bag for 5 gold",
    'Bea was honest — the Sheriff paid 4 gold', 'Bea was caught — 6 gold penalty',
  ];
  for (const event of events) {
    assert.notEqual(localizeEvent('th', event), event, `missing Thai event translation: ${event}`);
  }
  assert.equal(localizeEvent('th', 'Unknown future event'), 'Unknown future event');
});

test('unknown server errors remain readable instead of disappearing', () => {
  assert.equal(localizeError('th', 'Unexpected custom error'), 'Unexpected custom error');
  assert.equal(localizeError('en', 'Room not found'), 'Room not found');
});

import type { Avatar, ItemType } from '@/shared/types';

export type Language = 'en' | 'th';

const en = {
  language: 'Language', english: 'English', thai: 'ไทย', switchLanguage: 'Switch language', splashAria: 'Sheriff of Nottingham introduction. Tap to enter.', tapEnter: 'Tap to enter the market',
  dismissGold: 'Dismiss gold transaction', goldChanges: 'GOLD CHANGES HANDS', gold: 'gold', tapContinue: 'Tap anywhere to continue',
  legal: 'legal', secret: 'secret', placedGoods: '{legal} placed legal goods and {secret} placed secret goods',
  contraband: 'Contraband', legalGood: 'Legal good', points: '{points} pts',
  cardsSealedAria: '{count} cards sealed and handed to the Sheriff', sealed: 'SEALED', bagSealed: 'Bag sealed', delivering: 'Delivering to the Sheriff…',
  passAria: 'The Sheriff passed the sealed bag back to the merchant', inspectAria: 'The Sheriff opened the bag. The merchant was {result}.', honestResult: 'honest', liarResult: 'caught lying',
  bagPassed: 'BAG PASSED', bagOpened: 'BAG OPENED', goodsReturned: 'Goods returned to merchant', honestMerchant: 'Honest merchant!', contrabandCaught: 'Contraband caught!', faceUpDown: 'Legal goods face-up · secrets face-down',
  welcomeKicker: 'A GAME OF BLUFF & BARTER', sheriffOf: 'Sheriff of', nottingham: 'Nottingham', intro: 'Fill your market. Hide your contraband. And convince the Sheriff to look the other way.',
  merchantName: 'Merchant name', enterName: 'Enter your name', chooseAvatar: 'Choose an avatar', matchLength: 'MATCH LENGTH', rounds: '{count} round(s)', decreaseRounds: 'Decrease rounds', increaseRounds: 'Increase rounds',
  roomCode: 'Room code', createRoom: 'Create {count}-round room', joinMarket: 'Join the market', haveCode: 'Have a code? Join a room', backCreate: 'Back to create room', connecting: 'Connecting to the game server…',
  marketOpen: 'THE MARKET IS OPEN', gatherYour: 'Gather your', merchants: 'merchants', roomCodeUpper: 'ROOM CODE', shareFriends: 'Share with 2–4 friends · {count} rounds', host: 'HOST', waitingPlayer: 'Waiting for player…', startGame: 'Start {rounds}-round game · {players}/5', waitingHostStart: 'Waiting for the host to start…', minimumPlayers: 'At least 3 merchants are required.',
  inspectionDialog: 'Inspection negotiation', sheriffGate: 'AT THE SHERIFF’S GATE', merchant: 'Merchant', sheriff: 'Sheriff', sealedBag: 'Sealed bag', cardsDeclared: '{count} cards declared as {item}', merchantOffers: 'MERCHANT OFFERS', sheriffDemands: 'SHERIFF DEMANDS', yourDemand: 'Your demand', yourOffer: 'Your offer', amountGold: '{amount} gold', contrabandDiscard: 'Contraband discard:', leftPile: 'Left pile', rightPile: 'Right pile', inspectBag: 'Inspect bag', passForGold: 'Pass for {amount} gold', passBag: 'Pass bag', offersMismatch: 'Offers do not match. Passing now means no gold changes hands.', adjustOffer: 'Adjust your offer, then wait for the Sheriff’s decision.',
  marketClosed: 'THE MARKET IS CLOSED', finalStandings: 'Final standings', scorePoints: 'points', scoreBreakdown: '{gold} gold + {green} legal + {red} secret', playAgain: 'Play again', waitingHost: 'Waiting for the host…',
  room: 'ROOM', round: 'ROUND', openingDeal: 'Opening deal', sheriffRefill: 'Sheriff refill', packBag: 'Pack your bag', inspection: 'Inspection', drawPhase: 'Draw phase', gameTable: 'Game table', marketOf: 'THE MARKET OF', drawPiles: 'Draw piles', leftPileUpper: 'LEFT PILE', rightPileUpper: 'RIGHT PILE', royalDeck: 'ROYAL DECK', drawFaceDown: 'Draw face down', empty: 'Empty',
  sheriffHand: 'Sheriff’s hand', yourHand: 'Your hand', yourCards: 'Your cards', emptyHand: 'Your hand is empty this round.', buildOpening: 'BUILD YOUR OPENING HAND', refillSheriff: 'SHERIFF REFILL', cardsCount: '{count}/6 cards', drawMainInstruction: 'Choose the Royal Deck, Left Pile, or Right Pile and draw one card.', refillHand: 'Refill hand', discardTo: 'Discard to', selectOrSkip: 'Select cards or skip', left: 'Left', right: 'Right', needed: '{count} needed', upToFive: 'Up to 5 cards', drawOneAtTime: 'DRAW ONE AT A TIME', cardsNeeded: '{count} card(s) needed', choosePile: 'Choose the Royal Deck, Left Pile, or Right Pile above.', declareAs: 'Declare as', clockwiseTurn: '{name} is trading or drawing…',
  drawOpeningCard: 'Draw 1 opening card · {count} left', drawSheriffCard: 'Draw 1 Sheriff refill card · {count} left', handBag: 'Hand Bag to Sheriff · {count}/5', drawFrom: 'Draw 1 from {source} · {count} left', tradeCards: 'Trade {count} card(s)', startDrawing: 'Start drawing · {count} to six', skipTrade: 'Skip trade · Keep all 6 cards', sealingBag: 'Sealing your bag…',
  waitingHands: 'Waiting for every required hand to reach 6 cards…', watchMerchants: 'Watch the merchants prepare their goods…', sheriffInspecting: 'The Sheriff is inspecting bags…', waitingMerchants: 'Waiting for the other merchants…',
  deckSource: 'Royal Deck', leftSource: 'left pile', rightSource: 'right pile',
  owl: 'Owl', fox: 'Fox', bear: 'Bear', rabbit: 'Rabbit', apples: 'Apples', cheese: 'Cheese', bread: 'Bread', silk: 'Silk', treasure: 'Treasure', royalTreasure: 'Royal Treasure', hiddenCard: 'Hidden card', deckCard: 'Deck card', sealedCard: 'Sealed card',
} as const;

export type MessageKey = keyof typeof en;

const th: Record<MessageKey, string> = {
  language: 'ภาษา', english: 'English', thai: 'ไทย', switchLanguage: 'เปลี่ยนภาษา', splashAria: 'ภาพเปิดเกมนายอำเภอแห่งนอตติงแฮม แตะเพื่อเข้าสู่เกม', tapEnter: 'แตะเพื่อเข้าสู่ตลาด',
  dismissGold: 'ปิดผลการเปลี่ยนเหรียญ', goldChanges: 'การเปลี่ยนแปลงเหรียญทอง', gold: 'ทอง', tapContinue: 'แตะที่ใดก็ได้เพื่อดำเนินการต่อ',
  legal: 'สินค้าถูกกฎหมาย', secret: 'ของลับ', placedGoods: 'สินค้าถูกกฎหมายที่วางแล้ว {legal} ใบ และของลับ {secret} ใบ',
  contraband: 'ของเถื่อน', legalGood: 'สินค้าถูกกฎหมาย', points: '{points} แต้ม',
  cardsSealedAria: 'ปิดผนึกไพ่ {count} ใบและส่งให้นายอำเภอ', sealed: 'ปิดผนึก', bagSealed: 'ปิดผนึกถุงแล้ว', delivering: 'กำลังส่งให้นายอำเภอ…',
  passAria: 'นายอำเภอส่งถุงที่ปิดผนึกคืนให้พ่อค้า', inspectAria: 'นายอำเภอเปิดถุง พ่อค้า{result}', honestResult: 'ซื่อสัตย์', liarResult: 'ถูกจับได้ว่าโกหก',
  bagPassed: 'ปล่อยถุงผ่าน', bagOpened: 'เปิดถุงแล้ว', goodsReturned: 'คืนสินค้าให้พ่อค้า', honestMerchant: 'พ่อค้าซื่อสัตย์!', contrabandCaught: 'จับของเถื่อนได้!', faceUpDown: 'สินค้าถูกกฎหมายหงายหน้า · ของลับคว่ำหน้า',
  welcomeKicker: 'เกมแห่งการลวงและต่อรอง', sheriffOf: 'นายอำเภอแห่ง', nottingham: 'นอตติงแฮม', intro: 'เติมสินค้าในตลาด ซ่อนของเถื่อน และโน้มน้าวให้นายอำเภอมองข้ามไป',
  merchantName: 'ชื่อพ่อค้า', enterName: 'กรอกชื่อของคุณ', chooseAvatar: 'เลือกตัวละคร', matchLength: 'จำนวนรอบ', rounds: '{count} รอบ', decreaseRounds: 'ลดจำนวนรอบ', increaseRounds: 'เพิ่มจำนวนรอบ',
  roomCode: 'รหัสห้อง', createRoom: 'สร้างห้อง {count} รอบ', joinMarket: 'เข้าร่วมตลาด', haveCode: 'มีรหัสแล้ว? เข้าร่วมห้อง', backCreate: 'กลับไปสร้างห้อง', connecting: 'กำลังเชื่อมต่อเซิร์ฟเวอร์เกม…',
  marketOpen: 'ตลาดเปิดแล้ว', gatherYour: 'รวบรวม', merchants: 'เหล่าพ่อค้า', roomCodeUpper: 'รหัสห้อง', shareFriends: 'แชร์กับเพื่อน 2–4 คน · {count} รอบ', host: 'เจ้าของห้อง', waitingPlayer: 'กำลังรอผู้เล่น…', startGame: 'เริ่มเกม {rounds} รอบ · {players}/5', waitingHostStart: 'กำลังรอเจ้าของห้องเริ่มเกม…', minimumPlayers: 'ต้องมีพ่อค้าอย่างน้อย 3 คน',
  inspectionDialog: 'การเจรจาตรวจถุง', sheriffGate: 'ที่ด่านของนายอำเภอ', merchant: 'พ่อค้า', sheriff: 'นายอำเภอ', sealedBag: 'ถุงปิดผนึก', cardsDeclared: '{count} ใบ สำแดงเป็น {item}', merchantOffers: 'พ่อค้าเสนอ', sheriffDemands: 'นายอำเภอเรียก', yourDemand: 'จำนวนที่คุณเรียก', yourOffer: 'ข้อเสนอของคุณ', amountGold: '{amount} ทอง', contrabandDiscard: 'กองทิ้งของเถื่อน:', leftPile: 'กองซ้าย', rightPile: 'กองขวา', inspectBag: 'ตรวจถุง', passForGold: 'ปล่อยผ่านแลก {amount} ทอง', passBag: 'ปล่อยถุงผ่าน', offersMismatch: 'ข้อเสนอไม่ตรงกัน หากปล่อยผ่านตอนนี้จะไม่มีการโอนทอง', adjustOffer: 'ปรับข้อเสนอแล้วรอการตัดสินใจของนายอำเภอ',
  marketClosed: 'ตลาดปิดแล้ว', finalStandings: 'อันดับสุดท้าย', scorePoints: 'แต้ม', scoreBreakdown: '{gold} ทอง + {green} ถูกกฎหมาย + {red} ของลับ', playAgain: 'เล่นอีกครั้ง', waitingHost: 'กำลังรอเจ้าของห้อง…',
  room: 'ห้อง', round: 'รอบ', openingDeal: 'จั่วไพ่เริ่มเกม', sheriffRefill: 'นายอำเภอเติมไพ่', packBag: 'จัดถุงสินค้า', inspection: 'การตรวจถุง', drawPhase: 'ช่วงจั่วไพ่', gameTable: 'โต๊ะเกม', marketOf: 'ตลาดแห่ง', drawPiles: 'กองจั่ว', leftPileUpper: 'กองซ้าย', rightPileUpper: 'กองขวา', royalDeck: 'กองไพ่หลวง', drawFaceDown: 'จั่วแบบคว่ำหน้า', empty: 'ว่าง',
  sheriffHand: 'ไพ่ของนายอำเภอ', yourHand: 'ไพ่ของคุณ', yourCards: 'ไพ่ของคุณ', emptyHand: 'รอบนี้คุณไม่มีไพ่ในมือ', buildOpening: 'สร้างมือเริ่มเกม', refillSheriff: 'นายอำเภอเติมไพ่', cardsCount: '{count}/6 ใบ', drawMainInstruction: 'เลือกกองไพ่หลวง กองซ้าย หรือกองขวา แล้วจั่วหนึ่งใบ', refillHand: 'เติมไพ่ในมือ', discardTo: 'ทิ้งไปที่', selectOrSkip: 'เลือกไพ่หรือข้าม', left: 'ซ้าย', right: 'ขวา', needed: 'ต้องการอีก {count}', upToFive: 'สูงสุด 5 ใบ', drawOneAtTime: 'จั่วทีละหนึ่งใบ', cardsNeeded: 'ต้องการอีก {count} ใบ', choosePile: 'เลือกกองไพ่หลวง กองซ้าย หรือกองขวาด้านบน', declareAs: 'สำแดงเป็น', clockwiseTurn: '{name} กำลังแลกหรือจั่วไพ่…',
  drawOpeningCard: 'จั่วไพ่เริ่มเกม 1 ใบ · เหลือ {count}', drawSheriffCard: 'จั่วไพ่เติมมือนายอำเภอ 1 ใบ · เหลือ {count}', handBag: 'ส่งถุงให้นายอำเภอ · {count}/5', drawFrom: 'จั่ว 1 ใบจาก{source} · เหลือ {count}', tradeCards: 'แลกไพ่ {count} ใบ', startDrawing: 'เริ่มจั่ว · อีก {count} ใบให้ครบหก', skipTrade: 'ข้ามการแลก · เก็บไพ่ทั้ง 6 ใบ', sealingBag: 'กำลังปิดผนึกถุง…',
  waitingHands: 'กำลังรอผู้เล่นที่ต้องจั่วให้ครบ 6 ใบ…', watchMerchants: 'รอพ่อค้าจัดเตรียมสินค้า…', sheriffInspecting: 'นายอำเภอกำลังตรวจถุง…', waitingMerchants: 'กำลังรอพ่อค้าคนอื่น…',
  deckSource: 'กองไพ่หลวง', leftSource: 'กองซ้าย', rightSource: 'กองขวา',
  owl: 'นกฮูก', fox: 'สุนัขจิ้งจอก', bear: 'หมี', rabbit: 'กระต่าย', apples: 'แอปเปิล', cheese: 'ชีส', bread: 'ขนมปัง', silk: 'ผ้าไหม', treasure: 'สมบัติ', royalTreasure: 'สมบัติหลวง', hiddenCard: 'ไพ่ที่ซ่อน', deckCard: 'ไพ่ในกอง', sealedCard: 'ไพ่ปิดผนึก',
};

export function translate(language: Language, key: MessageKey, values: Record<string, string | number> = {}): string {
  return (language === 'th' ? th[key] : en[key]).replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? ''));
}

const avatarKeys: Record<Avatar, MessageKey> = { Owl: 'owl', Fox: 'fox', Bear: 'bear', Rabbit: 'rabbit' };
const itemKeys: Record<ItemType, MessageKey> = { Apples: 'apples', Cheese: 'cheese', Bread: 'bread', Silk: 'silk', Treasure: 'treasure' };

export const avatarLabel = (language: Language, avatar: Avatar) => translate(language, avatarKeys[avatar]);
export const itemLabel = (language: Language, item: ItemType) => translate(language, itemKeys[item]);

export function cardLabel(language: Language, name: string, subType: ItemType): string {
  if (name === 'Hidden') return translate(language, 'hiddenCard');
  if (name === 'Deck card') return translate(language, 'deckCard');
  if (name === 'Sealed card') return translate(language, 'sealedCard');
  if (name === 'Royal Treasure') return translate(language, 'royalTreasure');
  return itemLabel(language, subType);
}

const errorThai: Record<string, string> = {
  'Room not found': 'ไม่พบห้อง', 'Join a room first': 'กรุณาเข้าร่วมห้องก่อน', 'This room has closed': 'ห้องนี้ปิดแล้ว', 'The game server is unavailable.': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เกมได้',
  'The game has already started': 'เกมเริ่มไปแล้ว', 'This room is full': 'ห้องนี้เต็มแล้ว', 'Only the host can start the game': 'เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้', 'At least 3 players are required': 'ต้องมีผู้เล่นอย่างน้อย 3 คน',
  'A bag must contain 1–5 cards': 'ถุงต้องมีไพ่ 1–5 ใบ', 'Legal goods in one bag must be a single item type': 'สินค้าถูกกฎหมายในถุงต้องเป็นชนิดเดียวกัน', 'Your bag is already in the queue': 'ถุงของคุณอยู่ในคิวแล้ว',
};

export function localizeError(language: Language, message: string): string {
  return language === 'th' ? errorThai[message] ?? message : message;
}

export function localizeEvent(language: Language, event: string): string {
  if (language === 'en') return event;
  const exact: Record<string, string> = {
    'Draw opening cards from the Royal Deck': 'จั่วไพ่เริ่มเกมจากกองไพ่หลวง', 'Opening hands ready · merchants may trade': 'ทุกคนมีไพ่เริ่มเกมครบแล้ว · พ่อค้าเริ่มแลกไพ่ได้', 'The Sheriff is ready · merchants may trade': 'นายอำเภอพร้อมแล้ว · พ่อค้าเริ่มแลกไพ่ได้', 'Merchants are packing their bags': 'พ่อค้ากำลังจัดถุงสินค้า', 'The market is closed — final scores are in': 'ตลาดปิดแล้ว · สรุปคะแนนเรียบร้อย', 'The market is ready for another game': 'ตลาดพร้อมสำหรับเกมใหม่',
  };
  if (exact[event]) return exact[event];
  const patterns: Array<[RegExp, (...parts: string[]) => string]> = [
    [/^(.+) opened the market$/, (name) => `${name} เปิดตลาด`], [/^(.+) joined the market$/, (name) => `${name} เข้าร่วมตลาด`],
    [/^(.+)'s turn to trade or draw$/, (name) => `ถึงตาของ ${name} แลกหรือจั่วไพ่`],
    [/^(.+) drew a card · (\d+)\/6$/, (name, count) => `${name} จั่วไพ่ · ${count}/6`], [/^(.+) finished trading$/, (name) => `${name} แลกไพ่เสร็จแล้ว`],
    [/^(.+) traded (\d+) cards?$/, (name, count) => `${name} แลกไพ่ ${count} ใบ`], [/^(.+) drew one card$/, (name) => `${name} จั่วไพ่หนึ่งใบ`], [/^(.+) kept their hand$/, (name) => `${name} เก็บไพ่เดิมไว้`],
    [/^(.+) handed over a sealed bag$/, (name) => `${name} ส่งถุงที่ปิดผนึกแล้ว`], [/^(.+) faces the Sheriff$/, (name) => `${name} เข้าเผชิญหน้านายอำเภอ`], [/^(.+) adjusted the offer$/, (name) => `${name} ปรับข้อเสนอ`],
    [/^(.+) must refill the Sheriff’s hand · (\d+)\/6$/, (name, count) => `${name} ต้องเติมไพ่นายอำเภอ · ${count}/6`], [/^(.+) is the new Sheriff$/, (name) => `${name} เป็นนายอำเภอคนใหม่`],
    [/^(.+) passed (.+)'s bag(?: for (\d+) gold)?$/, (sheriff, merchant, gold) => `${sheriff} ปล่อยถุงของ ${merchant} ผ่าน${gold ? ` แลก ${gold} ทอง` : ''}`],
    [/^(.+) was honest — the Sheriff paid (\d+) gold$/, (name, gold) => `${name} ซื่อสัตย์ · นายอำเภอจ่าย ${gold} ทอง`], [/^(.+) was caught — (\d+) gold penalty$/, (name, gold) => `${name} ถูกจับได้ · ปรับ ${gold} ทอง`],
  ];
  for (const [pattern, formatter] of patterns) { const match = event.match(pattern); if (match) return formatter(...match.slice(1)); }
  return event;
}

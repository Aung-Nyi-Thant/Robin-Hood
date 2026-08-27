'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { io, type Socket } from 'socket.io-client';
import type { Avatar, Card, ClientGameState, DiscardPile, DrawSource, InspectionResolution, ItemType } from '@/shared/types';
import { dismissCoinEffects, type GameEffects } from './gameEffects';
import { PASS_BAG_RETURN_MS, PASS_RESOLUTION_DURATION_MS, passCardDelayMs } from './animationTimeline';
import { avatarLabel, cardLabel, itemLabel, localizeError, localizeEvent, translate, type Language, type MessageKey } from './i18n';

const avatars: Avatar[] = ['Owl', 'Fox', 'Bear', 'Rabbit'];
const items: ItemType[] = ['Apples', 'Cheese', 'Bread', 'Silk', 'Treasure'];
const avatarIcon: Record<Avatar, string> = { Owl: '🦉', Fox: '🦊', Bear: '🐻', Rabbit: '🐰' };
const itemIcon: Record<ItemType, string> = { Apples: '🍎', Cheese: '🧀', Bread: '🥖', Silk: '🧵', Treasure: '💎' };

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('I18n provider is missing');
  return value;
}

function LanguageSwitch() {
  const { language, setLanguage, t } = useI18n();
  const nextLanguage = language === 'en' ? 'th' : 'en';
  return <button type="button" className="language-switch" onClick={() => setLanguage(nextLanguage)} aria-label={t('switchLanguage')}><span className={language === 'en' ? 'active' : ''}>EN</span><i>⇄</i><span className={language === 'th' ? 'active' : ''}>ไทย</span></button>;
}

function IntroSplash({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  return <button type="button" className="intro-splash" onClick={onDone} aria-label={t('splashAria')}>
    <Image className="intro-splash-backdrop" src="/og.png" alt="" fill priority sizes="100vw" aria-hidden="true"/>
    <span className="intro-splash-vignette" aria-hidden="true"/>
    <span className="intro-splash-frame"><Image className="intro-splash-art" src="/og.png" alt="Sheriff of Nottingham" width={1731} height={909} priority sizes="100vw"/><i className="intro-splash-shine" aria-hidden="true"/></span>
    <span className="intro-splash-hint"><i>♜</i>{t('tapEnter')}</span>
  </button>;
}

function socketUrl() {
  if (process.env.NEXT_PUBLIC_GAME_URL) return process.env.NEXT_PUBLIC_GAME_URL;
  if (typeof window === 'undefined') return 'http://localhost:4000';
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

function CoinEffect({ amount }: { amount: number }) {
  return <div className={`coin-effect ${amount > 0 ? 'coin-gain' : 'coin-loss'}`} aria-live="polite"><strong>{amount > 0 ? '+' : ''}{amount}</strong>{Array.from({ length: 7 }).map((_, index) => <i key={index}>●</i>)}</div>;
}

function TransactionEffect({ effects, players, onDismiss }: { effects: GameEffects; players: ClientGameState['players']; onDismiss: () => void }) {
  const { t } = useI18n();
  if (!effects.coins.length) return null;
  return <div key={effects.id} className="transaction-dismiss-layer" onClick={onDismiss}><button type="button" className="transaction-effect" onClick={onDismiss} aria-label={t('dismissGold')}><span className="transaction-coins">{Array.from({ length: 9 }).map((_, index) => <i key={index}>●</i>)}</span><span className="transaction-label">{t('goldChanges')}</span><span className="transaction-rows">{effects.coins.map((change) => { const player = players.find((candidate) => candidate.id === change.playerId); return <span className={change.amount > 0 ? 'gets-coins' : 'loses-coins'} key={change.playerId}><span>{player ? avatarIcon[player.avatar] : '●'}</span><b>{player?.name}</b><strong>{change.amount > 0 ? '+' : ''}{change.amount}</strong><small>{t('gold')}</small></span>; })}</span><span className="transaction-hint">{t('tapContinue')}</span></button></div>;
}

function GoodsTray({ player, pendingResolution }: { player: ClientGameState['players'][number]; pendingResolution?: InspectionResolution | null }) {
  const { t } = useI18n();
  const incomingLegal = pendingResolution?.merchantId === player.id && pendingResolution.kind !== 'INSPECT_LIAR' ? pendingResolution.cards.filter((card) => card.type === 'GREEN').length : 0;
  const incomingSecret = pendingResolution?.merchantId === player.id && pendingResolution.kind === 'PASS' ? pendingResolution.cards.filter((card) => card.type === 'RED').length : 0;
  const visibleMarket = player.marketStand.slice(0, Math.max(0, player.marketStand.length - incomingLegal));
  const visibleVault = player.vault.slice(0, Math.max(0, player.vault.length - incomingSecret));
  if (!visibleMarket.length && !visibleVault.length) return null;
  return <div className="goods-tray" aria-label={t('placedGoods', { legal: visibleMarket.length, secret: visibleVault.length })}>
    {visibleMarket.slice(-4).map((card) => <span className="stand-good" key={card.id}>{itemIcon[card.subType]}</span>)}
    {visibleMarket.length > 4 && <b>+{visibleMarket.length - 4}</b>}
    {visibleVault.slice(-3).map((card) => <span className="vault-good" key={card.id}>▧</span>)}
    {visibleVault.length > 3 && <b>+{visibleVault.length - 3}</b>}
  </div>;
}

function PlayerBadge({ player, position, coinDelta, pendingResolution }: { player: ClientGameState['players'][number]; position: string; coinDelta?: number; pendingResolution?: InspectionResolution | null }) {
  const { t } = useI18n();
  return <div className={`player player-${position}`}><div className="avatar"><span>{avatarIcon[player.avatar]}</span>{player.isSheriff && <b className="badge">♛</b>}{coinDelta ? <CoinEffect amount={coinDelta}/> : null}</div><div className="player-copy"><strong>{player.name}</strong><span className="gold-count"><i>●</i> {player.gold}</span><small>{player.marketStand.length} {t('legal')} · {player.vault.length} {t('secret')}</small><GoodsTray player={player} pendingResolution={pendingResolution}/></div></div>;
}

function GameCard({ card, selected, onClick }: { card: Card; selected: boolean; onClick: () => void }) {
  const { language, t } = useI18n();
  return <button className={`card ${card.type === 'RED' ? 'contraband' : ''} ${selected ? 'selected' : ''}`} onClick={onClick} aria-pressed={selected}><span className="card-icon">{itemIcon[card.subType]}</span><b>{cardLabel(language, card.name, card.subType)}</b><small>{t(card.type === 'RED' ? 'contraband' : 'legalGood')}</small><em>{t('points', { points: card.pointValue })} <i>−{card.penaltyValue}</i></em></button>;
}

interface BagHandoff {
  id: string;
  cards: Card[];
  declaration: ItemType;
  sheriffPosition: string;
}

const sheriffDestinations: Record<string, { left: string; top: string }> = {
  left: { left: '12%', top: '24%' }, right: { left: '88%', top: '24%' }, top: { left: '50%', top: '14%' },
  'left-top': { left: '12%', top: '16%' }, 'right-top': { left: '88%', top: '16%' },
  'left-low': { left: '12%', top: '38%' }, 'right-low': { left: '88%', top: '38%' },
};

function BagHandoffAnimation({ handoff }: { handoff: BagHandoff }) {
  const { t } = useI18n();
  const destination = sheriffDestinations[handoff.sheriffPosition] ?? sheriffDestinations.top;
  const bagStyle = { '--bag-end-left': destination.left, '--bag-end-top': destination.top } as CSSProperties;
  return <div key={handoff.id} className="bag-handoff-layer" aria-live="polite" aria-label={t('cardsSealedAria', { count: handoff.cards.length })}>
    <div className="packing-cards" aria-hidden="true">{handoff.cards.map((card, index) => <span key={card.id} className={`packing-card ${card.type === 'RED' ? 'secret' : ''}`} style={{ left: `calc(50% + ${(index - (handoff.cards.length - 1) / 2) * 27}px)`, animationDelay: `${index * 70}ms` }}>{itemIcon[card.subType]}</span>)}</div>
    <div className="travel-bag" style={bagStyle} aria-hidden="true"><i className="bag-knot"/><div className="bag-body"><span>{itemIcon[handoff.declaration]}</span><b>{handoff.cards.length}</b><small>{t('sealed')}</small></div></div>
    <div className="bag-handoff-caption"><strong>{t('bagSealed')}</strong><span>{t('delivering')}</span></div>
  </div>;
}

const outcomeDestinations: Record<string, { left: string; top: string }> = {
  self: { left: '50%', top: '84%' }, left: { left: '12%', top: '23%' }, right: { left: '88%', top: '23%' }, top: { left: '50%', top: '13%' },
  'left-top': { left: '12%', top: '16%' }, 'right-top': { left: '88%', top: '16%' }, 'left-low': { left: '12%', top: '37%' }, 'right-low': { left: '88%', top: '37%' },
  'pile-left': { left: '27%', top: '45%' }, 'pile-right': { left: '73%', top: '45%' },
};

function ResolutionAnimation({ resolution, merchantPosition, sheriffPosition, onDone }: { resolution: InspectionResolution; merchantPosition: string; sheriffPosition: string; onDone: () => void }) {
  const { t } = useI18n();
  const origin = outcomeDestinations[sheriffPosition] ?? outcomeDestinations.top;
  const targetName = resolution.kind === 'INSPECT_LIAR' ? `pile-${resolution.discardPile?.toLowerCase()}` : merchantPosition;
  const target = outcomeDestinations[targetName] ?? outcomeDestinations.self;
  const passed = resolution.kind === 'PASS';
  const honest = resolution.kind === 'INSPECT_HONEST';
  const style = { '--result-start-left': origin.left, '--result-start-top': origin.top, '--result-end-left': target.left, '--result-end-top': target.top, '--pass-bag-duration': `${PASS_BAG_RETURN_MS}ms`, '--resolution-duration': passed ? `${PASS_RESOLUTION_DURATION_MS}ms` : '2700ms' } as CSSProperties;
  return <div key={resolution.id} className={`inspection-resolution-layer ${passed ? 'resolution-pass' : 'resolution-inspect'}`} style={style} onAnimationEnd={(event) => { if (event.currentTarget === event.target) onDone(); }} role="status" aria-label={passed ? t('passAria') : t('inspectAria', { result: t(honest ? 'honestResult' : 'liarResult') })}>
    <div className="resolution-spotlight"/>
    <div className="resolution-bag"><i/><span>{passed ? '🔒' : '✂'}</span><b>{resolution.cards.length}</b></div>
    <div className="resolution-cards" aria-hidden="true">{resolution.cards.map((card, index) => <span key={`${resolution.id}-${card.id}`} className={`resolution-card ${card.type === 'RED' ? 'secret' : ''}`} style={{ '--result-card-index': index, '--result-card-spread': `${(index - (resolution.cards.length - 1) / 2) * 42}px`, animationDelay: `${passed ? passCardDelayMs(index) : index * 85}ms` } as CSSProperties}>{passed && card.type === 'RED' ? '▧' : itemIcon[card.subType]}</span>)}</div>
    <div className={`resolution-verdict ${passed ? 'passed' : honest ? 'honest' : 'caught'}`}><small>{t(passed ? 'bagPassed' : 'bagOpened')}</small><strong>{t(passed ? 'goodsReturned' : honest ? 'honestMerchant' : 'contrabandCaught')}</strong><span>{passed ? t('faceUpDown') : resolution.cards.map((card) => itemIcon[card.subType]).join(' ')}</span></div>
  </div>;
}

function Welcome({ socket, error }: { socket: Socket | null; error: string }) {
  const { language, t } = useI18n();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<Avatar>('Owl');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'home' | 'join'>('home');
  const [maxRounds, setMaxRounds] = useState(4);
  return <main className="welcome-shell"><LanguageSwitch/><section className="welcome-card"><div className="seal">♜</div><p className="kicker">{t('welcomeKicker')}</p><h1>{t('sheriffOf')}<br/><span>{t('nottingham')}</span></h1><p className="intro">{t('intro')}</p>
    <label className="field-label">{t('merchantName')}<input value={name} onChange={(event) => setName(event.target.value)} maxLength={18} placeholder={t('enterName')} /></label>
    <div className="avatar-picker" aria-label={t('chooseAvatar')}>{avatars.map((choice) => <button key={choice} className={avatar === choice ? 'chosen' : ''} onClick={() => setAvatar(choice)}><span>{avatarIcon[choice]}</span><small>{avatarLabel(language, choice)}</small></button>)}</div>
    {mode === 'home' && <div className="round-picker"><span><small>{t('matchLength')}</small><b>{t('rounds', { count: maxRounds })}</b></span><div><button type="button" onClick={() => setMaxRounds((rounds) => Math.max(1, rounds - 1))} disabled={maxRounds === 1} aria-label={t('decreaseRounds')}>−</button><strong>{maxRounds}</strong><button type="button" onClick={() => setMaxRounds((rounds) => Math.min(8, rounds + 1))} disabled={maxRounds === 8} aria-label={t('increaseRounds')}>＋</button></div></div>}
    {mode === 'join' && <label className="field-label">{t('roomCode')}<input className="code-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" /></label>}{error && <p className="error" role="alert">{localizeError(language, error)}</p>}
    <button className="primary" disabled={!socket?.connected || !name.trim() || (mode === 'join' && roomCode.length !== 4)} onClick={() => mode === 'home' ? socket?.emit('room:create', { name, avatar, maxRounds }) : socket?.emit('room:join', { name, avatar, roomCode })}>{mode === 'home' ? t('createRoom', { count: maxRounds }) : t('joinMarket')}</button>
    <button className="text-button" onClick={() => setMode(mode === 'home' ? 'join' : 'home')}>{t(mode === 'home' ? 'haveCode' : 'backCreate')}</button>{!socket?.connected && <p className="connection">{t('connecting')}</p>}
  </section></main>;
}

function Lobby({ state, socket }: { state: ClientGameState; socket: Socket }) {
  const { t } = useI18n();
  const isHost = state.youPlayerId === state.hostPlayerId;
  return <main className="welcome-shell"><LanguageSwitch/><section className="welcome-card lobby-card"><p className="kicker">{t('marketOpen')}</p><h1>{t('gatherYour')}<br/><span>{t('merchants')}</span></h1><div className="room-ticket"><small>{t('roomCodeUpper')}</small><strong>{state.roomCode}</strong><span>{t('shareFriends', { count: state.maxRounds })}</span></div><div className="roster">{state.players.map((player) => <div key={player.id}><span className="roster-avatar">{avatarIcon[player.avatar]}</span><strong>{player.name}</strong>{player.id === state.hostPlayerId && <small>{t('host')}</small>}</div>)}{Array.from({ length: Math.max(0, 3 - state.players.length) }).map((_, index) => <div className="empty-seat" key={index}><span>+</span><strong>{t('waitingPlayer')}</strong></div>)}</div>{isHost ? <button className="primary" disabled={state.players.length < 3} onClick={() => socket.emit('game:start')}>{t('startGame', { rounds: state.maxRounds, players: state.players.length })}</button> : <p className="waiting">{t('waitingHostStart')}</p>}{state.players.length < 3 && <p className="connection">{t('minimumPlayers')}</p>}</section></main>;
}

function InspectionModal({ state, socket }: { state: ClientGameState; socket: Socket }) {
  const { language, t } = useI18n();
  const bribe = state.currentBribe;
  const sheriff = state.players[state.sheriffIndex];
  const merchant = state.players.find((player) => player.id === state.activeInspectionPlayerId);
  const youAreSheriff = state.youPlayerId === sheriff?.id;
  const youAreMerchant = state.youPlayerId === merchant?.id;
  const [pile, setPile] = useState<DiscardPile>('LEFT');
  if (!bribe || !merchant || (!youAreSheriff && !youAreMerchant)) return null;
  const value = youAreSheriff ? bribe.demandGold : bribe.offerGold;
  const matched = bribe.offerGold === bribe.demandGold;
  return <div className="modal-backdrop"><section className="bribe-modal" role="dialog" aria-modal="true" aria-label={t('inspectionDialog')}><span className="modal-kicker">{t('sheriffGate')}</span><div className="negotiators"><div><span>{avatarIcon[merchant.avatar]}</span><b>{merchant.name}</b><small>{t('merchant')}</small></div><i>↔</i><div><span>{avatarIcon[sheriff.avatar]}</span><b>{sheriff.name}</b><small>{t('sheriff')}</small></div></div><div className="bag-summary"><span>{t('sealedBag')}</span><strong>{t('cardsDeclared', { count: state.bagCounts[merchant.id], item: `${itemIcon[state.declarations[merchant.id]]} ${itemLabel(language, state.declarations[merchant.id])}` })}</strong></div><div className="offer-row"><div><small>{t('merchantOffers')}</small><strong>{bribe.offerGold} ◉</strong></div><div><small>{t('sheriffDemands')}</small><strong>{bribe.demandGold} ◉</strong></div></div>
    <label className="slider-label">{t(youAreSheriff ? 'yourDemand' : 'yourOffer')}<input type="range" min="0" max={Math.max(0, merchant.gold)} value={value} onChange={(event) => socket.emit('bribe:update', { amount: Number(event.target.value) })}/><span>{t('amountGold', { amount: value })}</span></label>
    {youAreSheriff ? <><div className="pile-toggle"><span>{t('contrabandDiscard')}</span><button className={pile === 'LEFT' ? 'active' : ''} onClick={() => setPile('LEFT')}>{t('leftPile')}</button><button className={pile === 'RIGHT' ? 'active' : ''} onClick={() => setPile('RIGHT')}>{t('rightPile')}</button></div><div className="modal-actions"><button className="inspect-button" onClick={() => socket.emit('inspection:inspect', { pile })}>{t('inspectBag')}</button><button className="pass-button" onClick={() => socket.emit('inspection:pass')}>{matched && value > 0 ? t('passForGold', { amount: value }) : t('passBag')}</button></div>{!matched && <p className="modal-note">{t('offersMismatch')}</p>}</> : <p className="modal-note">{t('adjustOffer')}</p>}
  </section></div>;
}

function Podium({ state, socket }: { state: ClientGameState; socket: Socket }) {
  const { t } = useI18n();
  const order = [state.scores[1], state.scores[0], state.scores[2]].filter(Boolean);
  return <div className="modal-backdrop end-backdrop"><section className="score-modal"><p className="kicker">{t('marketClosed')}</p><h2>{t('finalStandings')}</h2><div className="podium">{order.map((score) => { const place = score === state.scores[0] ? 1 : score === state.scores[1] ? 2 : 3; return <div className={`podium-place place-${place}`} key={score.playerId}><span>{avatarIcon[score.avatar]}</span><b>{score.name}</b><strong>{score.total}</strong><small>{t('scorePoints')}</small><i>#{place}</i></div>; })}</div><div className="score-list">{state.scores.map((score, index) => <div key={score.playerId}><b>{index + 1}. {score.name}</b><span>{t('scoreBreakdown', { gold: score.gold, green: score.greenPoints, red: score.redPoints })}</span><strong>{score.total}</strong></div>)}</div>{state.youPlayerId === state.hostPlayerId ? <button className="primary" onClick={() => socket.emit('game:reset')}>{t('playAgain')}</button> : <p className="waiting">{t('waitingHost')}</p>}</section></div>;
}

function Game({ state, socket, effects, dismissEffects }: { state: ClientGameState; socket: Socket; effects: GameEffects; dismissEffects: () => void }) {
  const { language, t } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);
  const [source, setSource] = useState<DrawSource>('DECK');
  const [discardPile, setDiscardPile] = useState<DiscardPile>('LEFT');
  const [declaration, setDeclaration] = useState<ItemType>('Apples');
  const [bagHandoff, setBagHandoff] = useState<BagHandoff | null>(null);
  const [submittingBag, setSubmittingBag] = useState(false);
  const [dismissedResolutionId, setDismissedResolutionId] = useState<number | null>(null);
  const handoffTimers = useRef<number[]>([]);
  useEffect(() => () => handoffTimers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const you = state.players.find((player) => player.id === state.youPlayerId)!;
  const others = state.players.filter((player) => player.id !== you.id);
  const positions = others.length === 2 ? ['left', 'right'] : others.length === 3 ? ['left', 'top', 'right'] : ['left-low', 'left-top', 'right-top', 'right-low'];
  const dealAction = state.phase === 'DEAL' && state.dealPlayerIds.includes(you.id) && you.hand.length < 6;
  const actionAvailable = dealAction || (!you.isSheriff && ((state.phase === 'DRAW' && state.activeDrawPlayerId === you.id) || (state.phase === 'BAG_SUBMIT' && !state.submittedPlayerIds.includes(you.id))));
  const drawPrepared = state.drawPreparedPlayerIds.includes(you.id);
  const cardsNeeded = Math.max(0, 6 - you.hand.length);
  const toggle = (card: Card) => { if (submittingBag || !actionAvailable || state.phase === 'DEAL' || (state.phase === 'DRAW' && drawPrepared)) return; setSelected((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : current.length < 5 ? [...current, card.id] : current); };
  const takePrimaryAction = () => {
    if (state.phase === 'DEAL') { socket.emit('deal:card', { source }); return; }
    if (state.phase === 'BAG_SUBMIT') {
      if (submittingBag || !selected.length) return;
      const cardIds = [...selected];
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { socket.emit('bag:submit', { cardIds, declaration }); setSelected([]); return; }
      const sheriff = state.players[state.sheriffIndex];
      const sheriffPosition = positions[others.findIndex((player) => player.id === sheriff.id)] ?? 'top';
      setSubmittingBag(true);
      setBagHandoff({ id: `${state.currentRound}-${you.id}-${cardIds.join('-')}`, cards: you.hand.filter((card) => cardIds.includes(card.id)), declaration, sheriffPosition });
      handoffTimers.current.push(window.setTimeout(() => {
        socket.emit('bag:submit', { cardIds, declaration });
        setSelected([]); setSubmittingBag(false); setBagHandoff(null);
      }, 1450));
      return;
    }
    if (drawPrepared) { socket.emit('draw:card', { source }); return; }
    if (selected.length) { socket.emit('draw:trade', { cardIds: selected, discardPile }); setSelected([]); return; }
    if (cardsNeeded > 0) { socket.emit('draw:trade', { cardIds: [], discardPile }); return; }
    socket.emit('draw:skip');
  };
  const primaryLabel = state.phase === 'DEAL'
    ? t(state.currentRound === 1 ? 'drawOpeningCard' : 'drawSheriffCard', { count: cardsNeeded })
    : state.phase === 'BAG_SUBMIT'
    ? t('handBag', { count: selected.length })
    : drawPrepared
      ? t('drawFrom', { source: t(source === 'DECK' ? 'deckSource' : source === 'LEFT' ? 'leftSource' : 'rightSource'), count: cardsNeeded })
      : selected.length
        ? t('tradeCards', { count: selected.length })
        : cardsNeeded > 0 ? t('startDrawing', { count: cardsNeeded }) : t('skipTrade');
  const phaseName = state.phase === 'DEAL' ? t(state.currentRound === 1 ? 'openingDeal' : 'sheriffRefill') : state.phase === 'BAG_SUBMIT' ? t('packBag') : state.phase === 'INSPECT_QUEUE' ? t('inspection') : t('drawPhase');
  const topLeft = state.leftDiscard.at(-1); const topRight = state.rightDiscard.at(-1);
  const coinFor = (playerId: string) => effects.coins.find((coin) => coin.playerId === playerId)?.amount;
  const positionFor = (playerId: string) => playerId === you.id ? 'self' : positions[others.findIndex((player) => player.id === playerId)] ?? 'top';
  const pendingResolution = state.inspectionResolution?.id === dismissedResolutionId ? null : state.inspectionResolution;
  return <main className="game-shell"><LanguageSwitch/><header className="topbar"><div className="room-mark"><span className="mini-crest">♜</span><span><small>{t('room')}</small><strong>{state.roomCode}</strong></span></div><div className="phase-chip"><span /> {phaseName}</div><div className="round"><small>{t('round')}</small><strong>{state.currentRound}<i>/{state.maxRounds}</i></strong></div></header><section className="table" aria-label={t('gameTable')}><div className="felt-grain"/>{others.map((player, index) => <PlayerBadge key={player.id} player={player} position={positions[index]} coinDelta={coinFor(player.id)} pendingResolution={pendingResolution}/>) }<div className="table-mark"><span>{t('marketOf')}</span><strong>{t('nottingham')}</strong><i>♜</i></div><div className="decks" aria-label={t('drawPiles')}><button className={`deck discard ${source === 'LEFT' ? 'active-deck' : ''}`} onClick={() => setSource('LEFT')}><span className="pile-count">{state.leftDiscard.length}</span><span className="pile-emoji">{topLeft ? itemIcon[topLeft.subType] : '＋'}</span><b>{t('leftPileUpper')}</b><small>{topLeft ? cardLabel(language, topLeft.name, topLeft.subType) : t('empty')}</small></button><button className={`deck main-deck ${source === 'DECK' ? 'active-deck' : ''}`} onClick={() => setSource('DECK')}><span className="deck-corner">{state.deck.length}</span><span className="crest">♜</span><b>{t('royalDeck')}</b><small>{t('drawFaceDown')}</small></button><button className={`deck discard red ${source === 'RIGHT' ? 'active-deck' : ''}`} onClick={() => setSource('RIGHT')}><span className="pile-count">{state.rightDiscard.length}</span><span className="pile-emoji">{topRight ? itemIcon[topRight.subType] : '＋'}</span><b>{t('rightPileUpper')}</b><small>{topRight ? cardLabel(language, topRight.name, topRight.subType) : t('empty')}</small></button></div><div className="event-ribbon"><span>◆</span><p>{localizeEvent(language, state.lastEvent)}</p><span>◆</span></div>{effects.cards.map((card, index) => <span key={`${effects.id}-${card.id}`} className={`flying-card fly-${card.pile.toLowerCase()}`} style={{ animationDelay: `${index * 90}ms` }}>{card.icon}</span>)}</section>
    <section className="hand-area"><div className="hand-grip"/><div className="your-status"><div className="avatar small"><span>{avatarIcon[you.avatar]}</span>{you.isSheriff && <b className="badge">♛</b>}{coinFor(you.id) ? <CoinEffect amount={coinFor(you.id)!}/> : null}</div><div><strong>{t(you.isSheriff ? 'sheriffHand' : 'yourHand')}</strong><span><i className="inline-coin">●</i> {you.gold} · {you.marketStand.length} {t('legal')} · {you.vault.length} {t('secret')}</span><GoodsTray player={you} pendingResolution={pendingResolution}/></div><span className="counter"><b>{selected.length}</b>/5</span></div><div className="hand" aria-label={t('yourCards')}>{you.hand.map((card) => <GameCard key={card.id} card={card} selected={selected.includes(card.id)} onClick={() => toggle(card)} />)}{!you.hand.length && <p className="empty-hand">{t('emptyHand')}</p>}</div>
    {actionAvailable && state.phase === 'DEAL' && <div className="draw-one-guide opening-deal-guide"><span>{t(state.currentRound === 1 ? 'buildOpening' : 'refillSheriff')}</span><strong>{t('cardsCount', { count: you.hand.length })}</strong><small>{t('drawMainInstruction')}</small></div>}{actionAvailable && state.phase === 'DRAW' && !drawPrepared && <div className="action-options"><span>{t(cardsNeeded > 0 ? 'refillHand' : selected.length ? 'discardTo' : 'selectOrSkip')}</span><button className={discardPile === 'LEFT' ? 'active' : ''} onClick={() => setDiscardPile('LEFT')}>{t('left')}</button><button className={discardPile === 'RIGHT' ? 'active' : ''} onClick={() => setDiscardPile('RIGHT')}>{t('right')}</button><span>{cardsNeeded > 0 ? t('needed', { count: cardsNeeded }) : t('upToFive')}</span></div>}{actionAvailable && state.phase === 'DRAW' && drawPrepared && <div className="draw-one-guide"><span>{t('drawOneAtTime')}</span><strong>{t('cardsNeeded', { count: cardsNeeded })}</strong><small>{t('choosePile')}</small></div>}{actionAvailable && state.phase === 'BAG_SUBMIT' && <label className="declare-field">{t('declareAs')} <select value={declaration} onChange={(event) => setDeclaration(event.target.value as ItemType)}>{items.map((item) => <option key={item} value={item}>{itemLabel(language, item)}</option>)}</select></label>}
    {actionAvailable ? <button className="primary sticky-action" disabled={submittingBag || (state.phase === 'BAG_SUBMIT' && selected.length === 0)} onClick={takePrimaryAction}>{submittingBag ? t('sealingBag') : primaryLabel}</button> : <div className="waiting-strip">{state.phase === 'DRAW' && state.activeDrawPlayerId ? t('clockwiseTurn', { name: state.players.find((player) => player.id === state.activeDrawPlayerId)?.name ?? '' }) : t(state.phase === 'DEAL' ? 'waitingHands' : you.isSheriff ? 'watchMerchants' : state.phase === 'INSPECT_QUEUE' ? 'sheriffInspecting' : 'waitingMerchants')}</div>}</section>{bagHandoff && <BagHandoffAnimation handoff={bagHandoff}/>}<InspectionModal state={state} socket={socket}/>{state.inspectionResolution && state.inspectionResolution.id !== dismissedResolutionId && <ResolutionAnimation resolution={state.inspectionResolution} merchantPosition={positionFor(state.inspectionResolution.merchantId)} sheriffPosition={positionFor(state.inspectionResolution.sheriffId)} onDone={() => setDismissedResolutionId(state.inspectionResolution!.id)}/>} {state.phase === 'GAME_OVER' && <Podium state={state} socket={socket}/>}<TransactionEffect effects={effects} players={state.players} onDismiss={dismissEffects}/></main>;
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [language, setLanguageState] = useState<Language>('en');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState('');
  const previousState = useRef<ClientGameState | null>(null);
  const [effects, setEffects] = useState<GameEffects>({ id: 0, coins: [], cards: [] });
  useEffect(() => {
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 650 : 3200;
    const timer = window.setTimeout(() => setShowSplash(false), duration);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem('nottingham-language');
    // Restore after hydration so the server and first client render both start in English.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedLanguage === 'en' || savedLanguage === 'th') setLanguageState(savedLanguage);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem('nottingham-language', nextLanguage);
  };
  useEffect(() => { const connection = io(socketUrl(), { transports: ['websocket', 'polling'] }); connection.on('connect', () => setSocket(connection)); connection.on('game:state', (next: ClientGameState) => {
    const previous = previousState.current;
    if (previous) {
      const coins = next.players.map((player) => ({ playerId: player.id, amount: player.gold - (previous.players.find((old) => old.id === player.id)?.gold ?? player.gold) })).filter((coin) => coin.amount !== 0);
      const inspectionRevealHandlesDiscard = next.inspectionResolution?.kind === 'INSPECT_LIAR' && next.inspectionResolution.id !== previous.inspectionResolution?.id;
      const leftAdded = inspectionRevealHandlesDiscard ? [] : next.leftDiscard.slice(previous.leftDiscard.length).map((card) => ({ id: card.id, icon: itemIcon[card.subType], pile: 'LEFT' as const }));
      const rightAdded = inspectionRevealHandlesDiscard ? [] : next.rightDiscard.slice(previous.rightDiscard.length).map((card) => ({ id: card.id, icon: itemIcon[card.subType], pile: 'RIGHT' as const }));
      if (coins.length || leftAdded.length || rightAdded.length) setEffects({ id: Date.now(), coins, cards: [...leftAdded, ...rightAdded] });
    }
    previousState.current = next; setState(next); setError('');
  }); connection.on('game:error', (value: { message: string }) => setError(value.message)); connection.on('connect_error', () => setError('The game server is unavailable.')); return () => { connection.disconnect(); }; }, []);
  const content = useMemo(() => !state ? <Welcome socket={socket} error={error}/> : state.phase === 'LOBBY' ? <Lobby state={state} socket={socket!}/> : <Game state={state} socket={socket!} effects={effects} dismissEffects={() => setEffects(dismissCoinEffects)}/>, [state, socket, error, effects]);
  return <I18nContext.Provider value={{ language, setLanguage, t: (key, values) => translate(language, key, values) }}>{showSplash ? <IntroSplash onDone={() => setShowSplash(false)}/> : content}</I18nContext.Provider>;
}

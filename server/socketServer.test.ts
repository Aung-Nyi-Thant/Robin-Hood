import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { type AddressInfo } from 'node:net';
import { io as createClient, type Socket } from 'socket.io-client';
import type { ClientGameState, ServerError } from '../shared/types.js';
import { createGameServer } from './index.js';

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function onceWhere<T>(socket: Socket, event: string, predicate: (value: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    const listener = (value: T) => {
      if (!predicate(value)) return;
      socket.off(event, listener);
      resolve(value);
    };
    socket.on(event, listener);
  });
}

async function connectedClient(url: string): Promise<Socket> {
  const socket = createClient(url, { transports: ['websocket'], forceNew: true });
  await once(socket, 'connect');
  return socket;
}

async function emitAndReadState(socket: Socket, event: string, payload?: unknown, predicate: (state: ClientGameState) => boolean = () => true): Promise<ClientGameState> {
  const state = onceWhere<ClientGameState>(socket, 'game:state', predicate);
  socket.emit(event, payload);
  return state;
}

async function startTestServer(t: TestContext) {
  const gameServer = createGameServer();
  await new Promise<void>((resolve) => gameServer.server.listen(0, '127.0.0.1', resolve));
  const port = (gameServer.server.address() as AddressInfo).port;
  const clients: Socket[] = [];
  t.after(async () => {
    clients.forEach((client) => client.disconnect());
    await new Promise<void>((resolve) => gameServer.io.close(() => resolve()));
  });
  return { ...gameServer, url: `http://127.0.0.1:${port}`, clients };
}

test('health endpoint reports active rooms and room creation applies custom rounds', async (t) => {
  const server = await startTestServer(t);
  const before = await fetch(`${server.url}/health`).then((response) => response.json()) as { ok: boolean; rooms: number };
  assert.deepEqual(before, { ok: true, rooms: 0 });
  const host = await connectedClient(server.url); server.clients.push(host);
  const statePromise = once<ClientGameState>(host, 'game:state');
  host.emit('room:create', { name: 'Robin', avatar: 'Owl', maxRounds: 7 });
  const state = await statePromise;
  assert.match(state.roomCode, /^[A-HJ-NP-Z]{4}$/);
  assert.equal(state.maxRounds, 7);
  assert.equal(state.hostPlayerId, host.id);
  assert.equal(state.youPlayerId, host.id);
  const after = await fetch(`${server.url}/health`).then((response) => response.json()) as { ok: boolean; rooms: number };
  assert.deepEqual(after, { ok: true, rooms: 1 });
});

test('socket errors are returned for missing rooms, membership, and non-host starts', async (t) => {
  const server = await startTestServer(t);
  const outsider = await connectedClient(server.url); server.clients.push(outsider);
  let errorPromise = once<ServerError>(outsider, 'game:error');
  outsider.emit('game:start');
  assert.equal((await errorPromise).message, 'Join a room first');
  errorPromise = once<ServerError>(outsider, 'game:error');
  outsider.emit('room:join', { roomCode: 'NONE', name: 'Lost', avatar: 'Fox' });
  assert.equal((await errorPromise).message, 'Room not found');

  const host = await connectedClient(server.url); server.clients.push(host);
  const hostStatePromise = once<ClientGameState>(host, 'game:state');
  host.emit('room:create', { name: 'Host', avatar: 'Owl', maxRounds: 2 });
  const roomCode = (await hostStatePromise).roomCode;
  const joinStatePromise = once<ClientGameState>(outsider, 'game:state');
  outsider.emit('room:join', { roomCode: roomCode.toLowerCase(), name: 'Guest', avatar: 'Fox' });
  await joinStatePromise;
  errorPromise = once<ServerError>(outsider, 'game:error');
  outsider.emit('game:start');
  assert.equal((await errorPromise).message, 'Only the host can start the game');
});

test('server broadcasts viewer-specific state through join, start, and one-card deal actions', async (t) => {
  const server = await startTestServer(t);
  const host = await connectedClient(server.url); const merchantA = await connectedClient(server.url); const merchantB = await connectedClient(server.url);
  server.clients.push(host, merchantA, merchantB);
  let hostStatePromise = once<ClientGameState>(host, 'game:state');
  host.emit('room:create', { name: 'Ada', avatar: 'Owl', maxRounds: 3 });
  const roomCode = (await hostStatePromise).roomCode;

  let merchantStatePromise = once<ClientGameState>(merchantA, 'game:state');
  merchantA.emit('room:join', { roomCode, name: 'Bea', avatar: 'Fox' });
  await merchantStatePromise;
  merchantStatePromise = once<ClientGameState>(merchantB, 'game:state');
  merchantB.emit('room:join', { roomCode, name: 'Cal', avatar: 'Bear' });
  await merchantStatePromise;

  hostStatePromise = once<ClientGameState>(host, 'game:state');
  const merchantAStart = once<ClientGameState>(merchantA, 'game:state');
  const merchantBStart = once<ClientGameState>(merchantB, 'game:state');
  host.emit('game:start');
  const [hostStart, aStart, bStart] = await Promise.all([hostStatePromise, merchantAStart, merchantBStart]);
  assert.ok([hostStart, aStart, bStart].every((state) => state.phase === 'DEAL' && state.dealPlayerIds.length === 3));
  assert.deepEqual(new Set([hostStart.youPlayerId, aStart.youPlayerId, bStart.youPlayerId]).size, 3);

  hostStatePromise = once<ClientGameState>(host, 'game:state');
  const merchantDealView = once<ClientGameState>(merchantA, 'game:state');
  host.emit('deal:card');
  const [hostAfterDeal, merchantAfterDeal] = await Promise.all([hostStatePromise, merchantDealView]);
  assert.equal(hostAfterDeal.players.find((player) => player.id === host.id)?.hand.length, 1);
  assert.notEqual(hostAfterDeal.players.find((player) => player.id === host.id)?.hand[0].name, 'Hidden');
  assert.equal(merchantAfterDeal.players.find((player) => player.id === host.id)?.hand[0].name, 'Hidden');
});

test('lobby disconnect transfers host and removes an empty room', async (t) => {
  const server = await startTestServer(t);
  const host = await connectedClient(server.url); const guest = await connectedClient(server.url);
  server.clients.push(host, guest);
  const hostStatePromise = once<ClientGameState>(host, 'game:state');
  host.emit('room:create', { name: 'Host', avatar: 'Owl' });
  const roomCode = (await hostStatePromise).roomCode;
  const guestJoin = once<ClientGameState>(guest, 'game:state');
  guest.emit('room:join', { roomCode, name: 'Guest', avatar: 'Fox' });
  await guestJoin;
  const transferred = once<ClientGameState>(guest, 'game:state');
  host.disconnect();
  const guestState = await transferred;
  assert.equal(guestState.hostPlayerId, guest.id);
  assert.equal(guestState.players.length, 1);
  guest.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(server.rooms.size, 0);
});

test('every gameplay socket action is wired through a complete one-round match', async (t) => {
  const server = await startTestServer(t);
  const host = await connectedClient(server.url);
  const merchantA = await connectedClient(server.url);
  const merchantB = await connectedClient(server.url);
  const merchantC = await connectedClient(server.url);
  server.clients.push(host, merchantA, merchantB, merchantC);

  const created = emitAndReadState(host, 'room:create', { name: 'Ada', avatar: 'Owl', maxRounds: 1 });
  const roomCode = (await created).roomCode;
  await emitAndReadState(merchantA, 'room:join', { roomCode, name: 'Bea', avatar: 'Fox' });
  await emitAndReadState(merchantB, 'room:join', { roomCode, name: 'Cal', avatar: 'Bear' });
  await emitAndReadState(merchantC, 'room:join', { roomCode, name: 'Dee', avatar: 'Rabbit' });
  await emitAndReadState(host, 'game:start', undefined, (state) => state.phase === 'DEAL');

  const players = [host, merchantA, merchantB, merchantC];
  const latest = new Map<Socket, ClientGameState>();
  for (const player of players) {
    for (let count = 0; count < 6; count += 1) latest.set(player, await emitAndReadState(player, 'deal:card', undefined, (state) => state.players.find((candidate) => candidate.id === player.id)?.hand.length === count + 1));
  }
  assert.equal(latest.get(merchantC)?.phase, 'DRAW');

  const aCard = latest.get(merchantA)!.players.find((player) => player.id === merchantA.id)!.hand[0];
  latest.set(merchantA, await emitAndReadState(merchantA, 'draw:complete', { cardIds: [aCard.id], source: 'DECK', discardPile: 'LEFT' }, (state) => state.drawCompletedPlayerIds.includes(merchantA.id!)));
  const bCard = latest.get(merchantB)!.players.find((player) => player.id === merchantB.id)!.hand[0];
  latest.set(merchantB, await emitAndReadState(merchantB, 'draw:trade', { cardIds: [bCard.id], discardPile: 'RIGHT' }, (state) => state.drawPreparedPlayerIds.includes(merchantB.id!)));
  latest.set(merchantB, await emitAndReadState(merchantB, 'draw:card', { source: 'DECK' }, (state) => state.drawCompletedPlayerIds.includes(merchantB.id!)));
  latest.set(merchantC, await emitAndReadState(merchantC, 'draw:skip', undefined, (state) => state.phase === 'BAG_SUBMIT'));
  assert.equal(latest.get(merchantC)?.phase, 'BAG_SUBMIT');

  for (const [index, merchant] of [merchantA, merchantB, merchantC].entries()) {
    const view = latest.get(merchant)!;
    const card = view.players.find((player) => player.id === merchant.id)!.hand[0];
    latest.set(merchant, await emitAndReadState(merchant, 'bag:submit', { cardIds: [card.id], declaration: card.subType }, (state) => index === 2 ? state.phase === 'INSPECT_QUEUE' : state.submittedPlayerIds.includes(merchant.id!)));
  }
  assert.equal(latest.get(merchantC)?.phase, 'INSPECT_QUEUE');

  await emitAndReadState(merchantA, 'bribe:update', { amount: 4 }, (state) => state.currentBribe?.offerGold === 4);
  await emitAndReadState(host, 'bribe:update', { amount: 4 }, (state) => state.currentBribe?.demandGold === 4);
  await emitAndReadState(host, 'inspection:pass', undefined, (state) => state.activeInspectionPlayerId === merchantB.id);
  await emitAndReadState(host, 'inspection:inspect', { pile: 'RIGHT' }, (state) => state.activeInspectionPlayerId === merchantC.id);
  const finished = await emitAndReadState(host, 'inspection:pass', undefined, (state) => state.phase === 'GAME_OVER');
  assert.equal(finished.phase, 'GAME_OVER');
  assert.equal(finished.scores.length, 4);
  const reset = await emitAndReadState(host, 'game:reset', undefined, (state) => state.phase === 'LOBBY');
  assert.equal(reset.phase, 'LOBBY');
  assert.equal(reset.currentRound, 0);
});

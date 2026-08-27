import express from 'express';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { Server } from 'socket.io';
import type { Avatar, DiscardPile, DrawSource, ItemType } from '../shared/types.js';
import {
  addPlayer, clientState, completeDraw, createRoom, drawCard, drawDealCard, inspectBag, passBag, resetGame, skipDraw, startGame, submitBag, tradeCards, updateBribe,
  type Room,
} from './gameEngine.js';

const PORT = Number(process.env.PORT ?? process.env.GAME_PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

export function createGameServer() {
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000', methods: ['GET', 'POST'] } });
const rooms = new Map<string, Room>();
const memberships = new Map<string, { roomCode: string; playerId: string }>();

app.get('/health', (_request, response) => response.json({ ok: true, rooms: rooms.size }));

function code(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let value = '';
  do { value = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(''); } while (rooms.has(value));
  return value;
}

function broadcast(room: Room): void {
  for (const socket of io.sockets.sockets.values()) {
    const member = memberships.get(socket.id);
    if (member?.roomCode === room.state.roomCode) socket.emit('game:state', clientState(room, member.playerId));
  }
}

function fail(socket: Parameters<typeof io.on>[1] extends (socket: infer S) => void ? S : never, error: unknown): void {
  socket.emit('game:error', { message: error instanceof Error ? error.message : 'Something went wrong' });
}

io.on('connection', (socket) => {
  socket.on('room:create', (payload: { name: string; avatar: Avatar; maxRounds?: number }) => {
    try {
      const roomCode = code();
      const room = createRoom(roomCode, socket.id, payload.name, payload.avatar, payload.maxRounds);
      rooms.set(roomCode, room); memberships.set(socket.id, { roomCode, playerId: socket.id }); socket.join(roomCode); broadcast(room);
    } catch (error) { fail(socket, error); }
  });

  socket.on('room:join', (payload: { roomCode: string; name: string; avatar: Avatar }) => {
    try {
      const roomCode = payload.roomCode.trim().toUpperCase();
      const room = rooms.get(roomCode);
      if (!room) throw new Error('Room not found');
      addPlayer(room, socket.id, payload.name, payload.avatar);
      memberships.set(socket.id, { roomCode, playerId: socket.id }); socket.join(roomCode); broadcast(room);
    } catch (error) { fail(socket, error); }
  });

  const withRoom = (action: (room: Room, playerId: string) => void) => {
    try {
      const member = memberships.get(socket.id);
      if (!member) throw new Error('Join a room first');
      const room = rooms.get(member.roomCode);
      if (!room) throw new Error('This room has closed');
      action(room, member.playerId); broadcast(room);
    } catch (error) { fail(socket, error); }
  };

  socket.on('game:start', () => withRoom(startGame));
  socket.on('draw:complete', (payload: { cardIds: string[]; source: DrawSource; discardPile: DiscardPile }) => withRoom((room, id) => completeDraw(room, id, payload.cardIds, payload.source, payload.discardPile)));
  socket.on('deal:card', () => withRoom(drawDealCard));
  socket.on('draw:trade', (payload: { cardIds: string[]; discardPile: DiscardPile }) => withRoom((room, id) => tradeCards(room, id, payload.cardIds, payload.discardPile)));
  socket.on('draw:card', (payload: { source: DrawSource }) => withRoom((room, id) => drawCard(room, id, payload.source)));
  socket.on('draw:skip', () => withRoom(skipDraw));
  socket.on('bag:submit', (payload: { cardIds: string[]; declaration: ItemType }) => withRoom((room, id) => submitBag(room, id, payload.cardIds, payload.declaration)));
  socket.on('bribe:update', (payload: { amount: number }) => withRoom((room, id) => updateBribe(room, id, payload.amount)));
  socket.on('inspection:pass', () => withRoom(passBag));
  socket.on('inspection:inspect', (payload: { pile: DiscardPile }) => withRoom((room, id) => inspectBag(room, id, payload.pile)));
  socket.on('game:reset', () => withRoom(resetGame));

  socket.on('disconnect', () => {
    const member = memberships.get(socket.id); memberships.delete(socket.id);
    if (!member) return;
    const room = rooms.get(member.roomCode);
    if (!room || room.state.phase !== 'LOBBY') return;
    room.state.players = room.state.players.filter((player) => player.id !== member.playerId);
    if (!room.state.players.length) rooms.delete(member.roomCode);
    else {
      if (room.hostPlayerId === member.playerId) room.hostPlayerId = room.state.players[0].id;
      room.state.players.forEach((player, index) => { player.isSheriff = index === 0; }); broadcast(room);
    }
  });
});

return { app, server, io, rooms, memberships };
}

const isMainModule = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  const { server } = createGameServer();
  server.listen(PORT, HOST, () => console.log(`Game server listening on http://${HOST}:${PORT}`));
}

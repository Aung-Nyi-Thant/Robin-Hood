import type { ClientGameState } from '@/shared/types';

type TurnState = Pick<ClientGameState, 'phase' | 'players' | 'sheriffIndex' | 'drawCompletedPlayerIds' | 'activeDrawPlayerId'>;

export function resolveActiveDrawPlayerId(state: TurnState): string | null {
  if (state.phase !== 'DRAW') return null;
  if (state.activeDrawPlayerId) return state.activeDrawPlayerId;
  for (let offset = 1; offset < state.players.length; offset += 1) {
    const player = state.players[(state.sheriffIndex + offset) % state.players.length];
    if (!player.isSheriff && !state.drawCompletedPlayerIds.includes(player.id)) return player.id;
  }
  return null;
}

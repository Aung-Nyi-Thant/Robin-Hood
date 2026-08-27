import type { DiscardPile } from '@/shared/types';

export interface GameEffects {
  id: number;
  coins: Array<{ playerId: string; amount: number }>;
  cards: Array<{ id: string; icon: string; pile: DiscardPile }>;
}

export function dismissCoinEffects(effects: GameEffects): GameEffects {
  return { ...effects, coins: [] };
}


export const PASS_BAG_RETURN_MS = 1450;
export const PASS_HANDOFF_GAP_MS = 120;
export const PASS_CARD_STAGGER_MS = 85;
export const PASS_CARD_PLACE_MS = 850;
export const PASS_RESOLUTION_DURATION_MS = 2950;

export function passCardDelayMs(index: number): number {
  return PASS_BAG_RETURN_MS + PASS_HANDOFF_GAP_MS + index * PASS_CARD_STAGGER_MS;
}

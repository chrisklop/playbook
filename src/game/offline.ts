import type { GameState } from './types';
import { tick } from './core/tick';

const MIN_AWAY_MS = 2 * 60 * 1000;   // < 2 min: no catch-up
const MAX_AWAY_MS = 60 * 60 * 1000;  // > 1 hour: capped catch-up
const BUFF_THRESHOLD_MS = 30 * 60 * 1000;
const BUFF_MULT = 2;
const BUFF_DURATION_MS = 5 * 60 * 1000;
const OFFLINE_EFFICIENCY = 0.25;

/**
 * Apply offline catch-up to a freshly hydrated state. Returns total catch-up
 * seconds (0 if below threshold). Should be called once after deserialize().
 */
export function applyOffline(state: GameState, now: number = Date.now()): number {
  const awayMs = Math.max(0, now - state.lastTick);
  if (awayMs < MIN_AWAY_MS) {
    state.lastTick = now;
    return 0;
  }

  const cappedMs = Math.min(awayMs, MAX_AWAY_MS);
  // Run the tick fn with a damped dt — same logic as a live tick.
  // Single coarse step is fine for v0.1 (linear baseline production).
  const fakePrevTick = now - Math.floor(cappedMs * OFFLINE_EFFICIENCY);
  state.lastTick = fakePrevTick;
  tick(state, now);

  if (awayMs >= BUFF_THRESHOLD_MS) {
    state.returnBuff = {
      until: now + BUFF_DURATION_MS,
      mult: BUFF_MULT,
    };
  }

  return cappedMs / 1000;
}

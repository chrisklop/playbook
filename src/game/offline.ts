import { type GameState, RESOURCE_IDS, type ResourceId } from './types';
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
 * Sets state.pendingOfflineSummary so the UI can render a welcome-back modal.
 */
export function applyOffline(state: GameState, now: number = Date.now()): number {
  const awayMs = Math.max(0, now - state.lastTick);
  if (awayMs < MIN_AWAY_MS) {
    state.lastTick = now;
    return 0;
  }

  const cappedMs = Math.min(awayMs, MAX_AWAY_MS);
  // Snapshot resources BEFORE the catch-up tick.
  const before: Partial<Record<ResourceId, number>> = {};
  for (const r of RESOURCE_IDS) before[r] = state.resources[r];

  // Run the tick fn with a damped dt — same logic as a live tick.
  const fakePrevTick = now - Math.floor(cappedMs * OFFLINE_EFFICIENCY);
  state.lastTick = fakePrevTick;
  tick(state, now);

  // Compute gains.
  const gains: Partial<Record<ResourceId, number>> = {};
  for (const r of RESOURCE_IDS) {
    const delta = state.resources[r] - (before[r] ?? 0);
    if (delta > 0.5) gains[r] = delta;
  }

  if (awayMs >= BUFF_THRESHOLD_MS) {
    state.returnBuff = {
      until: now + BUFF_DURATION_MS,
      mult: BUFF_MULT,
    };
  }

  state.pendingOfflineSummary = {
    awaySec: Math.floor(awayMs / 1000),
    gains,
    buffActive: awayMs >= BUFF_THRESHOLD_MS,
  };

  return cappedMs / 1000;
}

// Pure tick function. Mutates the passed state in place. No Svelte, no DOM.
// All time-dependent logic flows through dt (seconds since last tick).

import { type GameState, PLATFORM_IDS, RESOURCE_IDS } from '../types';
import { clamp } from './math';

const HEAT_DECAY_PER_S = 0.005;
const CURE_FROM_HEAT_PER_S = 0.0002;

// Phase 1 placeholder: a tiny baseline production so the smoke test shows motion.
// Real production logic (assets × DEPICT × platforms) lands in Phase 2.
function baselineProduction(state: GameState, dt: number): void {
  const buff = state.returnBuff && state.returnBuff.until > state.lastTick ? state.returnBuff.mult : 1;
  const sockPuppets = state.assets.sockPuppet ?? 0;
  const baseRate = 0.5 * sockPuppets * buff;
  const next = state.resources.attention + baseRate * dt;
  state.resources.attention = Math.min(next, state.caps.attention);
}

function tickHeat(state: GameState, dt: number): void {
  for (const id of PLATFORM_IDS) {
    const p = state.platforms[id];
    if (!p.unlocked) continue;
    if (p.burned && p.burnedUntil > state.lastTick) continue;
    if (p.burned && p.burnedUntil <= state.lastTick) {
      p.burned = false;
      p.burnedUntil = 0;
    }
    p.heat = clamp(p.heat - HEAT_DECAY_PER_S * dt, 0, 1);
  }
}

function tickCure(state: GameState, dt: number): void {
  if (state.reveal.active) return;
  let totalHeat = 0;
  for (const id of PLATFORM_IDS) {
    if (state.platforms[id].unlocked) totalHeat += state.platforms[id].heat;
  }
  state.cure = clamp(state.cure + CURE_FROM_HEAT_PER_S * totalHeat * dt, 0, 1);
}

function tickEvents(state: GameState): void {
  if (state.event && state.event.until <= state.lastTick) state.event = null;
  if (state.returnBuff && state.returnBuff.until <= state.lastTick) state.returnBuff = null;
}

function trackPeaks(state: GameState): void {
  for (const id of RESOURCE_IDS) {
    const v = state.resources[id];
    if (v > state.peakResources[id]) state.peakResources[id] = v;
  }
}

/**
 * Advance the game state by dt seconds. Mutates state in place.
 * Updates state.lastTick = now.
 */
export function tick(state: GameState, now: number): void {
  const dt = Math.max(0, (now - state.lastTick) / 1000);
  state.lastTick = now;

  baselineProduction(state, dt);
  tickHeat(state, dt);
  tickCure(state, dt);
  tickEvents(state);
  trackPeaks(state);
}

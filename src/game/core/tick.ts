// Pure tick function. Mutates the passed state in place. No Svelte, no DOM.

import { type GameState, PLATFORM_IDS, PHASE_ORDER, RESOURCE_IDS } from '../types';
import { clamp } from './math';
import { computeCaps, computeRates } from './production';
import { checkPhaseTransitions } from './actions';
import { tickPlatforms } from './platforms';
import { tickCureEvents } from './cure';
import { tickEventScheduler } from './events';

const CURE_FROM_HEAT_PER_S = 0.0002;

// Heat/cure are Blog-era+ mechanics. Grassroots is abstract — sock puppets
// just produce attention; no platform diversification yet, no counter-pressure.
function platformEra(state: GameState): boolean {
  return PHASE_ORDER.indexOf(state.phase) >= PHASE_ORDER.indexOf('blog');
}

function tickEcon(state: GameState, dt: number): void {
  state.caps = computeCaps(state);
  const rates = computeRates(state);
  for (const r of RESOURCE_IDS) {
    const cap = state.caps[r];
    const next = state.resources[r] + rates[r] * dt;
    state.resources[r] = cap > 0 ? Math.min(next, cap) : next;
    if (state.resources[r] < 0) state.resources[r] = 0;
  }
}

function tickCure(state: GameState, dt: number): void {
  if (state.reveal.active) return;
  if (!platformEra(state)) return;
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

export function tick(state: GameState, now: number): void {
  const dt = Math.max(0, (now - state.lastTick) / 1000);
  state.lastTick = now;

  tickEcon(state, dt);
  if (platformEra(state)) tickPlatforms(state, dt);
  tickCure(state, dt);
  if (platformEra(state)) tickCureEvents(state);
  tickEvents(state);
  tickEventScheduler(state);
  checkPhaseTransitions(state);
  trackPeaks(state);
}

// Per-platform posting mechanic. Each unlocked platform has a charge bar
// that fills over time. When charged, the player (or auto-poster) fires a
// "post" that converts assets × platform amp × DEPICT mults into a burst
// of attention, paying a small heat tax on that platform.

import type { GameState, PlatformId, DepictId } from '../types';
import { DEPICT_IDS } from '../types';
import { PLATFORM_META } from '../../lib/platforms';
import { ASSETS } from './catalog';
import { treeTotalLevel } from './catalog';
import { clamp } from './math';

const BASE_CHARGE_TIME_S = 5;
const HEAT_PER_POST = 0.015;
const POST_BASE_YIELD_MULT = 5;

export function chargeTimeSeconds(state: GameState): number {
  // Sum DEPICT levels across all trees; each 5 levels = 5% reduction.
  let total = 0;
  for (const d of DEPICT_IDS) total += treeTotalLevel(state, d);
  const reduction = clamp(total * 0.01, 0, 0.7); // 100 levels = 100% reduction; capped at 70%
  return BASE_CHARGE_TIME_S * (1 - reduction);
}

function dominantTechnique(state: GameState): DepictId {
  let best: DepictId = 'emotional';
  let bestLevel = -1;
  for (const d of DEPICT_IDS) {
    const total = treeTotalLevel(state, d);
    if (total > bestLevel) { bestLevel = total; best = d; }
  }
  return best;
}

function botAssetCount(state: GameState): number {
  let total = 0;
  for (const a of ASSETS) {
    if (a.kind === 'bot') total += state.assets[a.id] ?? 0;
  }
  return total;
}

export function postYield(state: GameState, platformId: PlatformId): number {
  const meta = PLATFORM_META.find((m) => m.id === platformId);
  if (!meta) return 0;
  const tech = dominantTechnique(state);
  const amp = meta.amp[tech] ?? 1;
  const bots = botAssetCount(state);
  // Auto-poster reduces efficiency slightly so manual is still rewarded.
  const autoBonus = 1 + 0.1 * (state.assets.autoPoster ?? 0);
  return Math.max(1, bots * amp * POST_BASE_YIELD_MULT * autoBonus);
}

// Manual posts may fire early — yield scales with chargeProgress.
// This keeps the POST button usable when auto-poster owns the full-charge
// window (auto-fire happens within a single tick, the UI never sees POST
// state at chargeProgress=1 with auto-poster on, so manual posts must be
// possible from partial charge).
const MIN_MANUAL_CHARGE = 0.5;

export function canPost(state: GameState, platformId: PlatformId): boolean {
  const p = state.platforms[platformId];
  if (!p?.unlocked || p.burned) return false;
  return p.chargeProgress >= MIN_MANUAL_CHARGE;
}

export function postPlatform(state: GameState, platformId: PlatformId): boolean {
  if (!canPost(state, platformId)) return false;
  const p = state.platforms[platformId];
  const y = postYield(state, platformId) * p.chargeProgress; // proportional yield
  const attCap = state.caps.attention;
  const engCap = state.caps.engagement;

  // Attention burst — fills attention first, then any overflow converts to
  // engagement at 10% rate (so posts always reward, never wasted at cap).
  const attRoom = Math.max(0, (attCap || Infinity) - state.resources.attention);
  const attGain = Math.min(y, attRoom);
  state.resources.attention += attGain;

  const overflow = y - attGain;
  if (overflow > 0 && engCap > 0) {
    const engRoom = Math.max(0, engCap - state.resources.engagement);
    const engGain = Math.min(overflow * 0.1, engRoom);
    state.resources.engagement += engGain;
  }

  p.chargeProgress = 0;
  p.heat = clamp(p.heat + HEAT_PER_POST, 0, 1);
  return true;
}

export function tickPosting(state: GameState, dt: number): void {
  const chargeTime = chargeTimeSeconds(state);
  const rate = 1 / chargeTime; // chargeProgress per second
  const autoOn = (state.assets.autoPoster ?? 0) >= 1;

  for (const meta of PLATFORM_META) {
    const p = state.platforms[meta.id];
    if (!p.unlocked || p.burned) continue;
    p.chargeProgress = Math.min(1, p.chargeProgress + rate * dt);
    if (autoOn && p.chargeProgress >= 1) {
      postPlatform(state, meta.id);
    }
  }
}

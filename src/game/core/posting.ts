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
const HEAT_PER_POST = 0.008;
const POST_BASE_YIELD_MULT = 5;
// Heat → yield penalty curve: yield × (1 - heat × HEAT_YIELD_PENALTY).
// At heat=0  → 100% yield, at heat=0.5 → 70%, at heat=1.0 → 40%.
const HEAT_YIELD_PENALTY = 0.6;
// Freestyle posts: fire on demand, no charge required, big heat cost.
const HEAT_PER_FREESTYLE_POST = 0.04;
const FREESTYLE_MIN_YIELD = 0.3; // even with 0 charge, freestyle gives 30% yield

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
  // Heat penalty: hot platforms produce less per post.
  const p = state.platforms[platformId];
  const heatPenalty = 1 - (p?.heat ?? 0) * HEAT_YIELD_PENALTY;
  return Math.max(1, bots * amp * POST_BASE_YIELD_MULT * autoBonus * heatPenalty);
}

// POST fires at full charge only. Auto-poster handles the auto-fire path;
// without it, the player clicks once charge fills to 1.0.
export function canPost(state: GameState, platformId: PlatformId): boolean {
  const p = state.platforms[platformId];
  if (!p?.unlocked) return false;
  // Legacy: very old saves may still have burned=true. Allow posting as soon
  // as the burn cooldown expires; new burns are never set (see platforms.ts).
  if (p.burned && p.burnedUntil > state.lastTick) return false;
  return p.chargeProgress >= 1;
}

export function postPlatform(state: GameState, platformId: PlatformId): boolean {
  if (!canPost(state, platformId)) return false;
  const p = state.platforms[platformId];
  const y = postYield(state, platformId);
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

/**
 * Freestyle post — active player engagement when auto-poster owns the
 * regular cycle. Always available regardless of charge level. Yields
 * proportional to charge (with a 30% floor so spamming at 0 still does
 * SOMETHING). Heat cost is 5× a normal post — high engagement, high risk.
 * Does NOT consume / reset the charge bar — the auto-poster cycle continues.
 */
export function freestylePost(state: GameState, platformId: PlatformId): boolean {
  const p = state.platforms[platformId];
  if (!p?.unlocked) return false;
  if (p.burned && p.burnedUntil > state.lastTick) return false;

  const yieldRatio = Math.max(FREESTYLE_MIN_YIELD, p.chargeProgress);
  const y = postYield(state, platformId) * yieldRatio;
  const attCap = state.caps.attention;
  const engCap = state.caps.engagement;

  const attRoom = Math.max(0, (attCap || Infinity) - state.resources.attention);
  const attGain = Math.min(y, attRoom);
  state.resources.attention += attGain;

  const overflow = y - attGain;
  if (overflow > 0 && engCap > 0) {
    const engRoom = Math.max(0, engCap - state.resources.engagement);
    const engGain = Math.min(overflow * 0.1, engRoom);
    state.resources.engagement += engGain;
  }

  // Big heat cost — freestyle is loud.
  p.heat = clamp(p.heat + HEAT_PER_FREESTYLE_POST, 0, 1);
  return true;
}

export function freestyleYield(state: GameState, platformId: PlatformId): number {
  const p = state.platforms[platformId];
  if (!p) return 0;
  const yieldRatio = Math.max(FREESTYLE_MIN_YIELD, p.chargeProgress);
  return postYield(state, platformId) * yieldRatio;
}

export function tickPosting(state: GameState, dt: number): void {
  const chargeTime = chargeTimeSeconds(state);
  const rate = 1 / chargeTime; // chargeProgress per second
  const autoOn = (state.assets.autoPoster ?? 0) >= 1;

  for (const meta of PLATFORM_META) {
    const p = state.platforms[meta.id];
    if (!p.unlocked) continue;
    // Charge always fills (no platform lockout). Auto-fires when charged
    // AND not under a legacy burn cooldown.
    p.chargeProgress = Math.min(1, p.chargeProgress + rate * dt);
    if (p.burned && p.burnedUntil > state.lastTick) continue;
    if (autoOn && p.chargeProgress >= 1) {
      postPlatform(state, meta.id);
    }
  }
}

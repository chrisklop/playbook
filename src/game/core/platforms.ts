// Per-platform tick: heat accumulation, reach accumulation, ban triggers.
// Reach is currently a visual readout — Phase 3C will route it into resource
// generation as the dominant production path (replacing direct asset → resource).

import type { GameState, PlatformId, DepictId } from '../types';
import { PLATFORM_IDS, DEPICT_IDS } from '../types';
import { PLATFORM_META } from '../../lib/platforms';
import { clamp } from './math';
import { ASSETS } from './catalog';

// Heat math is gated by the per-platform postRate slider — slowing posts
// slows both heat gain AND charge fill, so the player has a direct dial.
// At 100% rate, equilibrium ~0.5 with 100 bots on X. Player can scale to 1000+
// bots if they throttle the slider.
const HEAT_DECAY_PER_S = 0.015;
const HEAT_PER_BOT_PER_S = 0.0001;
const REACH_DECAY_PER_S = 0.02;

// When heat hits 1.0, platform is "shadow-banned" — no posting for 30s.
// Heat decays 3× faster during ban (so player recovers and can resume).
const BAN_DURATION_MS = 30_000;
const BAN_DECAY_MULT = 3;
const BAN_HEAT_RESET = 0.4;

/** Dominant DEPICT technique = highest-level upgrade tree. */
function dominantTechnique(state: GameState): DepictId {
  let best: DepictId = 'emotional';
  let bestLevel = -1;
  for (const d of DEPICT_IDS) {
    let total = 0;
    // Cheap lookup — find any upgrade in this tree and sum levels.
    for (const id of Object.keys(state.upgrades)) {
      if (id.startsWith(d + '-')) total += state.upgrades[id];
    }
    if (total > bestLevel) {
      bestLevel = total;
      best = d;
    }
  }
  return best;
}

function unlockedPlatforms(state: GameState): PlatformId[] {
  return PLATFORM_IDS.filter((id) => state.platforms[id].unlocked && !state.platforms[id].burned);
}

export function isBanned(state: GameState, id: PlatformId): boolean {
  const p = state.platforms[id];
  return !!(p && p.burned && p.burnedUntil > state.lastTick);
}

function botAssetCount(state: GameState): number {
  let total = 0;
  for (const a of ASSETS) {
    if (a.kind === 'bot') total += state.assets[a.id] ?? 0;
  }
  return total;
}

function totalAssetOutput(state: GameState): number {
  // Sum of all per-second asset production across all resources.
  let total = 0;
  for (const a of ASSETS) {
    const count = state.assets[a.id] ?? 0;
    if (count <= 0) continue;
    for (const rate of Object.values(a.produces)) {
      total += (rate as number) * count;
    }
  }
  return total;
}

export function tickPlatforms(state: GameState, dt: number): void {
  // FIRST PASS — always clear expired burns, even if it would leave the
  // active-platform set empty. Otherwise: when X is the only unlocked
  // platform and it's burned, unlockedPlatforms() returns [], the function
  // early-returns, and the burn never clears (permanent lockout bug).
  for (const id of PLATFORM_IDS) {
    const p = state.platforms[id];
    if (p.unlocked && p.burned && p.burnedUntil <= state.lastTick) {
      p.burned = false;
      p.burnedUntil = 0;
    }
  }

  const active = unlockedPlatforms(state);
  if (active.length === 0) return;

  const technique = dominantTechnique(state);
  const bots = botAssetCount(state);
  const outputPerPlatform = totalAssetOutput(state) / active.length;
  const botsPerPlatform = bots / active.length;

  for (const id of PLATFORM_IDS) {
    const p = state.platforms[id];
    if (!p.unlocked) continue;

    const meta = PLATFORM_META.find((m) => m.id === id);
    if (!meta) continue;

    // Reach: asset output × platform's amp for dominant technique. Decays slowly.
    const ampForTechnique = meta.amp[technique] ?? 1;
    const reachGain = outputPerPlatform * ampForTechnique * dt;
    const reachDecay = p.reach * REACH_DECAY_PER_S * dt;
    p.reach = Math.max(0, p.reach + reachGain - reachDecay);

    // Heat: bot-asset count contributes, decays with platform moderation.
    // postRate slider scales bot-heat-gain — throttling posts also throttles
    // the heat your bots generate. Player has a direct dial.
    // Flood the Zone synergy boosts heat decay rate ×1.4 platform-wide.
    const rate = p.postRate ?? 1;
    const heatGain = botsPerPlatform * HEAT_PER_BOT_PER_S * (1 - meta.moderation * 0.5) * rate * dt;
    const floodMult = state.flags['syn:flood-the-zone'] ? 1.4 : 1.0;
    const banMult = isBanned(state, id) ? BAN_DECAY_MULT : 1;
    const heatDecay = HEAT_DECAY_PER_S * (0.5 + meta.moderation) * floodMult * banMult * dt;
    p.heat = clamp(p.heat + heatGain - heatDecay, 0, 1);

    // Deterministic shadow-ban at heat=1.0: 30s lockout with fast cooldown.
    // Player knows: full bar = forced break. Predictable, no RNG.
    if (p.heat >= 1 && !p.burned) {
      p.burned = true;
      p.burnedUntil = state.lastTick + BAN_DURATION_MS;
      p.heat = BAN_HEAT_RESET;
      p.chargeProgress = 0;
      state.log.unshift(`⚠ ${meta.name} shadow-banned. 30s cooldown.`);
    }
  }
}

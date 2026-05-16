// Per-platform tick: heat accumulation, reach accumulation, ban triggers.
// Reach is currently a visual readout — Phase 3C will route it into resource
// generation as the dominant production path (replacing direct asset → resource).

import type { GameState, PlatformId, DepictId } from '../types';
import { PLATFORM_IDS, DEPICT_IDS } from '../types';
import { PLATFORM_META } from '../../lib/platforms';
import { clamp } from './math';
import { ASSETS } from './catalog';

const HEAT_DECAY_PER_S = 0.005;
const HEAT_PER_BOT_PER_S = 0.0008;
const REACH_DECAY_PER_S = 0.02;

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
  const active = unlockedPlatforms(state);
  if (active.length === 0) return;

  const technique = dominantTechnique(state);
  const bots = botAssetCount(state);
  const outputPerPlatform = totalAssetOutput(state) / active.length;
  const botsPerPlatform = bots / active.length;

  for (const id of PLATFORM_IDS) {
    const p = state.platforms[id];
    if (!p.unlocked) continue;

    // Burn cooldown.
    if (p.burned && p.burnedUntil <= state.lastTick) {
      p.burned = false;
      p.burnedUntil = 0;
    }
    if (p.burned) continue;

    const meta = PLATFORM_META.find((m) => m.id === id);
    if (!meta) continue;

    // Reach: asset output × platform's amp for dominant technique. Decays slowly.
    const ampForTechnique = meta.amp[technique] ?? 1;
    const reachGain = outputPerPlatform * ampForTechnique * dt;
    const reachDecay = p.reach * REACH_DECAY_PER_S * dt;
    p.reach = Math.max(0, p.reach + reachGain - reachDecay);

    // Heat: bot-asset count contributes, decays with platform moderation.
    const heatGain = botsPerPlatform * HEAT_PER_BOT_PER_S * (1 - meta.moderation * 0.5) * dt;
    const heatDecay = HEAT_DECAY_PER_S * (0.5 + meta.moderation) * dt;
    p.heat = clamp(p.heat + heatGain - heatDecay, 0, 1);

    // Ban triggers — high heat may burn the platform for a cooldown.
    if (p.heat >= 0.85 && Math.random() < (p.heat - 0.85) / 15) {
      p.burned = true;
      p.burnedUntil = state.lastTick + 90_000; // 90s lockout
      p.heat = 0.4;
      p.reach *= 0.5;
      state.log.unshift(`Platform burned: ${meta.name} suspends a wave of your accounts.`);
    }
  }
}

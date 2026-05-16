// Compute current per-second production and current caps from declarative state.
// Pure functions — no mutation.

import type { GameState, ResourceId } from '../types';
import { ASSETS, UPGRADES } from './catalog';
import { RESOURCE_IDS } from '../types';

export interface ProductionSnapshot {
  rates: Record<ResourceId, number>;       // net /sec
  caps: Record<ResourceId, number>;
  depictMult: Record<ResourceId, number>;
}

function emptyResourceMap(fill = 0): Record<ResourceId, number> {
  return Object.fromEntries(RESOURCE_IDS.map((id) => [id, fill])) as Record<ResourceId, number>;
}

export function computeDepictMultipliers(state: GameState): Record<ResourceId, number> {
  const mult = emptyResourceMap(1);
  for (const u of UPGRADES) {
    const level = state.upgrades[u.id] ?? 0;
    if (level <= 0) continue;
    for (const [res, perLevel] of Object.entries(u.multiplier)) {
      const r = res as ResourceId;
      // Stack additively per level then multiply onto base (1 + total).
      mult[r] *= 1 + (perLevel as number) * level;
    }
  }
  return mult;
}

export function computeCaps(state: GameState): Record<ResourceId, number> {
  const caps = emptyResourceMap(0);
  // Base attention cap rises with outlet count.
  caps.attention = 50 + 40 * (state.assets.outlet ?? 0);
  if (state.flags['editorialCalendar']) {
    // Editorial Calendar paradigm: cap grows faster.
    caps.attention = Math.floor(caps.attention * 1.5);
    caps.engagement = state.caps.engagement || 25;
  }
  // Carry forward later-era caps (set by other projects/upgrades).
  caps.followers = state.caps.followers || 0;
  caps.credibility = state.caps.credibility || 0;
  caps.narrativeDominance = state.caps.narrativeDominance || 0;
  caps.syntheticReality = state.caps.syntheticReality || 0;
  return caps;
}

export function computeRates(state: GameState): Record<ResourceId, number> {
  const rates = emptyResourceMap(0);
  const buff =
    state.returnBuff && state.returnBuff.until > state.lastTick
      ? state.returnBuff.mult
      : 1;
  const depict = computeDepictMultipliers(state);

  for (const asset of ASSETS) {
    const count = state.assets[asset.id] ?? 0;
    if (count <= 0) continue;
    for (const [res, perTickPerUnit] of Object.entries(asset.produces)) {
      const r = res as ResourceId;
      rates[r] += (perTickPerUnit as number) * count;
    }
  }

  // Apply DEPICT multiplier × return buff.
  for (const r of RESOURCE_IDS) {
    rates[r] *= depict[r] * buff;
  }

  return rates;
}

export function snapshot(state: GameState): ProductionSnapshot {
  return {
    rates: computeRates(state),
    caps: computeCaps(state),
    depictMult: computeDepictMultipliers(state),
  };
}

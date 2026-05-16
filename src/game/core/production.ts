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
  const outlets = state.assets.outlet ?? 0;
  if (state.flags['editorialCalendar']) {
    // Editorial Calendar PARADIGM: outlet cap contribution flips from
    // additive to geometric (each new outlet adds 12% more than the previous).
    // Geometric sum: 40 × (1.12^n − 1) / 0.12. Strictly outpaces cost growth
    // of 1.10, so the invariant holds at any scale.
    caps.attention = 50 + Math.floor(40 * (Math.pow(1.12, outlets) - 1) / 0.12);
    caps.engagement = Math.max(state.caps.engagement ?? 0, 50);
  } else {
    // Pre-paradigm: linear cap. Sustainable up to ~50 outlets — player should
    // trigger Editorial Calendar long before that.
    caps.attention = 50 + 40 * outlets;
  }
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

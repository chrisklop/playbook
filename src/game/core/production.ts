// Compute current per-second production and current caps from declarative state.
// Pure functions — no mutation.

import type { GameState, ResourceId } from '../types';
import { ASSETS, UPGRADES } from './catalog';
import { RESOURCE_IDS } from '../types';
import { totalAchievementBuffs } from './achievements';
import { loadLegacy, legacyMultiplier } from '../legacy';
import { PATRONS } from './patrons';

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
      mult[r] *= 1 + (perLevel as number) * level;
    }
  }
  // Project-flag bumps.
  if (state.flags['firstViralMoment']) {
    mult.attention *= 2;
  }
  if (state.flags['cpcNetwork']) {
    mult.engagement *= 1.5;
  }
  // DEPICT synergy bumps.
  if (state.flags['syn:wedge-content'])      { mult.engagement *= 1.25; mult.attention *= 1.10; }
  if (state.flags['syn:fake-whistleblower']) { mult.credibility *= 1.30; mult.engagement *= 1.15; }
  if (state.flags['syn:mob-surge'])          { mult.followers *= 1.40; mult.attention *= 1.15; }
  if (state.flags['syn:moral-panic'])        { mult.engagement *= 1.30; }
  if (state.flags['syn:tribal-trojan'])      { mult.followers *= 1.50; mult.engagement *= 1.20; }
  // Flood the Zone / Reverse-Smear apply to heat/cure, not production.

  // Patron buffs.
  for (const p of PATRONS) {
    if (!state.flags[p.id]) continue;
    for (const [res, amt] of Object.entries(p.buffs)) {
      mult[res as ResourceId] *= 1 + (amt as number);
    }
  }

  // Achievement buffs (additive over base 1).
  const achBuffs = totalAchievementBuffs(state);
  for (const [r, amt] of Object.entries(achBuffs)) {
    mult[r as ResourceId] *= 1 + amt;
  }

  // Legacy (prestige) multiplier — applies to all production.
  const legacy = loadLegacy();
  const legacyMult = legacyMultiplier(legacy.points);
  if (legacyMult > 1) {
    for (const r of RESOURCE_IDS) {
      mult[r] *= legacyMult;
    }
  }

  // Mebro reveal — production collapses to 10% during the reveal stub.
  if (state.reveal.active) {
    for (const r of RESOURCE_IDS) {
      mult[r] *= 0.1;
    }
  }

  return mult;
}

export function computeCaps(state: GameState): Record<ResourceId, number> {
  const caps = emptyResourceMap(0);
  const outlets = state.assets.outlet ?? 0;
  const newsletters = state.assets.newsletter ?? 0;

  if (state.flags['editorialCalendar']) {
    // Editorial Calendar PARADIGM: outlet cap flips from additive to
    // gently-geometric. Cost growth 1.035 → cap growth 1.06 keeps the
    // invariant (cap > cost) without runaway scaling. Base 600 so the
    // first post-paradigm outlet still adds ~600 cap (matches the
    // pre-paradigm contribution — paradigm shouldn't feel like a downgrade).
    caps.attention = 5000 + Math.floor(600 * (Math.pow(1.06, outlets) - 1) / 0.06);
    caps.engagement = 5000 + 600 * newsletters;
    if (state.flags['cpcNetwork']) {
      caps.engagement = Math.floor(caps.engagement * 3);
    }
  } else {
    // Pre-paradigm: 600 cap/outlet.
    caps.attention = 5000 + 600 * outlets;
    // Small engagement starter cap so POST overflow has somewhere to land
    // pre-Blog. Edcal raises this to 5000 when triggered.
    caps.engagement = 1000;
  }
  // Followers cap: bootstrapped on entering Social era + Audience Pods.
  const pods = state.assets.audiencePod ?? 0;
  if (state.flags['socialEraReached']) {
    caps.followers = 5000 + 6000 * pods;
  } else {
    caps.followers = state.caps.followers || 0;
  }
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

  // Apply DEPICT multiplier × return buff × active-event multiplier.
  for (const r of RESOURCE_IDS) {
    let m = depict[r] * buff;
    if (state.event && state.event.resourceId === r && state.event.until > state.lastTick) {
      m *= state.event.mult;
    }
    rates[r] *= m;
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

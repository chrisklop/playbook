// Compute current per-second production and current caps from declarative state.
// Pure functions — no mutation.

import type { GameState, ResourceId } from '../types';
import { ASSETS, UPGRADES } from './catalog';
import { RESOURCE_IDS } from '../types';
import { totalAchievementBuffs } from './achievements';
import { loadLegacy, legacyMultiplier } from '../legacy';
import { PATRONS } from './patrons';
import { PLATFORM_META } from '../../lib/platforms';
import { chargeTimeSeconds, postYield } from './posting';

export interface ProductionSnapshot {
  rates: Record<ResourceId, number>;       // net /sec
  caps: Record<ResourceId, number>;
  depictMult: Record<ResourceId, number>;
}

function emptyResourceMap(fill = 0): Record<ResourceId, number> {
  return Object.fromEntries(RESOURCE_IDS.map((id) => [id, fill])) as Record<ResourceId, number>;
}

/**
 * Per-resource multiplier composition (audit Finding 10).
 * Tracks every source for inspection + a sane cap.
 */
export interface MultiplierBreakdown {
  total: number;
  sources: Array<{ name: string; factor: number }>;
}

// Soft cap per resource — late-game balance valve. Above this, additional
// multipliers compress (logarithmically) instead of compounding linearly.
// Picked so a fully-stacked late-game build sits around 200-400×; anything
// beyond that is luxury.
const STACK_SOFT_CAP = 500;

function applySoftCap(total: number, cap = STACK_SOFT_CAP): number {
  if (total <= cap) return total;
  // Past the cap, additional growth is compressed: total → cap + log(over).
  const over = total - cap;
  return cap + Math.log10(1 + over) * 50;
}

export function computeMultiplierBreakdown(state: GameState): Record<ResourceId, MultiplierBreakdown> {
  const out: Record<string, MultiplierBreakdown> = {};
  for (const r of RESOURCE_IDS) out[r] = { total: 1, sources: [] };

  const apply = (r: ResourceId, name: string, factor: number) => {
    if (factor === 1) return;
    out[r].total *= factor;
    out[r].sources.push({ name, factor });
  };

  // DEPICT upgrade multipliers.
  for (const u of UPGRADES) {
    const level = state.upgrades[u.id] ?? 0;
    if (level <= 0) continue;
    for (const [res, perLevel] of Object.entries(u.multiplier)) {
      apply(res as ResourceId, `${u.name} ×${level}`, 1 + (perLevel as number) * level);
    }
  }

  // Project flags.
  if (state.flags['firstViralMoment']) apply('attention', 'First Viral Moment', 2);
  if (state.flags['cpcNetwork'])       apply('engagement', 'CPC Network', 1.5);

  // Synergies.
  if (state.flags['syn:wedge-content'])      { apply('engagement', 'Wedge Content', 1.25); apply('attention', 'Wedge Content', 1.10); }
  if (state.flags['syn:fake-whistleblower']) { apply('credibility', 'Fake Whistleblower', 1.30); apply('engagement', 'Fake Whistleblower', 1.15); }
  if (state.flags['syn:mob-surge'])          { apply('followers', 'Mob Surge', 1.40); apply('attention', 'Mob Surge', 1.15); }
  if (state.flags['syn:moral-panic'])        { apply('engagement', 'Moral Panic', 1.30); }
  if (state.flags['syn:tribal-trojan'])      { apply('followers', 'Tribal Trojan', 1.50); apply('engagement', 'Tribal Trojan', 1.20); }

  // Patrons.
  for (const p of PATRONS) {
    if (!state.flags[p.id]) continue;
    for (const [res, amt] of Object.entries(p.buffs)) {
      apply(res as ResourceId, p.name, 1 + (amt as number));
    }
  }

  // Achievement buffs.
  const achBuffs = totalAchievementBuffs(state);
  for (const [r, amt] of Object.entries(achBuffs)) {
    apply(r as ResourceId, 'Achievements', 1 + amt);
  }

  // Legacy (prestige) — applies to all resources.
  const legacy = loadLegacy();
  const legacyMult = legacyMultiplier(legacy.points);
  if (legacyMult > 1) {
    for (const r of RESOURCE_IDS) apply(r, `Legacy ×${legacy.points}`, legacyMult);
  }

  // Mebro reveal collapse.
  if (state.reveal.active) {
    for (const r of RESOURCE_IDS) apply(r, 'Mebro Reveal', 0.1);
  }

  // Soft cap.
  for (const r of RESOURCE_IDS) {
    const capped = applySoftCap(out[r].total);
    if (capped !== out[r].total) {
      out[r].sources.push({ name: '[soft-capped]', factor: capped / out[r].total });
      out[r].total = capped;
    }
  }

  return out as Record<ResourceId, MultiplierBreakdown>;
}

export function computeDepictMultipliers(state: GameState): Record<ResourceId, number> {
  const breakdown = computeMultiplierBreakdown(state);
  const mult = emptyResourceMap(1);
  for (const r of RESOURCE_IDS) mult[r] = breakdown[r].total;
  return mult;
}

export function computeCaps(state: GameState): Record<ResourceId, number> {
  const caps = emptyResourceMap(0);
  const outlets = state.assets.outlet ?? 0;
  const newsletters = state.assets.newsletter ?? 0;

  if (state.flags['editorialCalendar']) {
    // Editorial Calendar PARADIGM (audit Finding 5): outlet cap flips from
    // additive to geometric. Outlet cost growth is now 1.07; paradigm cap
    // growth at 1.10 stays comfortably above it (cap > cost invariant).
    // Base 500 so the first post-paradigm outlet adds ~500 cap — matches
    // the pre-paradigm linear contribution within a few percent.
    caps.attention = 5000 + Math.floor(500 * (Math.pow(1.10, outlets) - 1) / 0.10);
    // Per-newsletter cap raised from 800 → 1500 so 30 newsletters reaches
    // the first synergy threshold (50k engagement) instead of stalling at 29k.
    // Newsletter cost grows at 1.08 — comfortably below the cap-growth slope.
    caps.engagement = 5000 + 3000 * newsletters;
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

/**
 * Per-asset milestone multiplier (audit Finding 4 — Pecorella Part II
 * "Cookie Clicker milk" pattern). Each doubling of owned-count past 25
 * adds +1.0 to the asset's own production multiplier:
 *
 *   count <  25:  ×1.0
 *   count =  25:  ×1.0  (log2(1) + 1 = 1)
 *   count =  50:  ×2.0
 *   count = 100:  ×3.0
 *   count = 200:  ×4.0
 *   count = 400:  ×5.0
 *   count = 800:  ×6.0
 *   count = 1600: ×7.0
 *
 * Keeps older tiers relevant: a 1000-puppet stack stays meaningfully
 * productive even after higher-tier assets unlock. Per-asset, NOT
 * per-resource — buying lots of sock puppets boosts only sock puppets.
 */
export function assetMilestoneMultiplier(count: number): number {
  if (count < 25) return 1;
  return 1 + Math.log2(count / 25);
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
    const milestone = assetMilestoneMultiplier(count);
    for (const [res, perTickPerUnit] of Object.entries(asset.produces)) {
      const r = res as ResourceId;
      rates[r] += (perTickPerUnit as number) * count * milestone;
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

  // POST overflow contribution. The auto-poster fires posts on every
  // unlocked platform on its own clock; that income is bursty and
  // therefore invisible to a simple change-tracker, especially when
  // attention is clamped at cap (the gains are real, the value just
  // doesn't move). Model it explicitly here so the rate display
  // reflects ACTUAL production, not just observed value deltas.
  const autoOn = (state.assets.autoPoster ?? 0) >= 1;
  if (autoOn) {
    const chargeTime = chargeTimeSeconds(state);
    const attCapped = state.resources.attention >= state.caps.attention && state.caps.attention > 0;
    for (const meta of PLATFORM_META) {
      const p = state.platforms[meta.id];
      if (!p?.unlocked) continue;
      if (p.burned && p.burnedUntil > state.lastTick) continue;
      const postRate = p.postRate ?? 1;
      if (postRate <= 0) continue;
      const postsPerSec = postRate / chargeTime;
      const yieldPerPost = postYield(state, meta.id);
      if (attCapped) {
        // Whole yield overflows; 10% lands in engagement.
        rates.engagement += yieldPerPost * 0.1 * postsPerSec;
      } else {
        rates.attention += yieldPerPost * postsPerSec;
      }
    }
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

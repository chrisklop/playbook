// Ranked "Next Moves" recommendations for the topbar strip.
// Pure function — no side effects, no Svelte reactivity. Takes a
// GameState snapshot and returns a sorted list of top-3 recommendations.
//
// Spec: docs/superpowers/specs/2026-05-19-dashboard-redesign-design.md §2

import type { GameState, ResourceId } from '../types';
import { ASSETS, UPGRADES, PROJECTS, treeTotalLevel } from './catalog';
import { canBuyAsset, assetCost, canBuyUpgrade, upgradeCost, canCompleteProject } from './actions';
import { SYNERGIES, isSynergyVisible, canActivateSynergy } from './synergies';
import { PATRONS, isPatronVisible, canActivatePatron } from './patrons';

export type RecommendationType =
  | 'synergy'
  | 'patron'
  | 'project'
  | 'prestige'
  | 'depict-unlock'
  | 'asset-milestone'
  | 'depict-buy'
  | 'asset-buy'
  | 'post-ready';

export interface Recommendation {
  type: RecommendationType;
  id: string;
  title: string;
  detail: string;
  cost?: { resource: ResourceId; amount: number };
  score: number;
  rank: number; // 0 = gold, 1 = silver, 2 = bronze
}

const BASE_IMPACT: Record<RecommendationType, number> = {
  'synergy':         100,
  'patron':          100,
  'project':         100,
  'prestige':         95,
  'depict-unlock':    80,
  'asset-milestone':  60,
  'depict-buy':       50,
  'asset-buy':        30,
  'post-ready':       20,
};

/**
 * Gather all currently-applicable recommendations, score them, and
 * return the top-3 with rank=0,1,2 assigned.
 */
export function topRecommendations(state: GameState): Recommendation[] {
  const candidates: Recommendation[] = [];

  // 1. Affordable synergies — game-changing permanent multipliers.
  for (const sn of SYNERGIES) {
    if (state.flags[sn.id]) continue;
    if (!isSynergyVisible(state, sn)) continue;
    if (!canActivateSynergy(state, sn)) continue;
    const [res, amt] = Object.entries(sn.cost)[0] as [ResourceId, number];
    candidates.push({
      type: 'synergy',
      id: sn.id,
      title: `${sn.name} synergy ready`,
      detail: sn.effectText,
      cost: { resource: res, amount: amt },
      score: BASE_IMPACT['synergy'],
      rank: -1,
    });
  }

  // 2. Affordable patrons.
  for (const pa of PATRONS) {
    if (state.flags[pa.id]) continue;
    if (!isPatronVisible(state, pa)) continue;
    if (!canActivatePatron(state, pa)) continue;
    const [res, amt] = Object.entries(pa.cost)[0] as [ResourceId, number];
    candidates.push({
      type: 'patron',
      id: pa.id,
      title: `Activate ${pa.name}`,
      detail: pa.blurb,
      cost: { resource: res, amount: amt },
      score: BASE_IMPACT['patron'],
      rank: -1,
    });
  }

  // 3. Affordable projects (paradigm shifts).
  for (const p of PROJECTS) {
    if (state.completedProjects[p.id]) continue;
    if (!p.visible(state)) continue;
    if (!canCompleteProject(state, p.id)) continue;
    const [res, amt] = Object.entries(p.cost)[0] as [ResourceId, number];
    candidates.push({
      type: 'project',
      id: p.id,
      title: p.name,
      detail: p.blurb,
      cost: { resource: res, amount: amt },
      score: BASE_IMPACT['project'],
      rank: -1,
    });
  }

  // 4. Prestige (when cure >= 0.60 — time-sensitive escape valve).
  if (state.cure >= 0.60) {
    candidates.push({
      type: 'prestige',
      id: 'prestige',
      title: 'Prestige — bank legacy points',
      detail: `Cure at ${(state.cure * 100).toFixed(0)}%. Reveal triggers at 80%.`,
      score: BASE_IMPACT['prestige'] * (1 + (state.cure - 0.6) * 2),
      rank: -1,
    });
  }

  // 5. DEPICT nodes that complete a synergy prereq OR are close to tier-2 unlock.
  for (const u of UPGRADES) {
    if (!u.visible(state)) continue;
    const lvl = state.upgrades[u.id] ?? 0;
    if (lvl >= u.maxLevel) continue;
    if (!canBuyUpgrade(state, u.id, 1)) continue;

    const treeTotal = treeTotalLevel(state, u.tree);
    const inTier2Window = u.tier === 1 && treeTotal >= 7 && treeTotal < 10;

    const liftsSynergy = SYNERGIES.some((sn) => {
      if (state.flags[sn.id]) return false;
      if (!sn.trees.includes(u.tree)) return false;
      const otherTree = sn.trees.find((t) => t !== u.tree) ?? u.tree;
      const otherOK = treeTotalLevel(state, otherTree) >= sn.threshold;
      return otherOK && treeTotal < sn.threshold && treeTotal + 1 >= sn.threshold;
    });

    if (inTier2Window || liftsSynergy) {
      candidates.push({
        type: 'depict-unlock',
        id: u.id,
        title: liftsSynergy ? `${u.name} unlocks synergy` : `${u.name} → tier 2`,
        detail: `${u.blurb} · level ${lvl}/${u.maxLevel}`,
        cost: { resource: u.costResource, amount: upgradeCost(state, u.id, 1) },
        score: BASE_IMPACT['depict-unlock'] * (liftsSynergy ? 1.5 : 1.0),
        rank: -1,
      });
    }
  }

  // 6. Asset milestone close (within 25% of next ×2 doubling).
  for (const a of ASSETS) {
    if (!a.visible(state)) continue;
    const count = state.assets[a.id] ?? 0;
    if (count <= 0) continue;
    if (!canBuyAsset(state, a.id, 1)) continue;

    const milestones = [25, 50, 100, 200, 400, 800, 1600];
    const next = milestones.find((m) => m > count);
    if (!next) continue;
    const distance = (next - count) / next;
    if (distance > 0.25) continue;

    candidates.push({
      type: 'asset-milestone',
      id: a.id,
      title: `${a.name} ×${next} milestone in ${next - count}`,
      detail: `Hits the next ×2 production multiplier`,
      cost: { resource: a.costResource, amount: assetCost(state, a.id, 1) },
      score: BASE_IMPACT['asset-milestone'] * (1 + (1 - distance)),
      rank: -1,
    });
  }

  // 7. POST ready on any platform with low heat (active engagement).
  for (const pid of Object.keys(state.platforms)) {
    const p = state.platforms[pid as keyof typeof state.platforms];
    if (!p?.unlocked) continue;
    if (p.burned && p.burnedUntil > state.lastTick) continue;
    if (p.chargeProgress < 1) continue;
    if (p.heat >= 0.75) continue;
    candidates.push({
      type: 'post-ready',
      id: pid,
      title: `POST on ${pid}`,
      detail: `Charge 100%, heat ${(p.heat * 100).toFixed(0)}%`,
      score: BASE_IMPACT['post-ready'],
      rank: -1,
    });
  }

  // Sort by score desc; tiebreak by cheapest-cost-as-fraction-of-holding.
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (!a.cost && !b.cost) return 0;
    if (!a.cost) return -1;
    if (!b.cost) return 1;
    const aRatio = a.cost.amount / Math.max(1, state.resources[a.cost.resource]);
    const bRatio = b.cost.amount / Math.max(1, state.resources[b.cost.resource]);
    return aRatio - bRatio;
  });

  const top = candidates.slice(0, 3);
  top.forEach((r, i) => (r.rank = i));
  return top;
}

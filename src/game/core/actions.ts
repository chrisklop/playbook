// Pure buy/complete actions that mutate state. UI and sim both call these.

import type { GameState } from '../types';
import { ASSETS, UPGRADES, PROJECTS, assetById, upgradeById, projectById } from './catalog';
import { bulkCost } from './math';

const LOG_CAP = 50;

function pushLog(state: GameState, msg: string): void {
  state.log.unshift(msg);
  if (state.log.length > LOG_CAP) state.log.length = LOG_CAP;
}

// ─── Assets ────────────────────────────────────────────────────────────────

export function assetCost(state: GameState, id: string, count: number = 1): number {
  const a = assetById(id);
  if (!a) return Infinity;
  return bulkCost(a.baseCost, a.costGrowth, state.assets[id] ?? 0, count);
}

export function canBuyAsset(state: GameState, id: string, count: number = 1): boolean {
  const a = assetById(id);
  if (!a) return false;
  if (!a.visible(state)) return false;
  return state.resources[a.costResource] >= assetCost(state, id, count);
}

export function buyAsset(state: GameState, id: string, count: number = 1): boolean {
  if (!canBuyAsset(state, id, count)) return false;
  const a = assetById(id)!;
  state.resources[a.costResource] -= assetCost(state, id, count);
  state.assets[id] = (state.assets[id] ?? 0) + count;
  pushLog(state, `Bought ${count}× ${a.name}.`);
  return true;
}

// ─── DEPICT upgrades ───────────────────────────────────────────────────────

export function upgradeCost(state: GameState, id: string, count: number = 1): number {
  const u = upgradeById(id);
  if (!u) return Infinity;
  return bulkCost(u.baseCost, u.costGrowth, state.upgrades[id] ?? 0, count);
}

export function canBuyUpgrade(state: GameState, id: string, count: number = 1): boolean {
  const u = upgradeById(id);
  if (!u) return false;
  if (!u.visible(state)) return false;
  const current = state.upgrades[id] ?? 0;
  if (current + count > u.maxLevel) return false;
  return state.resources[u.costResource] >= upgradeCost(state, id, count);
}

export function buyUpgrade(state: GameState, id: string, count: number = 1): boolean {
  if (!canBuyUpgrade(state, id, count)) return false;
  const u = upgradeById(id)!;
  state.resources[u.costResource] -= upgradeCost(state, id, count);
  state.upgrades[id] = (state.upgrades[id] ?? 0) + count;
  pushLog(state, `Researched ${u.name} tier ${state.upgrades[id]}.`);
  return true;
}

// ─── Projects ──────────────────────────────────────────────────────────────

export function canCompleteProject(state: GameState, id: string): boolean {
  const p = projectById(id);
  if (!p) return false;
  if (state.completedProjects[id]) return false;
  if (!p.visible(state)) return false;
  for (const [res, amount] of Object.entries(p.cost)) {
    if (state.resources[res as keyof typeof state.resources] < (amount as number)) return false;
  }
  return true;
}

export function completeProject(state: GameState, id: string): boolean {
  if (!canCompleteProject(state, id)) return false;
  const p = projectById(id)!;
  for (const [res, amount] of Object.entries(p.cost)) {
    state.resources[res as keyof typeof state.resources] -= amount as number;
  }
  state.completedProjects[id] = true;
  p.effect(state);
  return true;
}

// ─── Phase transitions ─────────────────────────────────────────────────────

export function checkPhaseTransitions(state: GameState): void {
  if (state.phase === 'grassroots') {
    if (state.resources.attention >= 500 && state.flags['editorialCalendar']) {
      state.phase = 'blog';
      pushLog(state, '── Phase: BLOG ── You spin up a fake news site. Real ad money starts trickling in.');
    }
  }
  // Later phases land in Phase 3+ work.
}

export const _internal = { pushLog };

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
  const effect = assetEffectDescription(a);
  pushLog(state, `Bought ${count}× ${a.name}${effect ? ` (${effect})` : ''}.`);
  return true;
}

function assetEffectDescription(a: { id: string; produces: Record<string, number> }): string {
  const entries = Object.entries(a.produces);
  if (entries.length > 0) {
    return entries.map(([res, rate]) => `+${rate} ${res}/s each`).join(' · ');
  }
  switch (a.id) {
    case 'newsletter':  return '+1500 engagement cap each';
    case 'outlet':      return '+attention cap per outlet';
    case 'audiencePod': return '+6000 followers cap each';
    case 'autoPoster':  return '+10% post yield each';
    default: return '';
  }
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
  pushLog(
    state,
    `Researched ${u.name} tier ${state.upgrades[id]} (${upgradeEffectDescription(u, state.upgrades[id])}).`,
  );
  return true;
}

function upgradeEffectDescription(u: { multiplier: Record<string, number> }, lvl: number): string {
  return Object.entries(u.multiplier).map(([res, per]) => {
    const perPct = ((per as number) * 100).toFixed(1);
    const totalPct = ((per as number) * lvl * 100).toFixed(1);
    return `+${perPct}% ${res}/lvl, now +${totalPct}%`;
  }).join(' · ');
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

function unlockPlatforms(state: GameState, ids: readonly string[], names: readonly string[]): void {
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const p = state.platforms[id as keyof typeof state.platforms];
    if (p && !p.unlocked) {
      p.unlocked = true;
      pushLog(state, `New platform: ${names[i]} accounts created.`);
    }
  }
}

export function checkPhaseTransitions(state: GameState): void {
  if (state.phase === 'grassroots') {
    if (state.resources.attention >= 500_000 && state.flags['editorialCalendar']) {
      state.phase = 'blog';
      unlockPlatforms(state, ['facebook'], ['Facebook']);
      pushLog(state, '── Phase: BLOG ── You spin up a fake news site. Real ad money starts trickling in.');
    }
  } else if (state.phase === 'blog') {
    if (state.resources.engagement >= 150_000) {
      state.phase = 'social';
      state.flags['socialEraReached'] = true;
      unlockPlatforms(state, ['tiktok', 'youtube'], ['TikTok', 'YouTube']);
      pushLog(state, '── Phase: SOCIAL ── The algorithm starts serving your content to people who never asked for it.');
    }
  } else if (state.phase === 'social') {
    if (state.resources.followers >= 100_000) {
      state.phase = 'influencer';
      unlockPlatforms(state, ['telegram', 'substack'], ['Telegram', 'Substack']);
      pushLog(state, '── Phase: INFLUENCER ── Paywalled credibility on the front; coordination off-platform.');
    }
  } else if (state.phase === 'influencer') {
    if (state.resources.credibility >= 400_000) {
      state.phase = 'cable';
      unlockPlatforms(state, ['podcast'], ['Podcast networks']);
      pushLog(state, '── Phase: CABLE ── Bookings land. Your topic enters the chyron rotation.');
    }
  } else if (state.phase === 'cable') {
    if (state.resources.narrativeDominance >= 3_000_000) {
      state.phase = 'aisaturation';
      pushLog(state, '── Phase: AI SATURATION ── Every platform now generates content on its own. So do you.');
    }
  }
}

export const _internal = { pushLog };

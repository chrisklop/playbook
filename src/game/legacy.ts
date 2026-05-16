// Legacy: persistent meta-state across prestige resets.
// Stored in a SEPARATE localStorage slot from the run save so resets don't wipe.

import type { GameState } from './types';
import { clearSave } from './save';

const LEGACY_KEY = 'playbook:legacy:v1';

export interface LegacyState {
  version: number;
  points: number;     // total legacy points accumulated
  runs: number;       // how many runs completed via prestige
  bestRun: { attention: number; engagement: number };
}

function emptyLegacy(): LegacyState {
  return {
    version: 1,
    points: 0,
    runs: 0,
    bestRun: { attention: 0, engagement: 0 },
  };
}

export function loadLegacy(): LegacyState {
  if (typeof localStorage === 'undefined') return emptyLegacy();
  try {
    const json = localStorage.getItem(LEGACY_KEY);
    if (!json) return emptyLegacy();
    const parsed = JSON.parse(json) as Partial<LegacyState>;
    return { ...emptyLegacy(), ...parsed };
  } catch {
    return emptyLegacy();
  }
}

export function saveLegacy(s: LegacyState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(s));
  } catch {}
}

export function wipeLegacy(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(LEGACY_KEY);
}

// Prestige point formula (PLAN.md §6h): sqrt-scaled so going further is
// rewarded but never trivialized.
export function computePrestigeGain(s: GameState): number {
  const a = s.peakResources?.attention ?? 0;
  const e = s.peakResources?.engagement ?? 0;
  return Math.floor(
    Math.sqrt(a / 5000) + Math.sqrt(e / 50000),
  );
}

// Permanent multiplier from legacy points. +4% per point, capped at +200%.
export function legacyMultiplier(points: number): number {
  return Math.min(3, 1 + 0.04 * points);
}

// Execute prestige: bank points, wipe run save, return new legacy.
export function performPrestige(s: GameState): LegacyState {
  const gain = computePrestigeGain(s);
  const legacy = loadLegacy();
  const next: LegacyState = {
    ...legacy,
    points: legacy.points + gain,
    runs: legacy.runs + 1,
    bestRun: {
      attention: Math.max(legacy.bestRun.attention, s.peakResources?.attention ?? 0),
      engagement: Math.max(legacy.bestRun.engagement, s.peakResources?.engagement ?? 0),
    },
  };
  saveLegacy(next);
  clearSave();
  return next;
}

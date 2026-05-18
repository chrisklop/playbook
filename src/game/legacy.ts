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

// Prestige point formula (audit Finding 6): cube-root of peak-of-run,
// scaled so the cap doesn't max out in 2 prestiges. Pivot constants
// raised to 10^6 each so first prestige feels earned (~5 points), and
// the legacyMultiplier cap is reachable only over many runs.
//
// Cookie-Clicker-style cbrt: doubling prestige requires 8× more peak.
export function computePrestigeGain(s: GameState): number {
  const a = s.peakResources?.attention ?? 0;
  const e = s.peakResources?.engagement ?? 0;
  return Math.floor(
    Math.cbrt(a / 1_000_000) + Math.cbrt(e / 1_000_000),
  );
}

// Permanent multiplier from legacy points (audit Finding 8).
// Was: +4%/point, cap +200% (50 points = max). Now: sqrt curve with no
// hard ceiling — diminishing returns instead of a wall.
//
//   p=1   → ×1.20  (+20%)
//   p=10  → ×1.63  (+63%)
//   p=100 → ×3.00  (+200%)
//   p=400 → ×5.00  (+400%)
//   p=1000 → ×7.32 (+632%)
//
// Player always gets a little more from each prestige; the curve
// flattens naturally without a discontinuity.
export function legacyMultiplier(points: number): number {
  if (points <= 0) return 1;
  return 1 + Math.sqrt(points) * 0.20;
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

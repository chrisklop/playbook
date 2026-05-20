import { type GameState, SAVE_VERSION } from './types';
import { initialState } from './core/defaults';

const KEY = 'playbook:save:v1';

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string, now: number = Date.now()): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return initialState(now);
  }
  if (!raw || typeof raw !== 'object') return initialState(now);
  return migrate(raw as Partial<GameState>, now);
}

function migrate(raw: Partial<GameState>, now: number): GameState {
  // Pre-v8 saves used a different balance — wipe rather than rescue.
  // v8→v9 adds postRate to each platform; backfill instead of wiping progress.
  if (typeof raw.version !== 'number' || raw.version < 8) {
    return initialState(now);
  }
  const base = initialState(now);
  const mergedPlatforms: Record<string, unknown> = { ...base.platforms };
  if (raw.platforms) {
    for (const [pid, pstate] of Object.entries(raw.platforms)) {
      mergedPlatforms[pid] = {
        ...(base.platforms as Record<string, unknown>)[pid],
        ...(pstate as object),
      };
    }
  }
  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    acknowledgedPhase: raw.acknowledgedPhase ?? raw.phase ?? 'grassroots',
    resources: { ...base.resources, ...(raw.resources ?? {}) },
    caps: { ...base.caps, ...(raw.caps ?? {}) },
    assets: { ...base.assets, ...(raw.assets ?? {}) },
    upgrades: { ...base.upgrades, ...(raw.upgrades ?? {}) },
    flags: { ...base.flags, ...(raw.flags ?? {}) },
    completedProjects: {
      ...base.completedProjects,
      ...(raw.completedProjects ?? {}),
    },
    platforms: mergedPlatforms as GameState['platforms'],
    peakResources: { ...base.peakResources, ...(raw.peakResources ?? {}) },
    reveal: { ...base.reveal, ...(raw.reveal ?? {}) },
  };
}

export function loadSave(now: number = Date.now()): GameState | null {
  if (typeof localStorage === 'undefined') return null;
  const json = localStorage.getItem(KEY);
  if (!json) return null;
  return deserialize(json, now);
}

export function writeSave(state: GameState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, serialize(state));
  } catch {
    // Quota exhausted or storage disabled. Silent fail is acceptable for a game save.
  }
}

export function clearSave(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(KEY);
}

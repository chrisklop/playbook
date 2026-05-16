import {
  type GameState,
  type PlatformState,
  PLATFORM_IDS,
  RESOURCE_IDS,
  SAVE_VERSION,
} from '../types';

function emptyResources(): Record<string, number> {
  return Object.fromEntries(RESOURCE_IDS.map((id) => [id, 0]));
}

function defaultCaps(): Record<string, number> {
  return {
    attention: 50,
    engagement: 0,
    followers: 0,
    credibility: 0,
    narrativeDominance: 0,
    syntheticReality: 0,
  };
}

function defaultPlatform(unlocked = false): PlatformState {
  return {
    unlocked,
    burned: false,
    burnedUntil: 0,
    heat: 0,
    presence: 0,
    reach: 0,
  };
}

function defaultPlatforms(): Record<string, PlatformState> {
  const out: Record<string, PlatformState> = {};
  for (const id of PLATFORM_IDS) {
    // Facebook + X unlocked at start (v0.1 MVP scope per PLAN §11).
    out[id] = defaultPlatform(id === 'facebook' || id === 'x');
  }
  return out;
}

export function initialState(now: number = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    phase: 'grassroots',
    resources: { ...emptyResources(), attention: 1 } as GameState['resources'],
    caps: defaultCaps() as GameState['caps'],
    assets: { sockPuppet: 1 },
    upgrades: {},
    flags: {},
    completedProjects: {},
    platforms: defaultPlatforms() as GameState['platforms'],
    cure: 0,
    defections: 0,
    reveal: { active: false, triggeredAt: 0 },
    log: ['You open a fresh account. The cursor blinks.'],
    startedAt: now,
    lastTick: now,
    lastSave: now,
    peakResources: emptyResources() as GameState['peakResources'],
    returnBuff: null,
    event: null,
  };
}

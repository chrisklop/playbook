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
    attention: 5000,
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
    chargeProgress: 0,
  };
}

function defaultPlatforms(): Record<string, PlatformState> {
  const out: Record<string, PlatformState> = {};
  for (const id of PLATFORM_IDS) {
    // Grassroots: only X unlocked. Real disinfo ops enter the news cycle via
    // Twitter virality (Pizzagate 2016, Spamouflage Dragon, Doppelganger). FB
    // unlocks at Blog era; TikTok/YT at Social; etc.
    out[id] = defaultPlatform(id === 'x');
  }
  return out;
}

export function initialState(now: number = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    phase: 'grassroots',
    resources: { ...emptyResources(), attention: 100 } as GameState['resources'],
    caps: defaultCaps() as GameState['caps'],
    assets: { sockPuppet: 1 },
    upgrades: {},
    flags: {},
    completedProjects: {},
    platforms: defaultPlatforms() as GameState['platforms'],
    cure: 0,
    defections: 0,
    reveal: { active: false, triggeredAt: 0 },
    log: ['You open a fresh account on X. The cursor blinks.'],
    startedAt: now,
    lastTick: now,
    lastSave: now,
    peakResources: emptyResources() as GameState['peakResources'],
    returnBuff: null,
    event: null,
    lastEventAt: now,
  };
}

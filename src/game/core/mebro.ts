// Pure logic for the Mebro antagonist system. All exports are side-effect-free
// or take a GameState parameter and mutate it. Tested in mebro.test.ts.

import type { GameState, PlatformId } from '../types';

export type IntrusionStage = 0 | 1 | 2 | 3 | 4;
export type MebroVerb = 'rotate' | 'cooldown' | 'counterNarrative';

/**
 * Mebro Index → intrusion stage.
 *   0:  invisible        (cure < 0.10)
 *   1:  topbar pill      (0.10 ≤ cure < 0.25)
 *   2:  compact panel    (0.25 ≤ cure < 0.50)
 *   3:  full panel       (0.50 ≤ cure < 0.80)
 *   4:  mainstream / red (0.80 ≤ cure)
 */
export function intrusionStage(cure: number): IntrusionStage {
  if (cure < 0.10) return 0;
  if (cure < 0.25) return 1;
  if (cure < 0.50) return 2;
  if (cure < 0.80) return 3;
  return 4;
}

/**
 * Each asset type maps 1:1 to one "home platform" — the platform whose
 * amplifier the asset most reinforces. Cool Down on an asset cools its
 * home platform. Returns null if the asset has no posting role
 * (e.g. autoPoster, which is a multiplier not a content source).
 */
const HOME_PLATFORM: Record<string, PlatformId> = {
  sockPuppet: 'x',
  newsletter: 'substack',
  audiencePod: 'telegram',
  doppelganger: 'facebook',
  outlet: 'youtube',
};

export function homePlatform(assetType: string): PlatformId | null {
  return HOME_PLATFORM[assetType] ?? null;
}

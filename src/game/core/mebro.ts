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

/**
 * Per-tick detection accrual + decay. Called once per tick from sim.
 * Tuning numbers are placeholders — expect 1-2 playtest passes after
 * the antagonist UI is live.
 */
export function tickDetection(state: GameState, dt: number): void {
  const stage = intrusionStage(state.cure);
  const stageMultiplier = stage === 2 ? 0.5 : stage === 4 ? 1.5 : 1.0;
  const cureMultiplier = 0.5 + state.cure;
  const cnHalving = state.counterNarrativeUntil > state.lastTick ? 0.5 : 1.0;
  // Stage 0 disables accrual but decay still applies so existing scores can
  // bleed off if Mebro Index dips back below 0.10 (mostly for cooldown decay
  // tests today; matters for any future cure-reduction mechanic).
  const accrualMult = stage === 0 ? 0 : stageMultiplier * cureMultiplier * cnHalving;

  // Union of owned asset types and types with existing detection scores —
  // ensures decay still runs on assets the player no longer owns / hasn't
  // been counted via state.assets.
  const types = new Set<string>([
    ...Object.keys(state.assets),
    ...Object.keys(state.assetDetection),
  ]);

  for (const assetType of types) {
    const count = state.assets[assetType] ?? 0;

    const baseline = state.assetDetectionBaseline[assetType] ?? 0;
    let current = state.assetDetection[assetType] ?? baseline;

    // Accrual from owned count (saturates at 50). Zero if no assets owned.
    const effectiveCount = Math.min(count, 50);
    const accrual = effectiveCount * 0.002 * accrualMult;

    // Passive decay if not posted with recently.
    const lastPost = state.lastPostUsing[assetType] ?? 0;
    const idle = state.lastTick - lastPost > 10_000;
    const passiveDecay = idle ? 0.5 * dt : 0;

    // Cooldown decay if home platform is cooling.
    const home = homePlatform(assetType);
    const cooling = home && (state.cooldowns[home] ?? 0) > state.lastTick;
    const cooldownDecay = cooling ? 2.0 * dt : 0;

    current += accrual * dt - passiveDecay - cooldownDecay;
    current = Math.max(baseline, Math.min(100, current));
    state.assetDetection[assetType] = current;
  }
}

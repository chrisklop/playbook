import { describe, it, expect } from 'vitest';
import { intrusionStage, homePlatform, tickDetection } from './mebro';
import { initialState } from './defaults';

function makeState() {
  const s = initialState(0);
  s.cure = 0.30; // Stage 2 — accrual at 0.5× × cureMultiplier(0.8) = 0.4× base
  s.assets = { sockPuppet: 10, newsletter: 5 };
  s.lastTick = 1_000;
  return s;
}

describe('intrusionStage', () => {
  it('returns 0 below 0.10', () => {
    expect(intrusionStage(0)).toBe(0);
    expect(intrusionStage(0.09)).toBe(0);
  });
  it('returns 1 in [0.10, 0.25)', () => {
    expect(intrusionStage(0.10)).toBe(1);
    expect(intrusionStage(0.249)).toBe(1);
  });
  it('returns 2 in [0.25, 0.50)', () => {
    expect(intrusionStage(0.25)).toBe(2);
    expect(intrusionStage(0.499)).toBe(2);
  });
  it('returns 3 in [0.50, 0.80)', () => {
    expect(intrusionStage(0.50)).toBe(3);
    expect(intrusionStage(0.799)).toBe(3);
  });
  it('returns 4 at 0.80+', () => {
    expect(intrusionStage(0.80)).toBe(4);
    expect(intrusionStage(1.0)).toBe(4);
  });
});

describe('homePlatform', () => {
  it('maps each known asset type to a platform', () => {
    expect(homePlatform('sockPuppet')).toBe('x');
    expect(homePlatform('newsletter')).toBe('substack');
    expect(homePlatform('audiencePod')).toBe('telegram');
    expect(homePlatform('doppelganger')).toBe('facebook');
    expect(homePlatform('outlet')).toBe('youtube');
  });
  it('returns null for assets with no home platform (e.g., autoPoster)', () => {
    expect(homePlatform('autoPoster')).toBeNull();
  });
  it('returns null for unknown asset types', () => {
    expect(homePlatform('totally-fake-asset')).toBeNull();
  });
});

describe('tickDetection', () => {
  it('does nothing when cure < 0.10 (stage 0)', () => {
    const s = makeState();
    s.cure = 0.05;
    tickDetection(s, 1.0);
    expect(s.assetDetection['sockPuppet'] ?? 0).toBe(0);
  });

  it('accrues detection on owned asset types', () => {
    const s = makeState();
    tickDetection(s, 1.0);
    expect(s.assetDetection['sockPuppet']).toBeGreaterThan(0);
    expect(s.assetDetection['newsletter']).toBeGreaterThan(0);
  });

  it('saturates count contribution at 50 owned', () => {
    const small = makeState();
    small.assets = { sockPuppet: 50 };
    const big = makeState();
    big.assets = { sockPuppet: 200 };
    tickDetection(small, 10.0);
    tickDetection(big, 10.0);
    expect(Math.abs(small.assetDetection['sockPuppet']! - big.assetDetection['sockPuppet']!)).toBeLessThan(0.01);
  });

  it('decays passively when not posted with for >10s', () => {
    const s = makeState();
    s.assetDetection = { sockPuppet: 50 };
    s.lastPostUsing = { sockPuppet: 0 };  // last post at t=0
    s.lastTick = 20_000;                  // current time = 20s after last post
    tickDetection(s, 1.0);                // decay applies because 20s > 10s
    expect(s.assetDetection['sockPuppet']).toBeLessThan(50);
  });

  it('does not decay below baseline', () => {
    const s = makeState();
    s.assetDetection = { sockPuppet: 5 };
    s.assetDetectionBaseline = { sockPuppet: 5 };
    s.lastPostUsing = { sockPuppet: 0 };
    s.lastTick = 100_000;
    s.cure = 0.05; // stage 0, no accrual
    tickDetection(s, 10.0);
    expect(s.assetDetection['sockPuppet']).toBe(5);
  });

  it('clamps at 100', () => {
    const s = makeState();
    s.cure = 0.95;
    s.assets = { sockPuppet: 50 };
    s.assetDetection = { sockPuppet: 99 };
    tickDetection(s, 100.0);
    expect(s.assetDetection['sockPuppet']).toBe(100);
  });

  it('cooldown active accelerates decay', () => {
    const s = makeState();
    s.assetDetection = { sockPuppet: 50 };
    s.lastPostUsing = { sockPuppet: 0 };
    s.cooldowns = { x: 99_999_999 }; // X is sockPuppet's home, cooldown active
    s.lastTick = 20_000;
    s.cure = 0.05; // disable accrual to isolate decay
    tickDetection(s, 1.0);
    // Passive decay -0.5 + cooldown decay -2.0 = -2.5 → 47.5
    expect(s.assetDetection['sockPuppet']).toBeCloseTo(47.5, 1);
  });

  it('counter-narrative active halves accrual', () => {
    const s = makeState();
    s.counterNarrativeUntil = 99_999_999;
    tickDetection(s, 1.0);
    const withCN = s.assetDetection['sockPuppet']!;
    const s2 = makeState();
    tickDetection(s2, 1.0);
    const withoutCN = s2.assetDetection['sockPuppet']!;
    expect(withCN).toBeLessThan(withoutCN);
    expect(withCN).toBeCloseTo(withoutCN / 2, 2);
  });
});

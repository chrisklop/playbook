import { describe, it, expect } from 'vitest';
import { intrusionStage, homePlatform } from './mebro';

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

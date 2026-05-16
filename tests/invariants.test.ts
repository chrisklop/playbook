import { describe, it, expect } from 'vitest';
import { initialState } from '../src/game/core/defaults';
import { tick } from '../src/game/core/tick';
import { bulkCost, affordableCount, clamp } from '../src/game/core/math';
import { serialize, deserialize } from '../src/game/save';
import { applyOffline } from '../src/game/offline';

const T0 = 1_700_000_000_000;

describe('math', () => {
  it('clamp', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('bulkCost: zero and one count', () => {
    expect(bulkCost(10, 1.15, 0, 0)).toBe(0);
    expect(bulkCost(10, 1.15, 0, 1)).toBe(10);
  });

  it('bulkCost: matches naive loop within FP tolerance', () => {
    for (const g of [1.1, 1.15, 1.2]) {
      for (let lvl = 0; lvl < 5; lvl++) {
        for (let n = 1; n <= 10; n++) {
          let naive = 0;
          for (let i = 0; i < n; i++) {
            naive += 10 * Math.pow(g, lvl + i);
          }
          // Closed form and naive accumulation diverge by FP error; tolerate ±1.
          const closed = bulkCost(10, g, lvl, n);
          expect(Math.abs(closed - Math.ceil(naive))).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('affordableCount: never overspends', () => {
    for (const g of [1.1, 1.15, 1.2]) {
      for (const avail of [100, 1000, 10_000, 100_000]) {
        const k = affordableCount(10, g, 0, avail);
        expect(bulkCost(10, g, 0, k)).toBeLessThanOrEqual(avail);
        expect(bulkCost(10, g, 0, k + 1)).toBeGreaterThan(avail);
      }
    }
  });
});

describe('tick', () => {
  it('advances lastTick', () => {
    const s = initialState(T0);
    tick(s, T0 + 100);
    expect(s.lastTick).toBe(T0 + 100);
  });

  it('produces attention from baseline sock puppet', () => {
    const s = initialState(T0);
    const before = s.resources.attention;
    tick(s, T0 + 1000); // 1 second
    expect(s.resources.attention).toBeGreaterThan(before);
  });

  it('respects attention cap', () => {
    const s = initialState(T0);
    s.resources.attention = s.caps.attention;
    tick(s, T0 + 60_000);
    expect(s.resources.attention).toBe(s.caps.attention);
  });

  it('cure stays in [0,1]', () => {
    const s = initialState(T0);
    s.platforms.facebook.heat = 1;
    s.platforms.x.heat = 1;
    for (let i = 0; i < 10_000; i++) {
      tick(s, s.lastTick + 100);
    }
    expect(s.cure).toBeGreaterThanOrEqual(0);
    expect(s.cure).toBeLessThanOrEqual(1);
  });

  it('cure does not accumulate when reveal active', () => {
    const s = initialState(T0);
    s.platforms.facebook.heat = 0.5;
    s.reveal.active = true;
    tick(s, T0 + 60_000);
    expect(s.cure).toBe(0);
  });
});

describe('save round-trip', () => {
  it('serialize → deserialize preserves shape', () => {
    const s = initialState(T0);
    s.resources.attention = 42.5;
    s.cure = 0.25;
    s.platforms.facebook.heat = 0.3;
    const round = deserialize(serialize(s), T0);
    expect(round.resources.attention).toBe(42.5);
    expect(round.cure).toBe(0.25);
    expect(round.platforms.facebook.heat).toBe(0.3);
  });

  it('deserialize tolerates corrupt input', () => {
    const s = deserialize('not json', T0);
    expect(s.phase).toBe('grassroots');
  });

  it('migrate fills missing fields', () => {
    const partial = JSON.stringify({ version: 1, resources: { attention: 10 } });
    const s = deserialize(partial, T0);
    expect(s.resources.attention).toBe(10);
    expect(s.caps.attention).toBeGreaterThan(0);
    expect(s.platforms.facebook).toBeDefined();
  });
});

describe('offline catch-up', () => {
  it('no catch-up below 2 minutes', () => {
    const s = initialState(T0);
    const before = s.resources.attention;
    applyOffline(s, T0 + 60_000);
    expect(s.resources.attention).toBe(before);
  });

  it('grants buff after 30 minutes', () => {
    const s = initialState(T0);
    applyOffline(s, T0 + 31 * 60_000);
    expect(s.returnBuff).not.toBeNull();
    expect(s.returnBuff!.mult).toBe(2);
  });

  it('does not exceed cap', () => {
    const s = initialState(T0);
    applyOffline(s, T0 + 24 * 60 * 60_000); // 24 hours
    expect(s.resources.attention).toBeLessThanOrEqual(s.caps.attention);
  });
});

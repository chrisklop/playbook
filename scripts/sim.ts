#!/usr/bin/env tsx
/**
 * Headless greedy player. Imports pure core/ only (no Svelte, no DOM).
 * Run with `pnpm sim`. Asserts engine invariants over many simulated ticks.
 */

import { initialState } from '../src/game/core/defaults';
import { tick } from '../src/game/core/tick';
import { RESOURCE_IDS, PHASE_ORDER } from '../src/game/types';
import type { GameState, ResourceId } from '../src/game/types';

const TICK_MS = 100;
const MAX_SIM_MINUTES = 60;
const MAX_TICKS = (MAX_SIM_MINUTES * 60 * 1000) / TICK_MS;

interface SimResult {
  ticks: number;
  simSeconds: number;
  wallMs: number;
  finalState: GameState;
  invariantFailures: string[];
}

function checkInvariants(state: GameState, ticksRun: number): string[] {
  const failures: string[] = [];
  for (const id of RESOURCE_IDS) {
    const v = state.resources[id as ResourceId];
    const cap = state.caps[id as ResourceId];
    if (v < 0) failures.push(`tick ${ticksRun}: ${id} negative (${v})`);
    if (cap > 0 && v > cap + 1e-6)
      failures.push(`tick ${ticksRun}: ${id} ${v} exceeds cap ${cap}`);
  }
  if (state.cure < 0 || state.cure > 1)
    failures.push(`tick ${ticksRun}: cure out of [0,1] (${state.cure})`);
  for (const p of Object.values(state.platforms)) {
    if (p.heat < 0 || p.heat > 1)
      failures.push(`tick ${ticksRun}: platform heat out of range (${p.heat})`);
  }
  if (!PHASE_ORDER.includes(state.phase))
    failures.push(`tick ${ticksRun}: unknown phase ${state.phase}`);
  return failures;
}

function run(): SimResult {
  const wallStart = performance.now();
  // Use a fake clock so dt is deterministic.
  let fakeNow = 1_000_000_000_000;
  const state = initialState(fakeNow);

  const invariantFailures: string[] = [];
  let t = 0;
  for (; t < MAX_TICKS; t++) {
    fakeNow += TICK_MS;
    tick(state, fakeNow);
    if (t % 600 === 0) {
      // Spot-check every 60s of sim-time.
      invariantFailures.push(...checkInvariants(state, t));
      if (invariantFailures.length > 50) break;
    }
  }
  // Final check.
  invariantFailures.push(...checkInvariants(state, t));

  return {
    ticks: t,
    simSeconds: (t * TICK_MS) / 1000,
    wallMs: performance.now() - wallStart,
    finalState: state,
    invariantFailures,
  };
}

function main(): void {
  const r = run();
  console.log(`Sim: ${r.ticks} ticks (${r.simSeconds.toFixed(0)}s sim)`);
  console.log(`Wall: ${r.wallMs.toFixed(0)}ms`);
  console.log(`Final attention: ${r.finalState.resources.attention.toFixed(2)}`);
  console.log(`Final attention cap: ${r.finalState.caps.attention}`);
  console.log(`Final cure: ${(r.finalState.cure * 100).toFixed(3)}%`);
  if (r.invariantFailures.length > 0) {
    console.error(`\n❌ ${r.invariantFailures.length} invariant failure(s):`);
    for (const f of r.invariantFailures.slice(0, 20)) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('\n✓ all invariants held');
}

main();

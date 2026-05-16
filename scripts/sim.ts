#!/usr/bin/env tsx
/**
 * Headless greedy player. Imports pure core/ only.
 * Strategy:
 *   1. Complete any affordable project.
 *   2. Otherwise buy cheapest affordable upgrade or asset, current phase first.
 *   3. Else wait.
 * Asserts engine invariants.
 */

import { initialState } from '../src/game/core/defaults';
import { tick } from '../src/game/core/tick';
import {
  buyAsset,
  buyUpgrade,
  completeProject,
  canBuyAsset,
  canBuyUpgrade,
  canCompleteProject,
  assetCost,
  upgradeCost,
} from '../src/game/core/actions';
import { ASSETS, UPGRADES, PROJECTS } from '../src/game/core/catalog';
import { PHASE_ORDER, PLATFORM_IDS, RESOURCE_IDS } from '../src/game/types';
import type { GameState, ResourceId, PhaseId } from '../src/game/types';

const TICK_MS = 100;
const MAX_SIM_MINUTES = 60;
const MAX_TICKS = (MAX_SIM_MINUTES * 60 * 1000) / TICK_MS;

function checkInvariants(state: GameState, ticksRun: number): string[] {
  const failures: string[] = [];
  for (const id of RESOURCE_IDS) {
    const v = state.resources[id as ResourceId];
    const cap = state.caps[id as ResourceId];
    if (v < -1e-6) failures.push(`tick ${ticksRun}: ${id} negative (${v})`);
    if (cap > 0 && v > cap + 1e-3)
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

function takeBestAction(state: GameState): boolean {
  // 1. Projects first (paradigm shifts).
  for (const p of PROJECTS) {
    if (canCompleteProject(state, p.id)) {
      completeProject(state, p.id);
      return true;
    }
  }
  // 2. Cheapest affordable upgrade or asset.
  let bestCost = Infinity;
  let bestAction: (() => void) | null = null;
  for (const u of UPGRADES) {
    if (!canBuyUpgrade(state, u.id, 1)) continue;
    const c = upgradeCost(state, u.id, 1);
    if (c < bestCost) {
      bestCost = c;
      bestAction = () => buyUpgrade(state, u.id, 1);
    }
  }
  for (const a of ASSETS) {
    if (!canBuyAsset(state, a.id, 1)) continue;
    const c = assetCost(state, a.id, 1);
    if (c < bestCost) {
      bestCost = c;
      bestAction = () => buyAsset(state, a.id, 1);
    }
  }
  if (bestAction) {
    bestAction();
    return true;
  }
  return false;
}

function run(): void {
  const wallStart = performance.now();
  let fakeNow = 1_700_000_000_000;
  const state = initialState(fakeNow);

  const phaseFirstReached: Partial<Record<PhaseId, number>> = { grassroots: 0 };
  const invariantFailures: string[] = [];
  let stallSince = 0;
  let lastBuyAt = 0;

  let t = 0;
  for (; t < MAX_TICKS; t++) {
    fakeNow += TICK_MS;
    tick(state, fakeNow);

    if (takeBestAction(state)) {
      lastBuyAt = t;
      stallSince = t;
    } else if (t - stallSince > 1200) {
      // No buy for 120s of sim-time → wall flag.
      const cheapest = findCheapestUnaffordable(state);
      console.log(
        `[stall @ t=${t}] cheapest unaffordable: ${cheapest.id} ` +
          `cost=${cheapest.cost.toFixed(0)} have=${state.resources[cheapest.res].toFixed(1)} ` +
          `cap=${state.caps[cheapest.res]}`,
      );
      stallSince = t;
    }

    if (!phaseFirstReached[state.phase]) {
      phaseFirstReached[state.phase] = t;
    }

    if (t % 600 === 0) {
      invariantFailures.push(...checkInvariants(state, t));
      if (invariantFailures.length > 30) break;
    }
  }

  invariantFailures.push(...checkInvariants(state, t));
  const wallMs = performance.now() - wallStart;

  console.log(`\nSim complete: ${t} ticks (${((t * TICK_MS) / 1000).toFixed(0)}s sim) in ${wallMs.toFixed(0)}ms wall`);
  console.log('Phase milestones:');
  for (const phase of PHASE_ORDER) {
    const ts = phaseFirstReached[phase];
    if (ts !== undefined) {
      console.log(`  ${phase}: t+${((ts * TICK_MS) / 1000).toFixed(1)}s`);
    }
  }
  console.log('\nFinal state:');
  console.log(`  phase: ${state.phase}`);
  console.log(`  attention: ${state.resources.attention.toFixed(1)} / ${state.caps.attention}`);
  console.log(`  engagement: ${state.resources.engagement.toFixed(1)} / ${state.caps.engagement}`);
  console.log(`  assets: ${JSON.stringify(state.assets)}`);
  console.log(`  upgrades: ${JSON.stringify(state.upgrades)}`);
  console.log(`  projects: ${Object.keys(state.completedProjects).join(', ') || '(none)'}`);
  console.log(`  last buy: t+${((lastBuyAt * TICK_MS) / 1000).toFixed(1)}s`);

  if (invariantFailures.length > 0) {
    console.error(`\n❌ ${invariantFailures.length} invariant failure(s):`);
    for (const f of invariantFailures.slice(0, 10)) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('\n✓ all invariants held');
}

function findCheapestUnaffordable(state: GameState): { id: string; cost: number; res: ResourceId } {
  let best = { id: 'none', cost: Infinity, res: 'attention' as ResourceId };
  for (const u of UPGRADES) {
    if (!u.visible(state)) continue;
    if ((state.upgrades[u.id] ?? 0) >= u.maxLevel) continue;
    const c = upgradeCost(state, u.id, 1);
    if (c < best.cost && state.resources[u.costResource] < c) {
      best = { id: u.id, cost: c, res: u.costResource };
    }
  }
  for (const a of ASSETS) {
    if (!a.visible(state)) continue;
    const c = assetCost(state, a.id, 1);
    if (c < best.cost && state.resources[a.costResource] < c) {
      best = { id: a.id, cost: c, res: a.costResource };
    }
  }
  return best;
}

run();

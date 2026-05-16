// Pure tick function. Mutates the passed state in place. No Svelte, no DOM.

import { type GameState, PLATFORM_IDS, PHASE_ORDER, RESOURCE_IDS } from '../types';
import { clamp } from './math';
import { computeCaps, computeRates } from './production';
import { checkPhaseTransitions } from './actions';
import { tickPlatforms } from './platforms';
import { tickPosting } from './posting';
import { tickCureEvents } from './cure';
import { tickEventScheduler } from './events';
import { ASSETS, UPGRADES, PROJECTS } from './catalog';
import { SYNERGIES, isSynergyVisible, isSynergyTeased } from './synergies';
import { PATRONS, isPatronVisible, isPatronTeased } from './patrons';
import { tickAchievements } from './achievements';

const CURE_FROM_HEAT_PER_S = 0.0002;

// Heat/cure are Blog-era+ mechanics. Grassroots is abstract — sock puppets
// just produce attention; no platform diversification yet, no counter-pressure.
function platformEra(state: GameState): boolean {
  return PHASE_ORDER.indexOf(state.phase) >= PHASE_ORDER.indexOf('blog');
}

function tickEcon(state: GameState, dt: number): void {
  state.caps = computeCaps(state);
  const rates = computeRates(state);
  for (const r of RESOURCE_IDS) {
    const cap = state.caps[r];
    const next = state.resources[r] + rates[r] * dt;
    state.resources[r] = cap > 0 ? Math.min(next, cap) : next;
    if (state.resources[r] < 0) state.resources[r] = 0;
  }
}

function tickCure(state: GameState, dt: number): void {
  if (state.reveal.active) return;
  if (!platformEra(state)) return;
  let totalHeat = 0;
  for (const id of PLATFORM_IDS) {
    if (state.platforms[id].unlocked) totalHeat += state.platforms[id].heat;
  }

  // Discrediting suppression: each tier-1 level −1% cure rate (max 30%);
  // each tier-2 level −2% (max 60%). Combined cap 80%.
  const dt1 = state.upgrades['discrediting-1'] ?? 0;
  const dt2 = state.upgrades['discrediting-2'] ?? 0;
  let suppression = dt1 * 0.01 + dt2 * 0.02;
  if (state.flags['syn:reverse-smear']) suppression += 0.10;
  suppression = clamp(suppression, 0, 0.80);

  const cureRate = CURE_FROM_HEAT_PER_S * totalHeat * (1 - suppression);
  state.cure = clamp(state.cure + cureRate * dt, 0, 1);

  // STUB MEBRO REVEAL — triggers at 80% cure. Full reveal sequence
  // (defection feed, Trust bar, debrief screen) is REVEAL.md v0.2 work.
  if (state.cure >= 0.80 && !state.reveal.active) {
    state.reveal.active = true;
    state.reveal.triggeredAt = state.lastTick;
    state.log.unshift('── THE PLAYBOOK IS UP ── Mebro fact-check annotations start appearing on your content. Reach plummets.');
    state.log.unshift('★ Read what you built. Prestige (★) to start clean. Full debrief screen ships in v0.2.');
  }
}

function tickEvents(state: GameState): void {
  if (state.event && state.event.until <= state.lastTick) state.event = null;
  if (state.returnBuff && state.returnBuff.until <= state.lastTick) state.returnBuff = null;
}

function trackPeaks(state: GameState): void {
  for (const id of RESOURCE_IDS) {
    const v = state.resources[id];
    if (v > state.peakResources[id]) state.peakResources[id] = v;
  }
}

// Once an asset/upgrade/project has been seen (visible or even just teased),
// it stays seen — even if resources later drop below the threshold. Stickiness
// prevents the "I saw it coming, then it vanished" UX wart.
function tickReveals(state: GameState): void {
  for (const a of ASSETS) {
    if (a.visible(state)) state.flags[`reveal:${a.id}`] = true;
    if (a.teased?.(state)) state.flags[`tease:${a.id}`] = true;
  }
  for (const u of UPGRADES) {
    if (u.visible(state)) state.flags[`reveal:${u.id}`] = true;
    if (u.teased?.(state)) state.flags[`tease:${u.id}`] = true;
  }
  for (const p of PROJECTS) {
    if (state.completedProjects[p.id]) continue;
    if (p.visible(state)) state.flags[`reveal:${p.id}`] = true;
    if (p.teased?.(state)) state.flags[`tease:${p.id}`] = true;
  }
  for (const sn of SYNERGIES) {
    if (state.flags[sn.id]) continue; // already activated
    if (isSynergyVisible(state, sn)) state.flags[`reveal:${sn.id}`] = true;
    if (isSynergyTeased(state, sn)) state.flags[`tease:${sn.id}`] = true;
  }
  for (const pa of PATRONS) {
    if (state.flags[pa.id]) continue;
    if (isPatronVisible(state, pa)) state.flags[`reveal:${pa.id}`] = true;
    if (isPatronTeased(state, pa)) state.flags[`tease:${pa.id}`] = true;
  }
}

export function tick(state: GameState, now: number): void {
  const dt = Math.max(0, (now - state.lastTick) / 1000);
  state.lastTick = now;

  tickEcon(state, dt);
  // Platforms tick from t=0 so X has visible heat/reach in Grassroots.
  // Cure + cure-events stay gated to Blog era to avoid early-game noise.
  tickPlatforms(state, dt);
  tickPosting(state, dt);
  tickCure(state, dt);
  if (platformEra(state)) tickCureEvents(state);
  tickEvents(state);
  tickEventScheduler(state);
  checkPhaseTransitions(state);
  tickAchievements(state);
  tickReveals(state);
  trackPeaks(state);
}

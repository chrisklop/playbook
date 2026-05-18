// Random-event scheduler. Maintains state.event and rolls for a new event
// every 90–180s when none is active.

import type { GameState } from '../types';
import { pickEvent } from './eventPool';

// Roomier cadence (user feedback): events were firing every 45-120s, which
// felt constant. 2-5 min gap leaves breathing room.
const MIN_GAP_MS = 120_000;
const MAX_GAP_MS = 300_000;

function rollGap(): number {
  return MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);
}

export function tickEventScheduler(state: GameState): void {
  if (state.event) return;
  if (state.lastTick - state.lastEventAt < rollGap()) return;

  const def = pickEvent(state);
  if (!def) return;

  state.event = {
    id: def.id,
    until: state.lastTick + def.duration * 1000,
    mult: def.mult,
    resourceId: def.resource,
  };
  state.lastEventAt = state.lastTick;
  state.flags['__eventFired'] = true;
  state.log.unshift(`▶ ${def.headline}`);
}

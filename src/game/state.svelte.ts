// Thin reactive wrapper around the pure GameState. Anything Svelte/UI imports
// reads `game` from here; pure logic stays in core/.

import type { GameState } from './types';
import { initialState } from './core/defaults';
import { loadSave } from './save';
import { applyOffline } from './offline';

function hydrate(): GameState {
  const loaded = loadSave();
  if (!loaded) return initialState();
  applyOffline(loaded);
  return loaded;
}

export const game = $state<GameState>(hydrate());

export function replaceState(next: GameState): void {
  Object.assign(game, next);
}

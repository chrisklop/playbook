// Wires the pure tick fn to a setInterval. Owns the save throttle.

import { game } from './state.svelte';
import { tick } from './core/tick';
import { writeSave } from './save';

const TICK_MS = 100;
const SAVE_EVERY_MS = 5000;

let handle: number | null = null;

export function startLoop(): void {
  if (handle !== null) return;
  handle = window.setInterval(() => {
    const now = Date.now();
    tick(game, now);
    if (now - game.lastSave > SAVE_EVERY_MS) {
      writeSave(game);
      game.lastSave = now;
    }
  }, TICK_MS);
}

export function stopLoop(): void {
  if (handle !== null) {
    clearInterval(handle);
    handle = null;
  }
}

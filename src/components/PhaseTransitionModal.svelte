<script lang="ts">
  import type { PhaseId } from '../game/types';
  import { PHASE_COPY } from '../lib/phaseTransitionCopy';

  interface Props {
    phase: PhaseId;
    onClose: () => void;
  }
  const { phase, onClose }: Props = $props();

  const copy = $derived(PHASE_COPY[phase]);

  let canDismiss = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    canDismiss = false;
    timeoutId = setTimeout(() => { canDismiss = true; }, 600);
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  });
</script>

{#if copy}
  <div class="phase-modal-backdrop" role="presentation">
    <div class="phase-modal" role="dialog" aria-live="polite">
      <div class="phase-modal-tag">PHASE TRANSITION</div>
      <div class="phase-modal-headline">
        {#each copy.headline as line}
          <div>{line}</div>
        {/each}
      </div>
      <ul class="phase-modal-unlocks">
        {#each copy.unlocks as u}
          <li>▸ {u}</li>
        {/each}
      </ul>
      <p class="phase-modal-hint">{copy.hint}</p>
      <button class="phase-modal-btn" disabled={!canDismiss} onclick={onClose}>
        {canDismiss ? 'continue' : '…'}
      </button>
    </div>
  </div>
{/if}

<style>
  .phase-modal-backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in oklab, var(--ink) 70%, transparent);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: phase-fade-in 240ms ease-out;
  }
  .phase-modal {
    background: var(--paper);
    border: 2px solid var(--accent);
    border-radius: 8px;
    padding: 2rem 3rem;
    max-width: 640px;
    text-align: center;
    box-shadow: 0 0 0 1px var(--accent), 0 0 60px color-mix(in oklab, var(--accent) 30%, transparent);
    animation: phase-pop 320ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .phase-modal-tag {
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    color: var(--muted);
    margin-bottom: 0.4rem;
  }
  .phase-modal-headline {
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    line-height: 1.15;
    color: var(--accent);
    margin: 0.4rem 0 1.2rem;
  }
  .phase-modal-unlocks {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
    text-align: left;
    display: inline-block;
  }
  .phase-modal-unlocks li {
    padding: 0.2rem 0;
    color: var(--ok);
    font-size: 0.92rem;
  }
  .phase-modal-hint {
    font-style: italic;
    color: var(--muted);
    font-size: 0.82rem;
    margin: 0 0 1.2rem;
  }
  .phase-modal-btn {
    appearance: none;
    background: var(--accent);
    color: var(--paper);
    border: none;
    padding: 0.6rem 2.4rem;
    border-radius: 4px;
    font: inherit;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    text-transform: uppercase;
  }
  .phase-modal-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .phase-modal-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--accent) 40%, transparent);
  }
  @keyframes phase-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes phase-pop {
    from { transform: scale(0.92); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }
</style>

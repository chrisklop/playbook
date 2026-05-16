<script lang="ts">
  import { game } from './game/state.svelte';
  import { clearSave } from './game/save';

  function reset() {
    if (confirm('Reset run? This wipes the save.')) {
      clearSave();
      location.reload();
    }
  }

  function fmt(n: number) {
    if (n < 10) return n.toFixed(2);
    if (n < 1000) return n.toFixed(1);
    if (n < 1_000_000) return (n / 1000).toFixed(2) + 'K';
    return (n / 1_000_000).toFixed(2) + 'M';
  }

  const tickAge = $derived(((Date.now() - game.lastTick) / 1000).toFixed(1));
  const buffActive = $derived(game.returnBuff && game.returnBuff.until > Date.now());
</script>

<main>
  <header>
    <h1>The Playbook</h1>
    <span class="phase">phase: {game.phase}</span>
  </header>

  <section class="resources">
    <div class="row">
      <span class="label">attention</span>
      <span class="num">{fmt(game.resources.attention)} / {fmt(game.caps.attention)}</span>
    </div>
    <div class="row">
      <span class="label">engagement</span>
      <span class="num">{fmt(game.resources.engagement)} / {fmt(game.caps.engagement)}</span>
    </div>
    <div class="row">
      <span class="label">followers</span>
      <span class="num">{fmt(game.resources.followers)} / {fmt(game.caps.followers)}</span>
    </div>
    <div class="row">
      <span class="label">cure</span>
      <span class="num">{(game.cure * 100).toFixed(2)}%</span>
    </div>
  </section>

  <section class="meta">
    <div>last tick: {tickAge}s ago</div>
    <div>uptime: {fmt((Date.now() - game.startedAt) / 1000)}s</div>
    {#if buffActive}
      <div class="buff">RETURN BUFF ×{game.returnBuff!.mult}</div>
    {/if}
  </section>

  <section class="log">
    {#each game.log.slice(0, 5) as line, i (i)}
      <div class="line">{line}</div>
    {/each}
  </section>

  <footer>
    <button onclick={reset}>reset</button>
    <span class="sub">phase 1 engine &middot; smoke test</span>
  </footer>
</main>

<style>
  main {
    max-width: 480px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: grid;
    gap: 1.5rem;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  h1 {
    font-size: 1.5rem;
    margin: 0;
    letter-spacing: -0.02em;
  }
  .phase {
    color: var(--muted);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
  .resources {
    display: grid;
    gap: 0.4rem;
    padding: 1rem;
    border: 1px solid color-mix(in oklab, var(--ink) 12%, transparent);
    border-radius: 6px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
  }
  .label {
    color: var(--muted);
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .meta {
    display: flex;
    gap: 1.5rem;
    font-size: 0.8rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .buff {
    color: var(--accent);
    font-weight: 600;
  }
  .log {
    display: grid;
    gap: 0.25rem;
    font-size: 0.85rem;
    color: var(--muted);
    font-style: italic;
  }
  footer {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  button {
    font: inherit;
    padding: 0.4rem 0.9rem;
    border: 1px solid color-mix(in oklab, var(--ink) 30%, transparent);
    background: transparent;
    color: var(--ink);
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover {
    background: color-mix(in oklab, var(--ink) 6%, transparent);
  }
  .sub {
    color: var(--muted);
    font-size: 0.8rem;
  }
</style>

<script lang="ts">
  import { game } from './game/state.svelte';
  import { clearSave } from './game/save';
  import {
    buyAsset, buyUpgrade, completeProject,
    assetCost, upgradeCost,
    canBuyAsset, canBuyUpgrade, canCompleteProject,
  } from './game/core/actions';
  import { ASSETS, UPGRADES, PROJECTS } from './game/core/catalog';
  import { computeRates } from './game/core/production';

  function reset() {
    if (confirm('Reset run? This wipes the save.')) {
      clearSave();
      location.reload();
    }
  }

  function fmt(n: number): string {
    if (n === 0) return '0';
    if (n < 10) return n.toFixed(2);
    if (n < 1000) return n.toFixed(1);
    if (n < 1_000_000) return (n / 1000).toFixed(2) + 'K';
    return (n / 1_000_000).toFixed(2) + 'M';
  }

  function fmtRate(n: number): string {
    return (n >= 0 ? '+' : '') + fmt(n) + '/s';
  }

  const rates = $derived(computeRates(game));
  const visibleAssets = $derived(ASSETS.filter((a) => a.visible(game)));
  const visibleUpgrades = $derived(UPGRADES.filter((u) => u.visible(game)));
  const visibleProjects = $derived(
    PROJECTS.filter((p) => p.visible(game) && !game.completedProjects[p.id]),
  );

  const buffActive = $derived(
    game.returnBuff !== null && game.returnBuff.until > Date.now(),
  );
</script>

<main>
  <header>
    <h1>The Playbook</h1>
    <span class="phase">phase · {game.phase}</span>
  </header>

  <section class="resources">
    <div class="res">
      <span class="label">attention</span>
      <span class="val">{fmt(game.resources.attention)} / {fmt(game.caps.attention)}</span>
      <span class="rate">{fmtRate(rates.attention)}</span>
    </div>
    {#if game.caps.engagement > 0}
      <div class="res">
        <span class="label">engagement</span>
        <span class="val">{fmt(game.resources.engagement)} / {fmt(game.caps.engagement)}</span>
        <span class="rate">{fmtRate(rates.engagement)}</span>
      </div>
    {/if}
    <div class="res">
      <span class="label">cure</span>
      <span class="val">{(game.cure * 100).toFixed(2)}%</span>
      <span class="rate"></span>
    </div>
    {#if buffActive}
      <div class="buff">RETURN BUFF ×{game.returnBuff!.mult}</div>
    {/if}
  </section>

  {#if visibleProjects.length > 0}
    <section class="panel">
      <h2>Projects</h2>
      {#each visibleProjects as p (p.id)}
        {@const affordable = canCompleteProject(game, p.id)}
        <button class="card project" disabled={!affordable} onclick={() => completeProject(game, p.id)}>
          <div class="card-head">
            <span class="name">{p.name}</span>
            <span class="cost">{Object.entries(p.cost).map(([r, n]) => `${fmt(n as number)} ${r}`).join(' · ')}</span>
          </div>
          <div class="blurb">{p.blurb}</div>
        </button>
      {/each}
    </section>
  {/if}

  <section class="panel">
    <h2>Assets</h2>
    {#each visibleAssets as a (a.id)}
      {@const cost = assetCost(game, a.id, 1)}
      {@const affordable = canBuyAsset(game, a.id, 1)}
      <button class="card" disabled={!affordable} onclick={() => buyAsset(game, a.id, 1)}>
        <div class="card-head">
          <span class="name">{a.name} <span class="kind">[{a.kind}]</span></span>
          <span class="owned">×{game.assets[a.id] ?? 0}</span>
        </div>
        <div class="blurb">{a.blurb}</div>
        <div class="cost-line">
          <span class="cost">{fmt(cost)} {a.costResource}</span>
        </div>
      </button>
    {/each}
  </section>

  {#if visibleUpgrades.length > 0}
    <section class="panel">
      <h2>DEPICT trees</h2>
      {#each visibleUpgrades as u (u.id)}
        {@const lvl = game.upgrades[u.id] ?? 0}
        {@const cost = upgradeCost(game, u.id, 1)}
        {@const maxed = lvl >= u.maxLevel}
        {@const affordable = canBuyUpgrade(game, u.id, 1)}
        <button class="card upgrade {u.tree}" disabled={!affordable || maxed} onclick={() => buyUpgrade(game, u.id, 1)}>
          <div class="card-head">
            <span class="name"><span class="tag">{u.tree[0].toUpperCase()}</span> {u.name}</span>
            <span class="owned">{lvl}/{u.maxLevel}</span>
          </div>
          <div class="blurb">{u.blurb}</div>
          <div class="cost-line">
            <span class="cost">{maxed ? 'maxed' : `${fmt(cost)} ${u.costResource}`}</span>
          </div>
        </button>
      {/each}
    </section>
  {/if}

  <section class="panel log-panel">
    <h2>Log</h2>
    <div class="log">
      {#each game.log.slice(0, 8) as line, i (i)}
        <div class="line">{line}</div>
      {/each}
    </div>
  </section>

  <footer>
    <button class="reset" onclick={reset}>reset</button>
    <span class="sub">phase 2 · grassroots playable</span>
  </footer>
</main>

<style>
  :global(body) { margin: 0; }
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
    display: grid;
    gap: 1.25rem;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  h1 {
    font-size: 1.4rem;
    margin: 0;
    letter-spacing: -0.02em;
  }
  h2 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    margin: 0 0 0.5rem;
    font-weight: 600;
  }
  .phase {
    color: var(--muted);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }
  .resources {
    display: grid;
    gap: 0.3rem;
    padding: 0.9rem 1rem;
    border: 1px solid color-mix(in oklab, var(--ink) 12%, transparent);
    border-radius: 6px;
    background: color-mix(in oklab, var(--ink) 2%, transparent);
  }
  .res {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.75rem;
    align-items: baseline;
    font-size: 0.95rem;
  }
  .label { color: var(--muted); }
  .val { font-variant-numeric: tabular-nums; }
  .rate {
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
    color: color-mix(in oklab, var(--accent) 80%, var(--ink));
    min-width: 4.5rem;
    text-align: right;
  }
  .buff {
    margin-top: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--accent);
  }
  .panel { display: grid; gap: 0.4rem; }
  .card {
    appearance: none;
    text-align: left;
    background: transparent;
    color: inherit;
    border: 1px solid color-mix(in oklab, var(--ink) 14%, transparent);
    border-radius: 5px;
    padding: 0.7rem 0.9rem;
    font: inherit;
    cursor: pointer;
    display: grid;
    gap: 0.3rem;
    transition: background 80ms, border-color 80ms;
  }
  .card:hover:not(:disabled) {
    background: color-mix(in oklab, var(--ink) 4%, transparent);
    border-color: color-mix(in oklab, var(--ink) 25%, transparent);
  }
  .card:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .name { font-weight: 600; font-size: 0.95rem; }
  .kind {
    font-weight: 400;
    color: var(--muted);
    font-size: 0.8rem;
    text-transform: lowercase;
  }
  .owned {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
  }
  .blurb { color: var(--muted); font-size: 0.85rem; line-height: 1.35; }
  .cost-line { display: flex; justify-content: flex-end; }
  .cost {
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
    font-weight: 600;
  }
  .tag {
    display: inline-block;
    width: 1.2em;
    height: 1.2em;
    line-height: 1.2em;
    text-align: center;
    font-weight: 700;
    font-size: 0.75rem;
    border-radius: 3px;
    background: color-mix(in oklab, var(--accent) 70%, transparent);
    color: white;
    margin-right: 0.3em;
  }
  .upgrade.discrediting .tag { background: hsl(0 60% 45%); }
  .upgrade.emotional    .tag { background: hsl(20 75% 50%); }
  .upgrade.polarization .tag { background: hsl(280 55% 50%); }
  .upgrade.impersonation .tag { background: hsl(160 50% 40%); }
  .upgrade.conspiracy   .tag { background: hsl(220 60% 45%); }
  .upgrade.trolling     .tag { background: hsl(60 70% 40%); }
  .project { border-style: dashed; }
  .log-panel { margin-top: 0.5rem; }
  .log { display: grid; gap: 0.2rem; }
  .line {
    font-size: 0.82rem;
    color: var(--muted);
    font-style: italic;
    line-height: 1.4;
  }
  footer {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-top: 1rem;
  }
  .reset {
    appearance: none;
    font: inherit;
    padding: 0.35rem 0.8rem;
    border: 1px solid color-mix(in oklab, var(--ink) 25%, transparent);
    background: transparent;
    color: var(--ink);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .sub { color: var(--muted); font-size: 0.8rem; }
</style>

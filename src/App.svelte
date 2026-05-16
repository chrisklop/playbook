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
  import { affordableCount } from './game/core/math';
  import { DEPICT_IDS, PHASE_ORDER } from './game/types';
  import { PLATFORM_META } from './lib/platforms';
  import { fmt, fmtRate, etaToCap } from './lib/format';

  type BulkMode = 1 | 10 | 100 | 'max';
  let bulkMode = $state<BulkMode>(1);

  function reset() {
    if (confirm('Reset run? This wipes the save.')) {
      clearSave();
      location.reload();
    }
  }

  const rates = $derived(computeRates(game));
  const visibleAssets = $derived(ASSETS.filter((a) => a.visible(game)));
  const visibleProjects = $derived(
    PROJECTS.filter((p) => p.visible(game) && !game.completedProjects[p.id]),
  );

  const treesView = $derived(
    DEPICT_IDS.map((tree) => {
      const all = UPGRADES.filter((u) => u.tree === tree);
      const visible = all.filter((u) => u.visible(game));
      const totalLevel = all.reduce((acc, u) => acc + (game.upgrades[u.id] ?? 0), 0);
      const totalMax = all.reduce((acc, u) => acc + u.maxLevel, 0);
      return { tree, all, visible, totalLevel, totalMax };
    }).filter((t) => t.visible.length > 0 || t.totalLevel > 0),
  );

  // ── Gradual reveal predicates ────────────────────────────────────────
  // Per PLAN.md §6f: hide UI surfaces until prerequisites are in reach.
  // Early game = sock-puppet button + log line only. Each milestone reveals.

  const showTicker      = $derived(game.resources.attention >= 5);
  const showBulkBuy     = $derived(
    game.resources.attention >= 100 ||
    Object.values(game.assets).some((c) => c >= 10),
  );
  // Cure is dormant until Blog era and below 5%. It's the long-game pressure
  // counter — when it crosses 80% in AI Saturation, the Mebro reveal triggers.
  const showCureMeter   = $derived(game.cure >= 0.05);
  // Don't surface the log until enough has happened to feel like a feed.
  const showLog         = $derived(game.log.length >= 4);
  const showProjects    = $derived(visibleProjects.length > 0);
  const showTrees       = $derived(treesView.length > 0);
  // Platform grid is a Blog-era surface. Until then the game is abstract:
  // sock puppets just produce attention — no platform diversification yet.
  const showPlatformGrid = $derived(
    PHASE_ORDER.indexOf(game.phase) >= PHASE_ORDER.indexOf('blog'),
  );

  const isMinimal = $derived(!showTrees && !showProjects && !showPlatformGrid);

  const buffActive = $derived(
    game.returnBuff !== null && game.returnBuff.until > Date.now(),
  );

  function affordabilityRatio(cost: number, resource: string): number {
    const have = game.resources[resource as keyof typeof game.resources] ?? 0;
    if (cost <= 0) return 1;
    return Math.min(1, have / cost);
  }

  function depictLetter(t: string): string {
    return t[0].toUpperCase();
  }

  // Bulk-buy plumbing.
  function assetBuyCount(id: string): number {
    const a = ASSETS.find((x) => x.id === id);
    if (!a) return 0;
    if (bulkMode === 'max') {
      return affordableCount(
        a.baseCost, a.costGrowth,
        game.assets[id] ?? 0,
        game.resources[a.costResource],
      );
    }
    return bulkMode;
  }
  function upgradeBuyCount(id: string): number {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return 0;
    const current = game.upgrades[id] ?? 0;
    const headroom = u.maxLevel - current;
    if (bulkMode === 'max') {
      return Math.min(
        headroom,
        affordableCount(
          u.baseCost, u.costGrowth, current,
          game.resources[u.costResource],
          u.maxLevel,
        ),
      );
    }
    return Math.min(bulkMode, headroom);
  }
  function doBuyAsset(id: string) {
    const n = assetBuyCount(id);
    if (n > 0) buyAsset(game, id, n);
  }
  function doBuyUpgrade(id: string) {
    const n = upgradeBuyCount(id);
    if (n > 0) buyUpgrade(game, id, n);
  }
</script>

<div class="app phase-{game.phase}" class:reveal={game.reveal.active}>
  <!-- TOPBAR -->
  <header class="topbar">
    <div class="brand">
      <span class="title">The Playbook</span>
      <span class="phase">phase · {game.phase}</span>
    </div>
    <div class="resources">
      {#each Object.entries({ attention: 'Attention', engagement: 'Engagement', followers: 'Followers', credibility: 'Credibility', narrativeDominance: 'NarDom', syntheticReality: 'SynReal' }) as [id, label] (id)}
        {@const r = id as keyof typeof game.resources}
        {@const val = game.resources[r]}
        {@const cap = game.caps[r]}
        {@const rate = rates[r]}
        {@const eta = etaToCap(val, cap, rate)}
        {#if cap > 0 || val > 0}
          <div class="rmeter">
            <div class="rlabel">{label}</div>
            <div class="rvalue num">{fmt(val)}<span class="cap"> / {fmt(cap)}</span></div>
            <div class="rrate" class:positive={rate > 0}>{fmtRate(rate)}</div>
            {#if eta}<div class="reta">{eta}</div>{/if}
            <div class="rfill" style="--fill: {cap > 0 ? Math.min(100, (val / cap) * 100) : 0}%"></div>
          </div>
        {/if}
      {/each}
      {#if showCureMeter}
        <div class="rmeter cure">
          <div class="rlabel">Cure</div>
          <div class="rvalue num">{(game.cure * 100).toFixed(2)}<span class="cap">%</span></div>
          <div class="rrate"></div>
          <div class="rfill cure-fill" style="--fill: {game.cure * 100}%"></div>
        </div>
      {/if}
      {#if buffActive}
        <div class="buff" title="Return buff: come-back-soon bonus.">×{game.returnBuff!.mult} BUFF</div>
      {/if}
    </div>
    <div class="topbar-actions">
      {#if showBulkBuy}
        <div class="bulk" role="group" aria-label="bulk-buy quantity">
          {#each [1, 10, 100, 'max'] as mode (mode)}
            <button
              class="bulk-btn"
              class:active={bulkMode === mode}
              onclick={() => (bulkMode = mode as BulkMode)}
            >×{mode}</button>
          {/each}
        </div>
      {/if}
      <button class="ghost" onclick={reset}>reset</button>
    </div>
  </header>

  <!-- TICKER (placeholder slot for v0.1) -->
  {#if showTicker}
    <div class="ticker">
      <span class="tick-fact">
        A 2018 MIT study found false news travels six times faster than true news on Twitter. Humans, not bots, drove most of the gap. — Vosoughi et al., <em>Science</em>, 2018.
      </span>
    </div>
  {/if}

  <!-- MAIN GRID -->
  <main class="grid" class:minimal={isMinimal}>
    <!-- LEFT: Assets + Projects -->
    <section class="col left">
      <h2>Assets</h2>
      <div class="cards">
        {#each visibleAssets as a (a.id)}
          {@const n = Math.max(1, assetBuyCount(a.id))}
          {@const cost = assetCost(game, a.id, n)}
          {@const affordable = canBuyAsset(game, a.id, n)}
          {@const ratio = affordabilityRatio(cost, a.costResource)}
          <button class="card asset" disabled={!affordable} onclick={() => doBuyAsset(a.id)} title={a.precedent ?? ''}>
            <div class="card-head">
              <span class="name">{a.name} <span class="kind">[{a.kind}]</span></span>
              <span class="owned">×{game.assets[a.id] ?? 0}</span>
            </div>
            <div class="blurb">{a.blurb}</div>
            {#if a.precedent}<div class="precedent">{a.precedent}</div>{/if}
            <div class="card-foot">
              <span class="buy-n">+{n}</span>
              <span class="cost num">{fmt(cost)} {a.costResource}</span>
            </div>
            <div class="afford-fill" style="--fill: {ratio * 100}%"></div>
          </button>
        {/each}
      </div>

      {#if showProjects}
        <h2>Projects</h2>
        <div class="cards">
          {#each visibleProjects as p (p.id)}
            {@const affordable = canCompleteProject(game, p.id)}
            {@const [res, amt] = Object.entries(p.cost)[0]}
            {@const ratio = affordabilityRatio(amt as number, res)}
            <button class="card project" disabled={!affordable} onclick={() => completeProject(game, p.id)} title={p.precedent ?? ''}>
              <div class="card-head">
                <span class="name">{p.name}</span>
              </div>
              <div class="blurb">{p.blurb}</div>
              {#if p.precedent}<div class="precedent">{p.precedent}</div>{/if}
              <div class="card-foot">
                <span class="buy-n">one-shot</span>
                <span class="cost num">{fmt(amt as number)} {res}</span>
              </div>
              <div class="afford-fill" style="--fill: {ratio * 100}%"></div>
            </button>
          {/each}
        </div>
      {/if}
    </section>

    <!-- CENTER: Platform grid -->
    {#if showPlatformGrid}
    <section class="col center">
      <h2>Platforms</h2>
      <div class="platform-grid">
        {#each PLATFORM_META as meta (meta.id)}
          {@const p = game.platforms[meta.id]}
          {@const unlocked = p.unlocked}
          {#if unlocked || PHASE_ORDER.indexOf(game.phase) >= PHASE_ORDER.indexOf('blog')}
          <div class="platform-card" class:locked={!unlocked} style="--tint: {meta.tint}">
            <div class="plt-head">
              <span class="plt-name">{meta.name}</span>
              {#if !unlocked}
                <span class="plt-lock">unlocks · {meta.unlocksAt}</span>
              {/if}
            </div>
            <div class="plt-audience">{meta.audience}</div>
            {#if unlocked}
              <div class="plt-meter">
                <div class="meter-row">
                  <span class="meter-label">heat</span>
                  <div class="meter-bar">
                    <div class="meter-fill heat" style="--fill: {p.heat * 100}%"></div>
                  </div>
                  <span class="meter-num num">{(p.heat * 100).toFixed(0)}%</span>
                </div>
                <div class="meter-row">
                  <span class="meter-label">reach</span>
                  <div class="meter-bar">
                    <div class="meter-fill reach" style="--fill: {Math.min(100, p.reach / 10)}%"></div>
                  </div>
                  <span class="meter-num num">{fmt(p.reach)}</span>
                </div>
              </div>
            {:else}
              <div class="plt-locked-body">
                <span class="locked-glyph">·</span>
              </div>
            {/if}
          </div>
          {/if}
        {/each}
      </div>
    </section>
    {/if}

    <!-- RIGHT: DEPICT trees -->
    {#if showTrees}
    <section class="col right">
      <h2>DEPICT trees</h2>
      <div class="trees">
        {#each treesView as t (t.tree)}
          <div class="tree tree-{t.tree}">
            <div class="tree-head">
              <span class="tree-tag">{depictLetter(t.tree)}</span>
              <span class="tree-name">{t.tree}</span>
              <span class="tree-progress num">{t.totalLevel}/{t.totalMax}</span>
            </div>
            <div class="tree-nodes">
              {#each t.visible as u (u.id)}
                {@const lvl = game.upgrades[u.id] ?? 0}
                {@const maxed = lvl >= u.maxLevel}
                {@const n = Math.max(1, upgradeBuyCount(u.id))}
                {@const cost = upgradeCost(game, u.id, n)}
                {@const affordable = !maxed && canBuyUpgrade(game, u.id, n)}
                {@const ratio = affordabilityRatio(cost, u.costResource)}
                <button class="node" disabled={!affordable || maxed} onclick={() => doBuyUpgrade(u.id)} title={u.precedent ?? ''}>
                  <div class="node-head">
                    <span class="node-name">{u.name}</span>
                    <span class="node-lvl num">{lvl}/{u.maxLevel}</span>
                  </div>
                  <div class="node-blurb">{u.blurb}</div>
                  <div class="node-foot">
                    {#if !maxed}<span class="buy-n">+{n}</span>{/if}
                    <span class="node-cost num">{maxed ? 'maxed' : `${fmt(cost)} ${u.costResource}`}</span>
                  </div>
                  <div class="afford-fill" style="--fill: {ratio * 100}%"></div>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </section>
    {/if}
  </main>

  <!-- LOG -->
  {#if showLog}
    <footer class="log">
      <h2>Log</h2>
      <div class="log-lines">
        {#each game.log.slice(0, 6) as line, i (i)}
          <div class="line">{line}</div>
        {/each}
      </div>
    </footer>
  {/if}
</div>

<style>
  :global(:root) {
    --paper:   hsl(40 25% 97%);
    --paper-2: hsl(40 20% 94%);
    --ink:     hsl(220 18% 12%);
    --muted:   hsl(220 10% 50%);
    --line:    hsl(220 14% 86%);
    --accent:  hsl(220 70% 45%);
    --ok:      hsl(150 55% 40%);
    --warn:    hsl(30 90% 50%);
    --bad:     hsl(0 70% 50%);
  }
  :global(body) {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-feature-settings: 'tnum' 1;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --paper:   hsl(220 18% 9%);
      --paper-2: hsl(220 18% 12%);
      --ink:     hsl(40 20% 92%);
      --muted:   hsl(220 10% 60%);
      --line:    hsl(220 14% 22%);
      --accent:  hsl(220 70% 60%);
    }
  }

  .app {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
  }

  /* ── TOPBAR ─────────────────────────────────────────────────────────── */
  .topbar {
    display: grid;
    grid-template-columns: 220px 1fr auto;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--line);
    background: var(--paper-2);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .brand { display: flex; flex-direction: column; gap: 0.1rem; }
  .title { font-weight: 700; letter-spacing: -0.02em; font-size: 1.05rem; }
  .phase { font-size: 0.75rem; color: var(--muted); text-transform: lowercase; }
  .resources {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.6rem;
  }
  .rmeter {
    position: relative;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--paper);
    overflow: hidden;
    display: grid;
    grid-template-rows: auto auto auto;
  }
  .rmeter .rfill {
    position: absolute;
    inset: auto 0 0 0;
    height: 2px;
    background: var(--accent);
    width: var(--fill, 0%);
    transition: width 200ms;
  }
  .rmeter .cure-fill { background: var(--bad); }
  .rlabel { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .rvalue { font-size: 0.95rem; font-weight: 600; }
  .rvalue .cap { color: var(--muted); font-weight: 400; }
  .rrate { font-size: 0.7rem; color: var(--muted); }
  .rrate.positive { color: var(--ok); }
  .reta { font-size: 0.65rem; color: var(--muted); font-style: italic; }
  .num { font-variant-numeric: tabular-nums; }
  .buff {
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--accent);
    background: color-mix(in oklab, var(--accent) 12%, transparent);
    color: var(--accent);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 700;
    align-self: center;
  }
  .topbar-actions { display: flex; gap: 0.4rem; align-items: center; }
  .bulk {
    display: inline-flex;
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
  }
  .bulk-btn {
    appearance: none;
    font: inherit;
    font-size: 0.78rem;
    padding: 0.35rem 0.55rem;
    border: none;
    border-right: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .bulk-btn:last-child { border-right: none; }
  .bulk-btn:hover { color: var(--ink); background: color-mix(in oklab, var(--ink) 5%, transparent); }
  .bulk-btn.active { background: var(--accent); color: white; }
  .ghost {
    appearance: none;
    font: inherit;
    font-size: 0.8rem;
    padding: 0.35rem 0.7rem;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    border-radius: 4px;
    cursor: pointer;
  }
  .ghost:hover { background: color-mix(in oklab, var(--ink) 5%, transparent); }

  /* ── TICKER ────────────────────────────────────────────────────────── */
  .ticker {
    border-bottom: 1px solid var(--line);
    background: color-mix(in oklab, var(--ink) 3%, var(--paper-2));
    overflow: hidden;
    height: 26px;
    position: relative;
  }
  .tick-fact {
    display: block;
    font-size: 0.78rem;
    line-height: 26px;
    color: var(--muted);
    white-space: nowrap;
    padding: 0 1rem;
    animation: ticker-scroll 90s linear infinite;
  }
  @keyframes ticker-scroll {
    0%   { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .tick-fact { animation: none; padding: 0 1rem; }
  }

  /* ── MAIN GRID ─────────────────────────────────────────────────────── */
  .grid {
    display: grid;
    grid-template-columns: 280px 1fr 360px;
    gap: 1rem;
    padding: 1rem;
    align-items: start;
    min-height: 0;
    transition: grid-template-columns 400ms ease;
  }
  /* Early game: center the lone Assets column. Each reveal expands the grid. */
  .grid.minimal {
    grid-template-columns: 1fr minmax(280px, 360px) 1fr;
    align-content: center;
    padding-top: 0;
    padding-bottom: 8vh;
  }
  .grid.minimal .col.left { grid-column: 2; }
  .col { display: grid; gap: 0.8rem; align-content: start; }
  .col.center:empty, .col.right:empty { display: none; }
  .col h2 {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
    margin: 0;
    font-weight: 600;
  }
  .cards { display: grid; gap: 0.5rem; }

  /* ── GENERIC CARD ──────────────────────────────────────────────────── */
  .card {
    position: relative;
    appearance: none;
    font: inherit;
    text-align: left;
    background: var(--paper-2);
    color: inherit;
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 0.65rem 0.8rem;
    cursor: pointer;
    display: grid;
    gap: 0.3rem;
    overflow: hidden;
    transition: border-color 120ms, transform 80ms;
  }
  .card:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .card:active:not(:disabled) { transform: translateY(1px); }
  .card:disabled { opacity: 0.55; cursor: not-allowed; }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
  .name { font-weight: 600; font-size: 0.9rem; }
  .kind { font-weight: 400; color: var(--muted); font-size: 0.75rem; }
  .owned { color: var(--muted); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
  .blurb { color: var(--muted); font-size: 0.78rem; line-height: 1.35; }
  .card-foot { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
  .cost { font-weight: 600; font-size: 0.82rem; }
  .buy-n {
    font-size: 0.7rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .precedent {
    font-size: 0.7rem;
    color: var(--muted);
    border-left: 2px solid var(--accent);
    padding-left: 0.5rem;
    line-height: 1.35;
    opacity: 0.85;
  }
  .afford-fill {
    position: absolute;
    inset: auto 0 0 0;
    height: 2px;
    width: var(--fill, 0%);
    background: var(--accent);
    transition: width 200ms;
  }
  .project { border-style: dashed; }

  /* ── PLATFORM GRID ─────────────────────────────────────────────────── */
  .platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.7rem;
  }
  .platform-card {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0.7rem 0.85rem;
    background: var(--paper-2);
    border-top: 3px solid var(--tint);
    display: grid;
    gap: 0.5rem;
    min-height: 130px;
  }
  .platform-card.locked {
    background: transparent;
    border-color: var(--line);
    border-top-color: var(--line);
    opacity: 0.45;
  }
  .plt-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .plt-name { font-weight: 700; font-size: 0.95rem; letter-spacing: -0.01em; }
  .plt-lock { font-size: 0.7rem; color: var(--muted); text-transform: lowercase; }
  .plt-audience { font-size: 0.72rem; color: var(--muted); font-style: italic; }
  .plt-meter { display: grid; gap: 0.3rem; }
  .meter-row {
    display: grid;
    grid-template-columns: 3rem 1fr 3rem;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
  }
  .meter-label { color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.6rem; }
  .meter-num { text-align: right; color: var(--muted); }
  .meter-bar {
    height: 4px;
    background: var(--line);
    border-radius: 2px;
    overflow: hidden;
  }
  .meter-fill {
    height: 100%;
    width: var(--fill, 0%);
    transition: width 200ms;
  }
  .meter-fill.heat  { background: linear-gradient(90deg, var(--ok), var(--warn) 60%, var(--bad)); }
  .meter-fill.reach { background: var(--tint, var(--accent)); }
  .plt-locked-body {
    display: grid;
    place-items: center;
    flex: 1;
    color: var(--muted);
    font-size: 1.5rem;
    opacity: 0.5;
    min-height: 50px;
  }

  /* ── DEPICT TREES ──────────────────────────────────────────────────── */
  .trees { display: grid; gap: 0.5rem; }
  .tree {
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--paper-2);
    padding: 0.5rem 0.6rem;
    display: grid;
    gap: 0.4rem;
  }
  .tree-head {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.5rem;
    align-items: center;
  }
  .tree-tag {
    width: 1.4em; height: 1.4em; line-height: 1.4em;
    text-align: center;
    font-weight: 700; font-size: 0.78rem;
    border-radius: 3px;
    color: white;
  }
  .tree-discrediting  .tree-tag { background: hsl(0 60% 45%); }
  .tree-emotional     .tree-tag { background: hsl(20 75% 50%); }
  .tree-polarization  .tree-tag { background: hsl(280 55% 50%); }
  .tree-impersonation .tree-tag { background: hsl(160 50% 40%); }
  .tree-conspiracy    .tree-tag { background: hsl(220 60% 45%); }
  .tree-trolling      .tree-tag { background: hsl(60 70% 40%); color: hsl(220 18% 12%); }
  .tree-name { font-size: 0.85rem; text-transform: capitalize; }
  .tree-progress { font-size: 0.7rem; color: var(--muted); }
  .tree-nodes { display: grid; gap: 0.4rem; }
  .node {
    position: relative;
    appearance: none;
    text-align: left;
    background: var(--paper);
    color: inherit;
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0.45rem 0.6rem;
    font: inherit;
    cursor: pointer;
    display: grid;
    gap: 0.15rem;
    overflow: hidden;
  }
  .node:hover:not(:disabled) { border-color: var(--accent); }
  .node:disabled { opacity: 0.55; cursor: not-allowed; }
  .node-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.4rem;
  }
  .node-name { font-weight: 600; font-size: 0.82rem; }
  .node-lvl { font-size: 0.7rem; color: var(--muted); }
  .node-blurb { font-size: 0.72rem; color: var(--muted); line-height: 1.3; }
  .node-foot { display: flex; justify-content: space-between; align-items: baseline; gap: 0.4rem; }
  .node-cost { font-size: 0.74rem; font-weight: 600; }
  .tree-locked {
    padding: 0.5rem;
    text-align: center;
    color: var(--muted);
    opacity: 0.5;
    font-size: 0.85rem;
  }

  /* ── LOG ───────────────────────────────────────────────────────────── */
  .log {
    border-top: 1px solid var(--line);
    background: var(--paper-2);
    padding: 0.7rem 1rem 1rem;
    display: grid;
    gap: 0.3rem;
    max-height: 18vh;
    overflow: hidden;
  }
  .log h2 {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
    margin: 0;
    font-weight: 600;
  }
  .log-lines {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 0.15rem 1rem;
  }
  .log-lines .line {
    font-size: 0.78rem;
    color: var(--muted);
    font-style: italic;
    line-height: 1.45;
  }
  .log-lines .line:first-child { color: var(--ink); font-style: normal; }

  /* ── RESPONSIVE COLLAPSE ───────────────────────────────────────────── */
  @media (max-width: 1100px) {
    .grid { grid-template-columns: 1fr 1fr; }
    .col.right { grid-column: 1 / -1; }
  }
  @media (max-width: 720px) {
    .topbar { grid-template-columns: 1fr; }
    .grid { grid-template-columns: 1fr; padding: 0.6rem; }
    .col.left, .col.center, .col.right { grid-column: auto; }
  }
</style>

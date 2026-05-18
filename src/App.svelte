<script lang="ts">
  import { game } from './game/state.svelte';
  import { clearSave } from './game/save';
  import {
    buyAsset, buyUpgrade, completeProject,
    assetCost, upgradeCost,
    canBuyAsset, canBuyUpgrade, canCompleteProject,
  } from './game/core/actions';
  import { ASSETS, UPGRADES, PROJECTS } from './game/core/catalog';
  import { ACHIEVEMENTS } from './game/core/achievements';
  import {
    SYNERGIES, activateSynergy, isSynergyVisible,
    isSynergyTeased, canActivateSynergy,
  } from './game/core/synergies';
  import {
    PATRONS, activatePatron, isPatronVisible,
    isPatronTeased, canActivatePatron,
  } from './game/core/patrons';
  import { computeRates, computeMultiplierBreakdown } from './game/core/production';
  import { postPlatform, postYield, chargeTimeSeconds, freestylePost, freestyleYield } from './game/core/posting';
  import { affordableCount } from './game/core/math';
  import { DEPICT_IDS, PHASE_ORDER } from './game/types';
  import { PLATFORM_META } from './lib/platforms';
  import { fmt, fmtRate, etaToCap } from './lib/format';
  import { FACTS } from './lib/facts';
  import { eventDefById } from './game/core/eventPool';
  import {
    loadLegacy, computePrestigeGain, legacyMultiplier, performPrestige,
  } from './game/legacy';
  import { onMount } from 'svelte';

  type BulkMode = 1 | 10 | 100 | 'max';
  let bulkMode = $state<BulkMode>(1);

  function reset() {
    if (confirm('Reset run? This wipes the save and ALL legacy points.')) {
      clearSave();
      try { localStorage.removeItem('playbook:legacy:v1'); } catch {}
      location.reload();
    }
  }

  let legacy = $state(loadLegacy());
  const prestigeGain = $derived(computePrestigeGain(game));
  const currentLegacyMult = $derived(legacyMultiplier(legacy.points));

  // Click-to-post: active engagement mechanic. Each click adds 2% of attention
  // cap, 3-second cooldown. Cookie-Clicker style "click for cookies."
  const POST_COOLDOWN_MS = 3000;
  let lastPostClick = $state(0);
  let nowTick = $state(Date.now());
  onMount(() => {
    const handle = setInterval(() => { nowTick = Date.now(); }, 250);
    return () => clearInterval(handle);
  });
  const postCooldown = $derived(Math.max(0, lastPostClick + POST_COOLDOWN_MS - nowTick));
  function postClick() {
    if (postCooldown > 0) return;
    lastPostClick = Date.now();
    const cap = game.caps.attention;
    if (cap <= 0) return;
    game.resources.attention = Math.min(
      cap,
      game.resources.attention + cap * 0.02,
    );
  }

  // UX-14: prestige ceremony — replace browser confirm() with a proper modal
  let prestigeOpen = $state(false);
  function openPrestige() {
    const gain = computePrestigeGain(game);
    if (gain <= 0) {
      alert('No legacy points to gain yet. Push further first.');
      return;
    }
    prestigeOpen = true;
  }
  function confirmPrestige() {
    performPrestige(game);
    location.reload();
  }

  const rates = $derived(computeRates(game));
  const multBreakdown = $derived(computeMultiplierBreakdown(game));

  // For each resource, count visible items in the catalog that the player
  // can afford to buy with it RIGHT NOW. Surfaces "you have 29K engagement
  // — here's what it can buy" affordance in the topbar.
  function spendableCount(resource: string): number {
    let n = 0;
    for (const a of ASSETS) {
      if (a.costResource !== resource) continue;
      if (!isRevealed(a.id, a.visible)) continue;
      if (canBuyAsset(game, a.id, 1)) n++;
    }
    for (const u of UPGRADES) {
      if (u.costResource !== resource) continue;
      if (!isRevealed(u.id, u.visible)) continue;
      if ((game.upgrades[u.id] ?? 0) >= u.maxLevel) continue;
      if (canBuyUpgrade(game, u.id, 1)) n++;
    }
    for (const p of PROJECTS) {
      if (game.completedProjects[p.id]) continue;
      if (!isRevealed(p.id, p.visible)) continue;
      const cost = Object.entries(p.cost).find(([k]) => k === resource);
      if (!cost) continue;
      if (canCompleteProject(game, p.id)) n++;
    }
    return n;
  }
  let openBreakdown = $state<string | null>(null);  // which resource's breakdown is showing
  function toggleBreakdown(id: string) {
    openBreakdown = openBreakdown === id ? null : id;
  }

  // Stickiness: once revealed or teased, never hidden again — even if the
  // player spends down past the threshold. Read sticky flags set by tick.
  function isRevealed(id: string, predicate: (s: typeof game) => boolean): boolean {
    return predicate(game) || !!game.flags[`reveal:${id}`];
  }
  function isTeased(id: string, predicate: ((s: typeof game) => boolean) | undefined): boolean {
    if (!predicate) return !!game.flags[`tease:${id}`];
    return predicate(game) || !!game.flags[`tease:${id}`];
  }

  // Sort unbought (count==0) assets to top so newly-revealed things grab
  // attention; established assets keep their catalog order beneath.
  const visibleAssets = $derived(
    ASSETS.filter((a) => isRevealed(a.id, a.visible))
      .sort((a, b) => {
        const ac = game.assets[a.id] ?? 0;
        const bc = game.assets[b.id] ?? 0;
        if (ac === 0 && bc > 0) return -1;
        if (bc === 0 && ac > 0) return 1;
        return 0; // stable: preserve catalog order
      }),
  );
  const teasedAssets  = $derived(
    ASSETS.filter((a) => !isRevealed(a.id, a.visible) && isTeased(a.id, a.teased)),
  );
  const visibleProjects = $derived(
    PROJECTS.filter((p) => isRevealed(p.id, p.visible) && !game.completedProjects[p.id]),
  );
  const teasedProjects = $derived(
    PROJECTS.filter(
      (p) =>
        !isRevealed(p.id, p.visible) &&
        isTeased(p.id, p.teased) &&
        !game.completedProjects[p.id],
    ),
  );

  const visibleSynergies = $derived(
    SYNERGIES.filter((sn) => isSynergyVisible(game, sn) || !!game.flags[`reveal:${sn.id}`]),
  );
  const teasedSynergies = $derived(
    SYNERGIES.filter(
      (sn) =>
        !isSynergyVisible(game, sn) &&
        !game.flags[sn.id] &&
        (isSynergyTeased(game, sn) || !!game.flags[`tease:${sn.id}`]),
    ),
  );
  const showSynergies = $derived(visibleSynergies.length > 0 || teasedSynergies.length > 0);

  const visiblePatrons = $derived(
    PATRONS.filter((p) => isPatronVisible(game, p) || !!game.flags[`reveal:${p.id}`]),
  );
  const teasedPatrons = $derived(
    PATRONS.filter(
      (p) =>
        !isPatronVisible(game, p) &&
        !game.flags[p.id] &&
        (isPatronTeased(game, p) || !!game.flags[`tease:${p.id}`]),
    ),
  );
  const activePatrons = $derived(PATRONS.filter((p) => game.flags[p.id]));
  const showPatrons = $derived(
    visiblePatrons.length > 0 || teasedPatrons.length > 0 || activePatrons.length > 0,
  );

  // Sort priority so the newest/most-relevant tree floats to top:
  //   1. Teased-only (??? placeholder, just about to unlock) → top
  //   2. Revealed but lightly-invested → next, sorted by least progress
  //   3. Heavily-developed / maxed → bottom
  // Player attention follows their currency: new things prominent, mastered
  // things tucked away but still accessible.
  const treesView = $derived(
    DEPICT_IDS.map((tree) => {
      const all = UPGRADES.filter((u) => u.tree === tree);
      const visible = all
        .filter((u) => isRevealed(u.id, u.visible))
        .sort((a, b) => {
          // Within a tree: unlearned nodes (lvl 0) float to top.
          const al = game.upgrades[a.id] ?? 0;
          const bl = game.upgrades[b.id] ?? 0;
          if (al === 0 && bl > 0) return -1;
          if (bl === 0 && al > 0) return 1;
          return 0;
        });
      const teased  = all.filter((u) => !isRevealed(u.id, u.visible) && isTeased(u.id, u.teased));
      const totalLevel = all.reduce((acc, u) => acc + (game.upgrades[u.id] ?? 0), 0);
      const totalMax = all.reduce((acc, u) => acc + u.maxLevel, 0);
      const hasTeased = teased.length > 0;
      const hasRevealed = visible.length > 0;
      const sortKey = hasTeased && !hasRevealed
        ? 0
        : hasRevealed
          ? 1 + (totalMax > 0 ? totalLevel / totalMax : 0)
          : 2;
      return { tree, all, visible, teased, totalLevel, totalMax, sortKey };
    })
      .filter((t) => t.visible.length > 0 || t.teased.length > 0 || t.totalLevel > 0)
      .sort((a, b) => a.sortKey - b.sortKey),
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
  // Log is always present once the run has started (initial entry counts).
  const showLog         = $derived(game.log.length >= 1);
  const showProjects    = $derived(visibleProjects.length > 0 || teasedProjects.length > 0);
  const showTrees       = $derived(treesView.length > 0);
  // Platform grid is visible from t=0 (only X is unlocked in Grassroots).
  // Locked previews of next-phase platforms appear for anticipation.
  const showPlatformGrid = $derived(true);
  function isNextPhase(unlocksAt: typeof game.phase): boolean {
    const ci = PHASE_ORDER.indexOf(game.phase);
    const ui = PHASE_ORDER.indexOf(unlocksAt);
    return ui === ci + 1;
  }

  // (no "minimal mode" toggle — layout stays put; empty columns just collapse.)

  const buffActive = $derived(
    game.returnBuff !== null && game.returnBuff.until > game.lastTick,
  );

  // Active event banner derives. Use game.lastTick (reactive, updates every
  // tick) instead of Date.now() — Svelte 5 derived only re-runs on tracked
  // state changes; Date.now() isn't tracked so the countdown wouldn't move.
  const activeEvent = $derived(
    game.event && game.event.until > game.lastTick ? game.event : null,
  );
  const activeEventDef = $derived(activeEvent ? eventDefById(activeEvent.id) : null);
  const eventSecsLeft = $derived(
    activeEvent ? Math.max(0, Math.ceil((activeEvent.until - game.lastTick) / 1000)) : 0,
  );
  const eventProgress = $derived(
    activeEvent && activeEventDef
      ? Math.max(0, Math.min(1, 1 - (activeEvent.until - game.lastTick) / (activeEventDef.duration * 1000)))
      : 0,
  );

  // UX-2: POST click pulse — brief scale animation when manually firing.
  let firingPlatforms = $state<Record<string, number>>({});
  function postWithPulse(platformId: string) {
    postPlatform(game, platformId as Parameters<typeof postPlatform>[1]);
    firingPlatforms[platformId] = Date.now();
    setTimeout(() => {
      delete firingPlatforms[platformId];
      firingPlatforms = { ...firingPlatforms };
    }, 200);
  }
  function isFiring(platformId: string): boolean {
    return !!firingPlatforms[platformId];
  }

  // UX-7: achievement panel
  let showAchievements = $state(false);
  const achievementsEarned = $derived(ACHIEVEMENTS.filter((a) => !!game.flags[a.id]));
  const achievementsLocked = $derived(ACHIEVEMENTS.filter((a) => !game.flags[a.id]));

  // UX-12: welcome-back modal — read pending summary, render once, dismiss.
  const offlineSummary = $derived(game.pendingOfflineSummary ?? null);
  function dismissOfflineSummary() {
    game.pendingOfflineSummary = null;
  }
  function fmtDur(sec: number): string {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec - h * 3600) / 60);
    return `${h}h ${m}m`;
  }

  // UX-13: save-state indicator. game.lastSave is updated every 5s by the
  // loop. Show how recently we saved so the player knows progress is safe.
  const savedSecsAgo = $derived(
    game.lastSave > 0 ? Math.max(0, Math.floor((nowTick - game.lastSave) / 1000)) : 0,
  );

  // Rotating ticker
  let factIndex = $state(0);
  onMount(() => {
    factIndex = Math.floor(Math.random() * FACTS.length);
    const handle = setInterval(() => {
      factIndex = (factIndex + 1) % FACTS.length;
    }, 25_000);
    return () => clearInterval(handle);
  });
  const currentFact = $derived(FACTS[factIndex]);

  function affordabilityRatio(cost: number, resource: string): number {
    const have = game.resources[resource as keyof typeof game.resources] ?? 0;
    if (cost <= 0) return 1;
    return Math.min(1, have / cost);
  }
  function shortfall(cost: number, resource: string): string | null {
    const have = game.resources[resource as keyof typeof game.resources] ?? 0;
    if (have >= cost) return null;
    return `need ${fmt(cost - have)} more ${resource}`;
  }

  function depictLetter(t: string): string {
    return t[0].toUpperCase();
  }

  function upgradeEffectText(u: { multiplier: Record<string, number> }, lvl: number): string {
    const entries = Object.entries(u.multiplier);
    return entries.map(([res, per]) => {
      const perPct = (per * 100).toFixed(1);
      if (lvl > 0) {
        const totalPct = (per * lvl * 100).toFixed(1);
        return `+${perPct}% ${res}/lvl (now +${totalPct}%)`;
      }
      return `+${perPct}% ${res}/lvl`;
    }).join(' · ');
  }

  function assetEffectText(a: { produces: Record<string, number> }): string {
    const entries = Object.entries(a.produces);
    if (entries.length === 0) return '';
    return entries.map(([res, rate]) => `+${rate} ${res}/s each`).join(' · ');
  }

  // UX-9: per-asset milestone indicator. Mirrors assetMilestoneMultiplier
  // from production.ts: each doubling of owned past 25 adds +1 to the
  // multiplier. Returns the next threshold + current mult + progress.
  function milestoneInfo(count: number) {
    if (count < 25) {
      const cur = 1.0;
      const next = 25;
      return { cur, next, nextMult: 1.0, progress: count / 25 };
    }
    const cur = 1 + Math.log2(count / 25);
    // Next doubling threshold: smallest 25 * 2^k that exceeds count
    const tier = Math.floor(Math.log2(count / 25));
    const next = 25 * Math.pow(2, tier + 1);
    const nextMult = 1 + Math.log2(next / 25);
    const prevThreshold = 25 * Math.pow(2, tier);
    const progress = (count - prevThreshold) / (next - prevThreshold);
    return { cur, next, nextMult, progress };
  }

  // Rotating precedents — each card click advances to the next factoid.
  let precedentIndex = $state<Record<string, number>>({});
  function getPrecedent(id: string, precedents?: string[]): string | null {
    if (!precedents || precedents.length === 0) return null;
    const i = (precedentIndex[id] ?? 0) % precedents.length;
    return precedents[i];
  }
  function rotatePrecedent(id: string, precedents?: string[]): void {
    if (!precedents || precedents.length <= 1) return;
    precedentIndex[id] = ((precedentIndex[id] ?? 0) + 1) % precedents.length;
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
    const a = ASSETS.find((x) => x.id === id);
    rotatePrecedent(id, a?.precedents);
  }
  function doBuyUpgrade(id: string) {
    const n = upgradeBuyCount(id);
    if (n > 0) buyUpgrade(game, id, n);
    const u = UPGRADES.find((x) => x.id === id);
    rotatePrecedent(id, u?.precedents);
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
          {@const bd = multBreakdown[r]}
          {@const spendable = spendableCount(id)}
          <div class="rmeter res-{id}">
            <div class="rlabel">
              <span class="res-dot res-{id}"></span>{label}
              {#if spendable > 0}<span class="spendable-badge" title="{spendable} thing{spendable === 1 ? '' : 's'} you can buy right now with {id}">{spendable}</span>{/if}
            </div>
            <div class="rvalue num">{fmt(val)}<span class="cap"> / {fmt(cap)}</span></div>
            <button
              type="button"
              class="rrate"
              class:positive={rate > 0}
              class:has-breakdown={bd.sources.length > 0}
              onclick={() => toggleBreakdown(id)}
              title={bd.sources.length > 0 ? `total includes ×${bd.total.toFixed(2)} multiplier — click for breakdown` : ''}
            >{fmtRate(rate)}</button>
            {#if eta}<div class="reta">{eta}</div>{/if}
            <div class="rfill" style="--fill: {cap > 0 ? Math.min(100, (val / cap) * 100) : 0}%"></div>
            {#if openBreakdown === id && bd.sources.length > 0}
              <div class="breakdown-popover">
                <div class="breakdown-head">
                  {label} multiplier: <strong>×{bd.total.toFixed(2)}</strong>
                </div>
                <div class="breakdown-list">
                  {#each bd.sources as src (src.name)}
                    <div class="breakdown-row">
                      <span class="breakdown-name">{src.name}</span>
                      <span class="breakdown-factor num">×{src.factor.toFixed(2)}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
      {#if showCureMeter}
        <div class="rmeter cure">
          <div class="rlabel"><span class="res-dot cure-dot"></span>Cure</div>
          <div class="rvalue num">{(game.cure * 100).toFixed(2)}<span class="cap">%</span></div>
          <div class="rrate"></div>
          <div class="rfill cure-fill" style="--fill: {game.cure * 100}%"></div>
        </div>
      {/if}
      {#if buffActive}
        <div class="buff" title="Return buff: come-back-soon bonus.">×{game.returnBuff!.mult} BUFF</div>
      {/if}
      <!-- per-platform POST buttons are on the platform cards now -->
      {#if false}<span></span>{/if}
    </div>
    <div class="topbar-actions">
      {#if showBulkBuy && false /* moved to Assets section */}{/if}
      {#if legacy.points > 0 || prestigeGain > 0}
        <button class="ghost prestige" onclick={openPrestige} title="Reset run, bank legacy points">
          ★ {legacy.points}{prestigeGain > 0 ? ` (+${prestigeGain})` : ''}
        </button>
      {/if}
      <button
        class="ghost achievement-btn"
        onclick={() => (showAchievements = true)}
        title="View achievements"
      >🏆 {achievementsEarned.length}/{ACHIEVEMENTS.length}</button>
      <span class="save-indicator" title="auto-saved to your browser">
        {savedSecsAgo < 10 ? '● saved' : `● saved ${savedSecsAgo}s ago`}
      </span>
      <button class="ghost" onclick={reset}>reset</button>
    </div>
  </header>

  <!-- TICKER -->
  {#if showTicker}
    <div class="ticker">
      <span class="tick-fact">
        {currentFact.text} <em class="tick-source">— {currentFact.source}</em>
      </span>
    </div>
  {/if}

  <!-- ACTIVE EVENT BANNER — always-reserved slot so its appearance
       doesn't shove the rest of the page up/down. -->
  <div class="event-band" class:has-event={!!activeEvent} class:negative={activeEvent && activeEvent.mult < 1}>
    {#if activeEvent && activeEventDef}
      <div class="event-row">
        <span class="event-pulse">▶</span>
        <span class="event-headline">{activeEventDef.headline}</span>
        <span class="event-effect">
          {activeEvent.mult >= 1 ? '+' : ''}{Math.round((activeEvent.mult - 1) * 100)}%
          {activeEvent.resourceId}
        </span>
        <span class="event-countdown num">{eventSecsLeft}s</span>
      </div>
      <div class="event-progress">
        <div class="event-progress-fill" style="--fill: {eventProgress * 100}%"></div>
      </div>
    {:else}
      <div class="event-row idle">
        <span class="event-pulse">○</span>
        <span class="event-headline">no active headline — next event in 1–2 min</span>
      </div>
    {/if}
  </div>

  <!-- MAIN GRID -->
  <main class="grid">
    <!-- LEFT: Assets + Projects -->
    <section class="col left">
      <div class="section-head">
        <h2>Assets</h2>
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
      </div>
      <div class="cards">
        {#each visibleAssets as a (a.id)}
          {@const rawN = assetBuyCount(a.id)}
          {@const n = bulkMode === 'max' ? rawN : Math.max(1, rawN)}
          {@const cost = assetCost(game, a.id, Math.max(1, n))}
          {@const affordable = n > 0 && canBuyAsset(game, a.id, n)}
          {@const ratio = affordabilityRatio(cost, a.costResource)}
          {@const pre = getPrecedent(a.id, a.precedents)}
          {@const sf = !affordable && n > 0 ? shortfall(cost, a.costResource) : null}
          {@const owned = game.assets[a.id] ?? 0}
          {@const m = owned > 0 && Object.keys(a.produces).length > 0 ? milestoneInfo(owned) : null}
          <button class="card asset" disabled={!affordable} onclick={() => doBuyAsset(a.id)} title={pre ?? ''}>
            <div class="card-head">
              <span class="name">{a.name} <span class="kind">[{a.kind}]</span></span>
              <span class="owned">×{owned}</span>
            </div>
            <div class="blurb">{a.blurb}</div>
            {#if assetEffectText(a)}<div class="effect">{assetEffectText(a)}</div>{/if}
            {#if m}
              <div class="milestone" title="At {m.next} owned: production multiplier rises from ×{m.cur.toFixed(2)} to ×{m.nextMult.toFixed(2)}">
                <div class="milestone-text">
                  <span class="milestone-now">★ ×{m.cur.toFixed(2)} now</span>
                  <span class="milestone-next">next ×{m.nextMult.toFixed(2)} at {m.next}</span>
                </div>
                <div class="milestone-bar">
                  <div class="milestone-fill" style="--fill: {m.progress * 100}%"></div>
                </div>
                <div class="milestone-text">
                  <span class="milestone-next">{m.next - owned} more to unlock</span>
                  <span class="milestone-count num">{owned}/{m.next}</span>
                </div>
              </div>
            {/if}
            {#if pre}
              <div class="precedent">
                {pre}
                {#if a.precedents && a.precedents.length > 1}
                  <span class="precedent-counter">[{((precedentIndex[a.id] ?? 0) % a.precedents.length) + 1}/{a.precedents.length}]</span>
                {/if}
              </div>
            {/if}
            <div class="card-foot">
              <span class="buy-n">+{n}</span>
              <span class="cost num res-{a.costResource}">{fmt(cost)} {a.costResource}</span>
            </div>
            {#if sf}<div class="shortfall">{sf}</div>{/if}
            <div class="afford-fill" style="--fill: {ratio * 100}%"></div>
          </button>
        {/each}
        {#each teasedAssets as a (a.id)}
          <div class="card teased" title={a.teaseHint ?? ''}>
            <div class="card-head">
              <span class="name">???</span>
              <span class="owned">locked</span>
            </div>
            <div class="blurb">{a.teaseHint ?? 'Something coming.'}</div>
            <div class="card-foot">
              <span class="cost num res-{a.costResource}">{fmt(a.baseCost)} {a.costResource}</span>
            </div>
          </div>
        {/each}
      </div>

      {#if showProjects || teasedProjects.length > 0}
        <h2>Projects</h2>
        <div class="cards">
          {#each visibleProjects as p (p.id)}
            {@const affordable = canCompleteProject(game, p.id)}
            {@const [res, amt] = Object.entries(p.cost)[0]}
            {@const ratio = affordabilityRatio(amt as number, res)}
            {@const ppre = getPrecedent(p.id, p.precedents)}
            {@const psf = !affordable ? shortfall(amt as number, res) : null}
            <button class="card project" disabled={!affordable} onclick={() => completeProject(game, p.id)} title={ppre ?? ''}>
              <div class="card-head">
                <span class="name">{p.name}</span>
              </div>
              <div class="blurb">{p.blurb}</div>
              {#if ppre}
                <div class="precedent">
                  {ppre}
                  {#if p.precedents && p.precedents.length > 1}
                    <span class="precedent-counter">[{((precedentIndex[p.id] ?? 0) % p.precedents.length) + 1}/{p.precedents.length}]</span>
                  {/if}
                </div>
              {/if}
              <div class="card-foot">
                <span class="buy-n">one-shot</span>
                <span class="cost num res-{res}">{fmt(amt as number)} {res}</span>
              </div>
              {#if psf}<div class="shortfall">{psf}</div>{/if}
              <div class="afford-fill" style="--fill: {ratio * 100}%"></div>
            </button>
          {/each}
          {#each teasedProjects as p (p.id)}
            {@const [res, amt] = Object.entries(p.cost)[0]}
            <div class="card project teased" title={p.teaseHint ?? ''}>
              <div class="card-head">
                <span class="name">???</span>
                <span class="owned">locked</span>
              </div>
              <div class="blurb">{p.teaseHint ?? 'A paradigm project coming.'}</div>
              <div class="card-foot">
                <span class="cost num res-{res}">{fmt(amt as number)} {res}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if showSynergies}
        <h2>Synergies</h2>
        <div class="cards">
          {#each visibleSynergies as sn (sn.id)}
            {@const [res, amt] = Object.entries(sn.cost)[0]}
            {@const affordable = canActivateSynergy(game, sn)}
            <button
              class="card synergy"
              disabled={!affordable}
              onclick={() => activateSynergy(game, sn.id)}
              title={sn.precedent ?? ''}
            >
              <div class="card-head">
                <span class="name">{sn.name}</span>
                <span class="owned">{sn.trees[0][0].toUpperCase()}+{sn.trees[1][0].toUpperCase()}</span>
              </div>
              <div class="blurb">{sn.blurb}</div>
              {#if sn.precedent}<div class="precedent">{sn.precedent}</div>{/if}
              <div class="card-foot">
                <span class="buy-n">combo</span>
                <span class="cost num res-{res}">{fmt(amt as number)} {res}</span>
              </div>
            </button>
          {/each}
          {#each teasedSynergies as sn (sn.id)}
            {@const [res, amt] = Object.entries(sn.cost)[0]}
            <div class="card synergy teased">
              <div class="card-head">
                <span class="name">??? + ???</span>
                <span class="owned">locked</span>
              </div>
              <div class="blurb">Push both {sn.trees[0]} and {sn.trees[1]} to tier {sn.threshold}.</div>
              <div class="card-foot">
                <span class="cost num res-{res}">{fmt(amt as number)} {res}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if showPatrons}
        <h2>Patrons</h2>
        <div class="cards">
          {#each activePatrons as pa (pa.id)}
            <div class="card patron active">
              <div class="card-head">
                <span class="name">✓ {pa.name}</span>
                <span class="owned">active</span>
              </div>
              <div class="blurb">{pa.archetype}</div>
              <div class="effect">{Object.entries(pa.buffs).map(([r, v]) => `+${Math.round((v as number) * 100)}% ${r}`).join(' · ')}</div>
            </div>
          {/each}
          {#each visiblePatrons as pa (pa.id)}
            {@const [res, amt] = Object.entries(pa.cost)[0]}
            {@const affordable = canActivatePatron(game, pa)}
            {@const ppre = getPrecedent(pa.id, pa.precedents)}
            <button
              class="card patron"
              disabled={!affordable}
              onclick={() => { activatePatron(game, pa.id); rotatePrecedent(pa.id, pa.precedents); }}
              title={ppre ?? ''}
            >
              <div class="card-head">
                <span class="name">{pa.name}</span>
                <span class="owned">{pa.archetype}</span>
              </div>
              <div class="blurb">{pa.blurb}</div>
              <div class="effect">{Object.entries(pa.buffs).map(([r, v]) => `+${Math.round((v as number) * 100)}% ${r}`).join(' · ')} · cure +{Math.round(pa.cureJump * 100)}%</div>
              {#if ppre}
                <div class="precedent">
                  {ppre}
                  {#if pa.precedents.length > 1}
                    <span class="precedent-counter">[{((precedentIndex[pa.id] ?? 0) % pa.precedents.length) + 1}/{pa.precedents.length}]</span>
                  {/if}
                </div>
              {/if}
              <div class="card-foot">
                <span class="buy-n">one-shot</span>
                <span class="cost num res-{res}">{fmt(amt as number)} {res}</span>
              </div>
            </button>
          {/each}
          {#each teasedPatrons as pa (pa.id)}
            <div class="card patron teased">
              <div class="card-head">
                <span class="name">???</span>
                <span class="owned">{pa.archetype}</span>
              </div>
              <div class="blurb">A powerful backer. Unlocks in {pa.era}.{pa.requiresHint ? ' ' + pa.requiresHint : ''}</div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- RIGHT: Platform dashboard (passive gauges) — uses explicit grid-column -->
    {#if showPlatformGrid}
    <section class="col platforms-col">
      <h2>Platforms</h2>
      <div class="platform-grid">
        {#each PLATFORM_META as meta (meta.id)}
          {@const p = game.platforms[meta.id]}
          {@const unlocked = p.unlocked}
          {#if unlocked || isNextPhase(meta.unlocksAt)}
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
                  <span class="meter-num num" class:hot={p.heat > 0.7}>{(p.heat * 100).toFixed(0)}%</span>
                </div>
                <div class="meter-row">
                  <span class="meter-label">charge</span>
                  <div class="meter-bar">
                    <div class="meter-fill charge" style="--fill: {p.chargeProgress * 100}%"></div>
                  </div>
                  <span class="meter-num num">{p.chargeProgress >= 1 ? 'READY' : `${(p.chargeProgress * 100).toFixed(0)}%`}</span>
                </div>
              </div>
              {#if p.burned && p.burnedUntil > game.lastTick}
                <div class="plt-burned">
                  ⚠ BURNED · {Math.max(0, Math.ceil((p.burnedUntil - game.lastTick) / 1000))}s
                </div>
              {:else if p.heat >= 0.85}
                <div class="plt-hot overheated">
                  ⚠ OVERHEATED · posts at {Math.round((1 - p.heat * 0.6) * 100)}% strength · let it cool
                </div>
              {:else if p.heat >= 0.7}
                <div class="plt-hot">
                  HOT · posts at {Math.round((1 - p.heat * 0.6) * 100)}% strength
                </div>
              {/if}
              {@const y = postYield(game, meta.id)}
              {@const fy = freestyleYield(game, meta.id)}
              {@const ready = p.chargeProgress >= 1}
              {@const attCapped = game.resources.attention >= game.caps.attention}
              <button
                class="post-platform"
                class:ready
                class:firing={isFiring(meta.id)}
                disabled={!ready}
                onclick={() => postWithPulse(meta.id)}
                title="Disciplined post — fires at 100% charge for full yield. Low heat (+0.8%)."
              >
                {#if ready}
                  {#if attCapped}
                    POST · +{fmt(y * 0.1)} eng
                  {:else}
                    POST · +{fmt(y)} att
                  {/if}
                {:else}
                  charging · {(chargeTimeSeconds(game) * (1 - p.chargeProgress)).toFixed(1)}s
                {/if}
              </button>
              <button
                class="post-platform freestyle"
                onclick={() => { freestylePost(game, meta.id); firingPlatforms[meta.id + ':f'] = Date.now(); setTimeout(() => { delete firingPlatforms[meta.id + ':f']; firingPlatforms = { ...firingPlatforms }; }, 200); }}
                class:firing={isFiring(meta.id + ':f')}
                title="Freestyle — fire anytime, ignores charge. {Math.round(fy)} attention right now, but +4% heat per click. Spam to push through."
              >
                {#if attCapped}
                  PUSH IT · +{fmt(fy * 0.1)} eng
                {:else}
                  PUSH IT · +{fmt(fy)} att
                {/if}
              </button>
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

    <!-- CENTER: DEPICT trees — explicit grid-column 2 -->
    {#if showTrees}
    <section class="col trees-col">
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
                {@const rawN = upgradeBuyCount(u.id)}
                {@const n = bulkMode === 'max' ? rawN : Math.max(1, rawN)}
                {@const cost = upgradeCost(game, u.id, Math.max(1, n))}
                {@const affordable = !maxed && n > 0 && canBuyUpgrade(game, u.id, n)}
                {@const ratio = affordabilityRatio(cost, u.costResource)}
                {@const upre = getPrecedent(u.id, u.precedents)}
                {@const usf = !maxed && !affordable && n > 0 ? shortfall(cost, u.costResource) : null}
                <button class="node" disabled={!affordable || maxed} onclick={() => doBuyUpgrade(u.id)} title={upre ?? ''}>
                  <div class="node-head">
                    <span class="node-name">{u.name}</span>
                    <span class="node-lvl num">{lvl}/{u.maxLevel}</span>
                  </div>
                  <div class="node-blurb">{u.blurb}</div>
                  <div class="effect">{upgradeEffectText(u, lvl)}</div>
                  {#if upre}
                    <div class="precedent">
                      {upre}
                      {#if u.precedents && u.precedents.length > 1}
                        <span class="precedent-counter">[{((precedentIndex[u.id] ?? 0) % u.precedents.length) + 1}/{u.precedents.length}]</span>
                      {/if}
                    </div>
                  {/if}
                  <div class="node-foot">
                    {#if !maxed}<span class="buy-n">+{n}</span>{/if}
                    <span class="node-cost num res-{u.costResource}">{maxed ? 'maxed' : `${fmt(cost)} ${u.costResource}`}</span>
                  </div>
                  {#if usf}<div class="shortfall">{usf}</div>{/if}
                  <div class="afford-fill" style="--fill: {ratio * 100}%"></div>
                </button>
              {/each}
              {#each t.teased as u (u.id)}
                <div class="node teased" title={u.teaseHint ?? ''}>
                  <div class="node-head">
                    <span class="node-name">???</span>
                    <span class="node-lvl num">locked</span>
                  </div>
                  <div class="node-blurb">{u.teaseHint ?? 'A technique coming.'}</div>
                  <div class="node-foot">
                    <span class="node-cost num res-{u.costResource}">{fmt(u.baseCost)} {u.costResource}</span>
                  </div>
                </div>
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
        {#each game.log as line, i (i)}
          <div class="line">{line}</div>
        {/each}
      </div>
    </footer>
  {/if}

  <!-- UX-14: prestige ceremony modal -->
  {#if prestigeOpen}
    <div class="modal-backdrop" onclick={() => (prestigeOpen = false)} role="presentation">
      <div class="prestige-modal" role="dialog" onclick={(e) => e.stopPropagation()}>
        <div class="prestige-icon">★</div>
        <h3>End this Operation</h3>
        <p class="prestige-sub">Your operation runs its course. Burn it down, bank the lessons.</p>
        <div class="prestige-stats">
          <div class="prestige-stat-row">
            <span>Peak attention</span>
            <span class="num res-attention">{fmt(game.peakResources.attention ?? 0)}</span>
          </div>
          <div class="prestige-stat-row">
            <span>Peak engagement</span>
            <span class="num res-engagement">{fmt(game.peakResources.engagement ?? 0)}</span>
          </div>
          <div class="prestige-stat-row">
            <span>Run duration</span>
            <span class="num">{fmtDur(Math.floor((Date.now() - game.startedAt) / 1000))}</span>
          </div>
          <div class="prestige-stat-row total">
            <span>Legacy points to gain</span>
            <span class="num">★ +{prestigeGain}</span>
          </div>
          <div class="prestige-stat-row">
            <span>New legacy total</span>
            <span class="num">★ {legacy.points + prestigeGain}</span>
          </div>
          <div class="prestige-stat-row">
            <span>Production buff after reset</span>
            <span class="num">×{legacyMultiplier(legacy.points + prestigeGain).toFixed(2)}</span>
          </div>
        </div>
        <p class="prestige-warning">
          Everything else resets — generators, upgrades, projects, patrons, achievements (this run).
          Legacy points and best-run records persist forever.
        </p>
        <div class="prestige-actions">
          <button class="ghost" onclick={() => (prestigeOpen = false)}>cancel</button>
          <button class="prestige-confirm" onclick={confirmPrestige}>
            ★ End operation · bank {prestigeGain} points
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- UX-7: achievements panel -->
  {#if showAchievements}
    <div class="modal-backdrop" onclick={() => (showAchievements = false)} role="presentation">
      <div class="ach-modal" role="dialog" onclick={(e) => e.stopPropagation()}>
        <div class="ach-head">
          <h3>Achievements · {achievementsEarned.length}/{ACHIEVEMENTS.length}</h3>
          <button class="ghost" onclick={() => (showAchievements = false)}>close</button>
        </div>
        <div class="ach-list">
          {#each achievementsEarned as a (a.id)}
            <div class="ach-row earned">
              <span class="ach-mark">★</span>
              <div class="ach-body">
                <div class="ach-name">{a.name}</div>
                <div class="ach-hint">{a.hint}</div>
                {#if a.precedent}<div class="ach-precedent">{a.precedent}</div>{/if}
              </div>
              <span class="ach-buff res-{a.buff.resource}">+{Math.round(a.buff.amount * 100)}% {a.buff.resource}</span>
            </div>
          {/each}
          {#each achievementsLocked as a (a.id)}
            <div class="ach-row locked">
              <span class="ach-mark">○</span>
              <div class="ach-body">
                <div class="ach-name">{a.name}</div>
                <div class="ach-hint">{a.hint}</div>
              </div>
              <span class="ach-buff locked res-{a.buff.resource}">+{Math.round(a.buff.amount * 100)}% {a.buff.resource}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- UX-12: welcome-back modal — fires once on offline-return -->
  {#if offlineSummary}
    <div class="modal-backdrop" onclick={dismissOfflineSummary} role="presentation">
      <div class="welcome-modal" role="dialog" onclick={(e) => e.stopPropagation()}>
        <h3>Welcome back</h3>
        <p class="welcome-subtitle">You were away for {fmtDur(offlineSummary.awaySec)} of game time.</p>
        {#if Object.keys(offlineSummary.gains).length > 0}
          <div class="welcome-gains">
            <div class="welcome-gains-head">Earned (at 25% efficiency, capped at 1h):</div>
            {#each Object.entries(offlineSummary.gains) as [res, amt] (res)}
              <div class="welcome-gain-row">
                <span class="res-{res}">{res}</span>
                <span class="num res-{res}">+{fmt(amt as number)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="welcome-empty">Production was idle — nothing produced while away.</p>
        {/if}
        {#if offlineSummary.buffActive}
          <div class="welcome-buff">
            ★ Return Buff active: ×2 production for the next 5 minutes.
          </div>
        {/if}
        <button class="ghost welcome-dismiss" onclick={dismissOfflineSummary}>Continue</button>
      </div>
    </div>
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

    /* Per-resource colors — used on costs, effects, topbar meters,
       and resource value text so the eye learns which currency is which. */
    --res-attention:           hsl(40 85% 50%);
    --res-engagement:          hsl(200 70% 50%);
    --res-followers:           hsl(140 55% 45%);
    --res-credibility:         hsl(280 55% 55%);
    --res-narrativeDominance:  hsl(0 70% 50%);
    --res-syntheticReality:    hsl(180 65% 55%);
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
    display: flex;
    flex-direction: column;
  }
  /* Topbar / ticker / log are fixed-height bands; main flexes to fill so the
     log is always pinned to the bottom of the viewport regardless of which
     bands are present. */
  .topbar, .ticker, .log { flex-shrink: 0; }
  .grid { flex: 1 1 auto; }

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
  .rlabel {
    font-size: 0.65rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    gap: 0.4em;
  }
  .spendable-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2em;
    height: 1.2em;
    padding: 0 0.3em;
    font-size: 0.7rem;
    font-weight: 700;
    border-radius: 999px;
    background: var(--ok);
    color: white;
    letter-spacing: 0;
    text-transform: none;
    margin-left: auto;
  }
  .rvalue { font-size: 0.95rem; font-weight: 600; }
  .rvalue .cap { color: var(--muted); font-weight: 400; }
  .rrate {
    appearance: none;
    font: inherit;
    font-size: 0.7rem;
    color: var(--muted);
    background: transparent;
    border: none;
    padding: 0;
    cursor: default;
    text-align: left;
  }
  .rrate.positive { color: var(--ok); }
  .rrate.has-breakdown {
    cursor: pointer;
    border-bottom: 1px dotted color-mix(in oklab, currentColor 40%, transparent);
  }
  .rrate.has-breakdown:hover { color: var(--ink); }
  .mult-hint {
    margin-left: 0.3em;
    opacity: 0.7;
    font-weight: 600;
  }
  .breakdown-popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0.5rem 0.6rem;
    box-shadow: 0 6px 18px color-mix(in oklab, var(--ink) 14%, transparent);
    z-index: 30;
    font-size: 0.74rem;
  }
  .breakdown-head {
    color: var(--muted);
    padding-bottom: 0.3rem;
    margin-bottom: 0.3rem;
    border-bottom: 1px solid var(--line);
  }
  .breakdown-list {
    display: grid;
    gap: 0.1rem;
    max-height: 40vh;
    overflow-y: auto;
  }
  .breakdown-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .breakdown-name { color: var(--ink); }
  .breakdown-factor { color: var(--ok); font-weight: 600; }

  /* UX-12: welcome-back modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in oklab, var(--ink) 60%, transparent);
    display: grid;
    place-items: center;
    z-index: 100;
    backdrop-filter: blur(2px);
  }
  .welcome-modal {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 1.5rem 1.6rem;
    max-width: 380px;
    width: calc(100vw - 2rem);
    box-shadow: 0 12px 36px color-mix(in oklab, var(--ink) 30%, transparent);
    display: grid;
    gap: 0.7rem;
  }
  .welcome-modal h3 { margin: 0; font-size: 1.1rem; }
  .welcome-subtitle { color: var(--muted); margin: 0; font-size: 0.85rem; }
  .welcome-gains {
    display: grid;
    gap: 0.25rem;
    padding: 0.6rem 0.7rem;
    background: var(--paper-2);
    border-radius: 5px;
  }
  .welcome-gains-head {
    font-size: 0.7rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.2rem;
  }
  .welcome-gain-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
    font-weight: 500;
  }
  .welcome-empty {
    margin: 0;
    color: var(--muted);
    font-style: italic;
    font-size: 0.85rem;
  }
  .welcome-buff {
    padding: 0.5rem 0.6rem;
    background: color-mix(in oklab, var(--accent) 16%, transparent);
    color: var(--accent);
    border-radius: 4px;
    font-size: 0.82rem;
    font-weight: 600;
    text-align: center;
  }
  .welcome-dismiss {
    margin-top: 0.4rem;
    align-self: end;
  }

  /* UX-7: achievement panel */
  .ach-modal {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 1.2rem 1.3rem;
    max-width: 640px;
    width: calc(100vw - 2rem);
    max-height: 80vh;
    box-shadow: 0 12px 36px color-mix(in oklab, var(--ink) 30%, transparent);
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 0.8rem;
  }
  .ach-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .ach-head h3 { margin: 0; }
  .ach-list {
    display: grid;
    gap: 0.4rem;
    overflow-y: auto;
    padding-right: 0.4rem;
  }
  .ach-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.6rem;
    align-items: start;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--paper-2);
  }
  .ach-row.locked { opacity: 0.55; }
  .ach-row.earned { border-color: color-mix(in oklab, hsl(45 90% 50%) 50%, var(--line)); background: color-mix(in oklab, hsl(45 90% 50%) 6%, var(--paper-2)); }
  .ach-mark { font-size: 1rem; line-height: 1.4; }
  .ach-row.earned .ach-mark { color: hsl(45 90% 45%); }
  .ach-row.locked .ach-mark { color: var(--muted); }
  .ach-body { display: grid; gap: 0.15rem; min-width: 0; }
  .ach-name { font-weight: 600; font-size: 0.92rem; }
  .ach-hint { font-size: 0.75rem; color: var(--muted); }
  .ach-precedent {
    font-size: 0.7rem;
    color: var(--muted);
    border-left: 2px solid var(--accent);
    padding-left: 0.5rem;
    margin-top: 0.2rem;
    font-style: italic;
  }
  .ach-buff {
    font-size: 0.78rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .ach-buff.locked { opacity: 0.7; }
  .achievement-btn { color: hsl(45 90% 45%); border-color: hsl(45 90% 45%); }

  /* UX-14: prestige ceremony modal */
  .prestige-modal {
    background: var(--paper);
    border: 1px solid color-mix(in oklab, hsl(45 90% 50%) 35%, var(--line));
    border-radius: 10px;
    padding: 1.6rem 1.7rem 1.4rem;
    max-width: 440px;
    width: calc(100vw - 2rem);
    box-shadow: 0 16px 48px color-mix(in oklab, hsl(45 90% 40%) 22%, transparent);
    display: grid;
    gap: 0.8rem;
    text-align: center;
  }
  .prestige-icon {
    font-size: 2.4rem;
    color: hsl(45 90% 50%);
    text-shadow: 0 0 16px color-mix(in oklab, hsl(45 90% 55%) 70%, transparent);
    margin-bottom: -0.4rem;
  }
  .prestige-modal h3 {
    margin: 0;
    font-size: 1.15rem;
    letter-spacing: -0.02em;
  }
  .prestige-sub {
    color: var(--muted);
    margin: 0 0 0.4rem;
    font-size: 0.86rem;
  }
  .prestige-stats {
    display: grid;
    gap: 0.3rem;
    text-align: left;
    background: var(--paper-2);
    padding: 0.7rem 0.8rem;
    border-radius: 6px;
    font-size: 0.85rem;
  }
  .prestige-stat-row {
    display: flex;
    justify-content: space-between;
  }
  .prestige-stat-row.total {
    border-top: 1px solid var(--line);
    padding-top: 0.35rem;
    margin-top: 0.15rem;
    font-weight: 700;
    color: hsl(45 90% 45%);
  }
  .prestige-warning {
    font-size: 0.75rem;
    color: var(--muted);
    font-style: italic;
    margin: 0;
    line-height: 1.4;
  }
  .prestige-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
    margin-top: 0.4rem;
  }
  .prestige-confirm {
    appearance: none;
    font: inherit;
    font-weight: 700;
    font-size: 0.88rem;
    padding: 0.6rem 1rem;
    border: 1px solid hsl(45 90% 45%);
    background: linear-gradient(135deg, hsl(45 90% 50%), hsl(40 95% 55%));
    color: hsl(220 18% 12%);
    border-radius: 6px;
    cursor: pointer;
    transition: transform 80ms, box-shadow 200ms;
    box-shadow: 0 0 0 0 transparent;
  }
  .prestige-confirm:hover {
    box-shadow: 0 0 0 4px color-mix(in oklab, hsl(45 90% 55%) 35%, transparent);
  }
  .prestige-confirm:active { transform: scale(0.97); }
  .reta { font-size: 0.65rem; color: var(--muted); font-style: italic; }
  .num { font-variant-numeric: tabular-nums; }

  /* Resource-color helpers. Apply .res-<resourceId> to any element that
     should pick up that resource's tint (cost labels, meter values, etc). */
  .res-attention          { color: var(--res-attention); }
  .res-engagement         { color: var(--res-engagement); }
  .res-followers          { color: var(--res-followers); }
  .res-credibility        { color: var(--res-credibility); }
  .res-narrativeDominance { color: var(--res-narrativeDominance); }
  .res-syntheticReality   { color: var(--res-syntheticReality); }

  /* UX-15: currency dot — small colored circle paired with the label,
     so currency identity is multi-modal (not color alone). */
  .res-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 0.4em;
    vertical-align: middle;
    box-shadow: 0 0 4px currentColor;
  }
  .res-dot.res-attention          { background: var(--res-attention); color: var(--res-attention); }
  .res-dot.res-engagement         { background: var(--res-engagement); color: var(--res-engagement); }
  .res-dot.res-followers          { background: var(--res-followers); color: var(--res-followers); }
  .res-dot.res-credibility        { background: var(--res-credibility); color: var(--res-credibility); }
  .res-dot.res-narrativeDominance { background: var(--res-narrativeDominance); color: var(--res-narrativeDominance); }
  .res-dot.res-syntheticReality   { background: var(--res-syntheticReality); color: var(--res-syntheticReality); }
  .res-dot.cure-dot               { background: var(--bad); color: var(--bad); }
  .rmeter.res-attention          .rfill { background: var(--res-attention); }
  .rmeter.res-engagement         .rfill { background: var(--res-engagement); }
  .rmeter.res-followers          .rfill { background: var(--res-followers); }
  .rmeter.res-credibility        .rfill { background: var(--res-credibility); }
  .rmeter.res-narrativeDominance .rfill { background: var(--res-narrativeDominance); }
  .rmeter.res-syntheticReality   .rfill { background: var(--res-syntheticReality); }
  .rmeter.res-attention          .rvalue { color: var(--res-attention); }
  .rmeter.res-engagement         .rvalue { color: var(--res-engagement); }
  .rmeter.res-followers          .rvalue { color: var(--res-followers); }
  .rmeter.res-credibility        .rvalue { color: var(--res-credibility); }
  .rmeter.res-narrativeDominance .rvalue { color: var(--res-narrativeDominance); }
  .rmeter.res-syntheticReality   .rvalue { color: var(--res-syntheticReality); }
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
  .post-btn {
    appearance: none;
    font: inherit;
    display: grid;
    grid-template-rows: auto auto;
    gap: 0.1rem;
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--ok);
    background: color-mix(in oklab, var(--ok) 15%, transparent);
    color: var(--ok);
    border-radius: 4px;
    cursor: pointer;
    align-self: center;
    text-align: center;
    transition: opacity 200ms, background 200ms;
  }
  .post-btn:hover:not(.cooling) {
    background: color-mix(in oklab, var(--ok) 30%, transparent);
  }
  .post-btn.cooling {
    opacity: 0.5;
    cursor: not-allowed;
    color: var(--muted);
    border-color: var(--line);
    background: transparent;
  }
  .post-label { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; }
  .post-cd { font-size: 0.65rem; opacity: 0.85; }
  .topbar-actions { display: flex; gap: 0.4rem; align-items: center; }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
  }
  .section-head h2 { margin: 0; }
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
  .bulk-btn:active { transform: scale(0.97); transition: transform 60ms; }
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
  .ghost:active { transform: scale(0.97); transition: transform 60ms; }
  .ghost.prestige {
    color: hsl(45 90% 45%);
    border-color: hsl(45 90% 45%);
    font-weight: 600;
  }

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
    padding: 0 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 400ms;
  }
  .tick-source { opacity: 0.7; font-style: italic; }

  /* Event banner — pulses between topbar and ticker. */
  /* Event band: always present, fixed height, no layout shift. */
  .event-band {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.5rem 1rem 0.4rem;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
    font-size: 0.85rem;
    flex-shrink: 0;
    min-height: 56px;
    transition: background 200ms;
  }
  .event-band.has-event {
    background: color-mix(in oklab, var(--ok) 12%, var(--paper-2));
  }
  .event-band.has-event.negative {
    background: color-mix(in oklab, var(--bad) 14%, var(--paper-2));
  }
  .event-row.idle {
    color: var(--muted);
    font-style: italic;
  }
  .event-row.idle .event-pulse {
    color: var(--muted);
    opacity: 0.5;
    animation: none;
  }
  .event-row {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 0.7rem;
    align-items: center;
  }
  .event-progress {
    height: 3px;
    background: color-mix(in oklab, var(--ink) 8%, transparent);
    border-radius: 2px;
    overflow: hidden;
  }
  .event-progress-fill {
    height: 100%;
    width: var(--fill, 0%);
    background: var(--ok);
    transition: width 200ms;
  }
  .event-band.has-event.negative .event-progress-fill { background: var(--bad); }
  .event-pulse {
    color: var(--ok);
    font-size: 0.7rem;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .event-band.has-event.negative .event-pulse { color: var(--bad); }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 1; }
  }
  .event-headline {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .event-effect {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 0.78rem;
    color: var(--ok);
    text-transform: lowercase;
  }
  .event-band.has-event.negative .event-effect { color: var(--bad); }
  .event-countdown {
    font-variant-numeric: tabular-nums;
    font-size: 0.75rem;
    color: var(--muted);
    min-width: 2.5rem;
    text-align: right;
  }

  /* ── MAIN GRID ─────────────────────────────────────────────────────── */
  /* Three columns. Layout never shifts. Each column has distinct tinting
     so it's visually clear they're separate functional areas:
     - LEFT (assets/projects/synergies): warm — the "spend" side
     - CENTER (DEPICT trees): cool — the "research" side
     - RIGHT (platforms): subdued — passive dashboard / gauges */
  .grid {
    display: grid;
    /* Trees | Assets (wide) | Platforms */
    grid-template-columns: minmax(320px, 420px) 1fr minmax(280px, 360px);
    gap: 1rem;
    padding: 1rem;
    align-items: start;
    align-content: start;
    min-height: 0;
    max-width: 1700px;
    margin: 0 auto;
    width: 100%;
  }
  .col {
    display: grid;
    gap: 0.8rem;
    align-content: start;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
  }
  /* Explicit column AND row placement so the browser doesn't create
     new rows when items appear in non-DOM order. All three columns live
     in row 1; their grid-column slot is fixed regardless of DOM order. */
  .col.trees-col {
    grid-row: 1;
    grid-column: 1;
    background: color-mix(in oklab, hsl(220 70% 50%) 4%, var(--paper-2));
    border: 1px solid color-mix(in oklab, hsl(220 70% 50%) 25%, var(--line));
  }
  .col.left {
    grid-row: 1;
    grid-column: 2;
    background: color-mix(in oklab, hsl(25 60% 50%) 4%, var(--paper-2));
    border: 1px solid color-mix(in oklab, hsl(25 60% 50%) 25%, var(--line));
  }
  .col.platforms-col {
    grid-row: 1;
    grid-column: 3;
    background: color-mix(in oklab, hsl(165 40% 45%) 4%, var(--paper-2));
    border: 1px solid color-mix(in oklab, hsl(165 40% 45%) 25%, var(--line));
  }
  .col:empty { display: none; }
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
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
    cursor: pointer;
    display: grid;
    gap: 0.25rem;
    overflow: hidden;
    transition: border-color 140ms, transform 80ms, box-shadow 160ms, background 140ms;
    box-shadow: 0 1px 2px color-mix(in oklab, var(--ink) 4%, transparent);
  }
  .card:hover:not(:disabled) {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--accent) 30%, transparent);
  }
  .card:active:not(:disabled) {
    transform: scale(0.985);
    transition: transform 60ms;
  }
  .card:disabled { opacity: 0.55; cursor: not-allowed; }

  /* Shortfall hint shown on disabled buy buttons (UX-4). */
  .shortfall {
    font-size: 0.7rem;
    color: var(--bad);
    font-style: italic;
    margin-top: 0.15rem;
    text-align: right;
  }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
  .name { font-weight: 600; font-size: 0.9rem; }
  .kind { font-weight: 400; color: var(--muted); font-size: 0.75rem; }
  .owned { color: var(--muted); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
  .blurb {
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card:hover .blurb, .node:hover .node-blurb {
    -webkit-line-clamp: 4;
  }
  .card-foot { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
  .cost { font-weight: 600; font-size: 0.82rem; }
  .buy-n {
    font-size: 0.78rem;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    background: color-mix(in oklab, var(--accent) 14%, transparent);
    border: 1px solid color-mix(in oklab, var(--accent) 35%, transparent);
    border-radius: 3px;
  }
  .card:disabled .buy-n { opacity: 0.5; }
  /* DEPICT nodes are graded research items, not inventory — the +N is
     just disambiguation when bulk-buying. Subtle, not a headline. */
  .node .buy-n {
    background: transparent;
    border: none;
    padding: 0;
    color: var(--muted);
    font-weight: 600;
    font-size: 0.7rem;
  }
  /* UX-6: precedent — was a colored stripe that read as a clickable link.
     Now a muted quote-style block: subtle italic muted text with a thin
     muted border. Hidden by default to keep cards compact; appears on
     hover for desktop, or on a tap-and-hold for touch via :focus-within
     fallback. Clearly informational, not interactive. */
  .precedent {
    display: none;
    font-size: 0.7rem;
    color: var(--muted);
    font-style: italic;
    border-left: 2px solid color-mix(in oklab, var(--ink) 15%, transparent);
    padding-left: 0.5rem;
    line-height: 1.4;
    opacity: 0.88;
  }
  .card:hover .precedent,
  .card:focus-within .precedent,
  .node:hover .precedent,
  .node:focus-within .precedent {
    display: block;
  }
  .precedent-counter {
    font-size: 0.6rem;
    color: var(--accent);
    opacity: 0.6;
    margin-left: 0.3em;
    font-variant-numeric: tabular-nums;
  }
  .effect {
    font-size: 0.72rem;
    color: var(--ok);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
  /* UX-9: per-asset milestone progress (AdVenture Capitalist style).
     Beefy 8px meter with gold gradient + glow at fill edge. Persistent
     reminder of the upcoming bonus. */
  .milestone {
    margin-top: 0.35rem;
    display: grid;
    gap: 0.3rem;
    padding: 0.4rem 0.5rem;
    background: color-mix(in oklab, hsl(45 90% 50%) 5%, transparent);
    border: 1px solid color-mix(in oklab, hsl(45 90% 50%) 22%, transparent);
    border-radius: 5px;
  }
  .milestone-text {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }
  .milestone-now {
    font-weight: 700;
    color: hsl(45 90% 45%);
  }
  .milestone-next {
    color: var(--muted);
  }
  .milestone-count {
    font-weight: 600;
    color: hsl(45 90% 45%);
  }
  .milestone-bar {
    height: 8px;
    background: color-mix(in oklab, var(--ink) 10%, transparent);
    border-radius: 5px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px color-mix(in oklab, var(--ink) 16%, transparent);
    position: relative;
  }
  .milestone-fill {
    height: 100%;
    width: var(--fill, 0%);
    background: linear-gradient(90deg, hsl(45 85% 48%), hsl(38 95% 55%));
    box-shadow: 0 0 10px color-mix(in oklab, hsl(45 90% 55%) 60%, transparent);
    transition: width 300ms ease-out;
    border-radius: 4px;
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
  .synergy {
    border: 1px solid var(--accent);
    background: color-mix(in oklab, var(--accent) 6%, var(--paper-2));
  }
  .synergy.teased {
    border: 1px dashed color-mix(in oklab, var(--accent) 50%, transparent);
    background: transparent;
  }
  .patron {
    border: 1.5px solid hsl(45 90% 45%);
    background: color-mix(in oklab, hsl(45 90% 45%) 8%, var(--paper-2));
  }
  .patron.teased {
    border: 1px dashed color-mix(in oklab, hsl(45 90% 45%) 50%, transparent);
    background: transparent;
  }
  .patron.active {
    background: color-mix(in oklab, hsl(45 90% 45%) 18%, var(--paper-2));
    cursor: default;
  }
  .patron .name { color: hsl(45 90% 35%); }

  /* Teased placeholders — show ??? + cost + hint so the player has an
     anticipation hook before the real card appears. */
  .card.teased, .node.teased {
    border-style: dashed;
    background: transparent;
    cursor: default;
    opacity: 0.65;
  }
  .card.teased .name, .node.teased .node-name {
    letter-spacing: 0.3em;
    color: var(--muted);
  }
  .card.teased:hover, .node.teased:hover { border-color: var(--line); }
  .card.teased .blurb, .node.teased .node-blurb {
    font-style: italic;
  }

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
  .meter-fill.heat   { background: linear-gradient(90deg, var(--ok), var(--warn) 60%, var(--bad)); }
  .meter-num.hot { color: var(--bad); font-weight: 700; }
  .plt-burned {
    margin-top: 0.4rem;
    padding: 0.4rem 0.5rem;
    background: color-mix(in oklab, var(--bad) 15%, transparent);
    border: 1px solid var(--bad);
    color: var(--bad);
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    text-align: center;
  }
  .plt-hot {
    margin-top: 0.4rem;
    padding: 0.35rem 0.5rem;
    background: color-mix(in oklab, var(--warn) 12%, transparent);
    border: 1px solid color-mix(in oklab, var(--warn) 60%, transparent);
    color: var(--warn);
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-align: center;
  }
  .plt-hot.overheated {
    background: color-mix(in oklab, var(--bad) 14%, transparent);
    border: 1px solid var(--bad);
    color: var(--bad);
  }
  .meter-fill.reach  { background: var(--tint, var(--accent)); }
  .meter-fill.charge { background: var(--accent); }

  .post-platform {
    appearance: none;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
    border-radius: 4px;
    cursor: not-allowed;
    margin-top: 0.3rem;
    transition: border-color 120ms, background 120ms, color 120ms;
  }
  .post-platform.ready {
    border-color: var(--ok);
    background: color-mix(in oklab, var(--ok) 18%, transparent);
    color: var(--ok);
    cursor: pointer;
  }
  .post-platform.ready:hover {
    background: color-mix(in oklab, var(--ok) 30%, transparent);
  }
  .post-platform.ready:active {
    transform: scale(0.96);
    transition: transform 60ms;
  }
  /* Freestyle post — always-available active engagement button. Visually
     distinct from the disciplined POST so the player knows they're paying
     extra heat for the privilege. */
  .post-platform.freestyle {
    margin-top: 0.3rem;
    border-color: hsl(20 75% 50%);
    background: color-mix(in oklab, hsl(20 75% 50%) 12%, transparent);
    color: hsl(20 80% 45%);
    font-weight: 700;
    cursor: pointer;
  }
  .post-platform.freestyle:hover {
    background: color-mix(in oklab, hsl(20 75% 50%) 22%, transparent);
  }
  .post-platform.freestyle:active {
    transform: scale(0.96);
    transition: transform 60ms;
  }
  /* UX-2: brief scale pulse on POST fire so the click feels confirmed. */
  .post-platform.firing {
    animation: post-pulse 200ms ease-out;
  }
  @keyframes post-pulse {
    0%   { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in oklab, var(--ok) 60%, transparent); }
    40%  { transform: scale(1.08); box-shadow: 0 0 0 6px color-mix(in oklab, var(--ok) 30%, transparent); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
  }
  @media (prefers-reduced-motion: reduce) {
    .post-platform.firing { animation: none; }
  }
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
    padding: 0.35rem 0.55rem;
    font: inherit;
    cursor: pointer;
    display: grid;
    gap: 0.12rem;
    overflow: hidden;
  }
  .node:hover:not(:disabled) {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--accent) 30%, transparent);
  }
  .node:active:not(:disabled) { transform: scale(0.985); transition: transform 60ms; }
  .node:disabled { opacity: 0.55; cursor: not-allowed; }
  .node-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.4rem;
  }
  .node-name { font-weight: 600; font-size: 0.82rem; }
  .node-lvl { font-size: 0.7rem; color: var(--muted); }
  .node-blurb {
    font-size: 0.68rem;
    color: var(--muted);
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
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
  /* Log: fixed-height strip pinned to the bottom. Newest entry at top of
     the strip, accented. Scroll for history. Never reflows other content. */
  .log {
    border-top: 1px solid var(--line);
    background: var(--paper-2);
    padding: 0.5rem 1rem 0.6rem;
    height: 120px;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 0.25rem;
    flex-shrink: 0;
  }
  .log h2 {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
    margin: 0;
    font-weight: 600;
  }
  .log-lines {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding-right: 0.5rem;
  }
  .log-lines::-webkit-scrollbar { width: 6px; }
  .log-lines::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--ink) 15%, transparent);
    border-radius: 3px;
  }
  .log-lines .line {
    font-size: 0.78rem;
    color: var(--muted);
    font-style: italic;
    line-height: 1.4;
    flex-shrink: 0;
  }
  .log-lines .line:first-child {
    color: var(--ink);
    font-style: normal;
    font-weight: 500;
  }

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

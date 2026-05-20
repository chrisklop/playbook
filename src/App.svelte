<script lang="ts">
  import { game } from './game/state.svelte';
  import { clearSave } from './game/save';
  import {
    buyAsset, buyUpgrade, completeProject,
    assetCost, upgradeCost,
    canBuyAsset, canBuyUpgrade, canCompleteProject,
  } from './game/core/actions';
  import { ASSETS, UPGRADES, PROJECTS, treeTotalLevel } from './game/core/catalog';
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
  import HexTree from './components/HexTree.svelte';

  type BulkMode = 1 | 10 | 100 | 'max';
  // bulkMode + tileBulkMode is the Assets-only state. DEPICT nodes have
  // their own independent state so the Assets top-bar bulk button can't
  // disable upgrade tiles by inflating their counts past what's affordable.
  let bulkMode = $state<BulkMode>(1);
  let tileBulkMode = $state<Record<string, BulkMode>>({});
  const UPGRADE_DEFAULT_BULK: BulkMode = 1;
  function assetTileMode(id: string): BulkMode {
    return tileBulkMode[id] ?? bulkMode;
  }
  function upgradeTileMode(_id: string): BulkMode {
    return UPGRADE_DEFAULT_BULK; // DEPICT trees: always ×1 (no UI yet)
  }
  function tileMode(id: string): BulkMode {
    // Generic — used by render code. Routes to the right state by id.
    return UPGRADES.some((u) => u.id === id)
      ? upgradeTileMode(id)
      : assetTileMode(id);
  }
  function setGlobalBulk(mode: BulkMode) {
    bulkMode = mode;
    tileBulkMode = {}; // select-all: clear all overrides
  }
  function setTileBulk(id: string, mode: BulkMode, ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    tileBulkMode = { ...tileBulkMode, [id]: mode };
  }

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
  // Observed rate per resource. Computed as a rolling-window average over
  // ROLL_MS so bursty income (POST overflow, event bursts) reads as a
  // stable per-second number instead of an EMA that decays toward zero
  // between bursts. Window > typical burst gap (POST every ~5s).
  const ROLL_MS = 6000;
  type Sample = { t: number; v: number };
  let observedRate = $state<Record<string, number>>({});
  // History per resource: most recent N samples, dropped when older than ROLL_MS.
  const history: Record<string, Sample[]> = {};
  onMount(() => {
    const handle = setInterval(() => {
      const now = Date.now();
      const cutoff = now - ROLL_MS;
      const nextObserved: Record<string, number> = {};
      for (const r of Object.keys(game.resources)) {
        const cur = (game.resources as Record<string, number>)[r] ?? 0;
        const buf = history[r] ?? (history[r] = []);
        buf.push({ t: now, v: cur });
        while (buf.length > 0 && buf[0].t < cutoff) buf.shift();
        if (buf.length >= 2) {
          const oldest = buf[0];
          const newest = buf[buf.length - 1];
          const dt = Math.max(0.001, (newest.t - oldest.t) / 1000);
          nextObserved[r] = (newest.v - oldest.v) / dt;
        } else {
          nextObserved[r] = 0;
        }
      }
      observedRate = nextObserved;
      nowTick = now;
    }, 250);
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

  // Stable order = catalog order. Buying an asset must NOT cause it to jump
  // position (user feedback: tiles moving feels broken). Newly revealed
  // items slot into their fixed catalog slot.
  const visibleAssets = $derived(
    ASSETS.filter((a) => isRevealed(a.id, a.visible)),
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

  // Filter out already-activated synergies even when the sticky reveal
  // flag is set. Otherwise the card stays in the grid forever, gray and
  // unclickable, because canActivateSynergy returns false post-activation.
  const visibleSynergies = $derived(
    SYNERGIES.filter((sn) =>
      !game.flags[sn.id] &&
      (isSynergyVisible(game, sn) || !!game.flags[`reveal:${sn.id}`])
    ),
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
    PATRONS.filter((p) =>
      !game.flags[p.id] &&
      (isPatronVisible(game, p) || !!game.flags[`reveal:${p.id}`])
    ),
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
  // Stable layout per user feedback: don't reorder anything. Trees render
  // in canonical DEPICT_IDS order; nodes within a tree render in catalog
  // order. A tree only stops rendering once it's been visible/teased — once
  // shown it stays shown so buying upgrades doesn't shift other trees.
  const TREE_META: Record<string, { label: string; letter: string; target: string }> = {
    discrediting:  { label: 'Discrediting',  letter: 'D', target: 'attention' },
    emotional:     { label: 'Emotional',     letter: 'E', target: 'attention' },
    polarization:  { label: 'Polarization',  letter: 'P', target: 'attention' },
    impersonation: { label: 'Impersonation', letter: 'I', target: 'credibility' },
    conspiracy:    { label: 'Conspiracy',    letter: 'C', target: 'engagement' },
    trolling:      { label: 'Trolling',      letter: 'T', target: 'attention' },
  };

  const treesView = $derived(
    DEPICT_IDS.map((tree) => {
      const all = UPGRADES.filter((u) => u.tree === tree);
      const visible = all.filter((u) => isRevealed(u.id, u.visible));   // catalog order
      const teased  = all.filter((u) => !isRevealed(u.id, u.visible) && isTeased(u.id, u.teased));
      const totalLevel = all.reduce((acc, u) => acc + (game.upgrades[u.id] ?? 0), 0);
      const totalMax = all.reduce((acc, u) => acc + u.maxLevel, 0);
      return { tree, all, visible, teased, totalLevel, totalMax };
    })
      .filter((t) => t.visible.length > 0 || t.teased.length > 0 || t.totalLevel > 0),
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
    pulseResource(game.resources.attention >= game.caps.attention ? 'engagement' : 'attention');
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

  // Rotating ticker — paused on click. (UX-10)
  let factIndex = $state(0);
  let tickerPaused = $state(false);
  onMount(() => {
    factIndex = Math.floor(Math.random() * FACTS.length);
    const handle = setInterval(() => {
      if (tickerPaused) return;
      factIndex = (factIndex + 1) % FACTS.length;
    }, 25_000);
    return () => clearInterval(handle);
  });
  const currentFact = $derived(FACTS[factIndex]);
  function tickerClick() {
    if (tickerPaused) {
      // already paused → advance to next on click
      factIndex = (factIndex + 1) % FACTS.length;
    } else {
      tickerPaused = true;
    }
  }
  function tickerDblClick() { tickerPaused = false; } // resume on double-click

  // UX-2: per-resource pulse on big events. Triggered from POST/freestyle
  // clicks and from event activations. .rvalue animates a scale-pop.
  // Background tick gains do NOT pulse (would be noisy).
  // Audio (UX-5): deliberately silent. Idle games run in background tabs
  // and surprise audio is intrusive. Revisit if/when a settings panel ships.
  let resourcePulseAt = $state<Record<string, number>>({});
  function pulseResource(id: string) {
    resourcePulseAt[id] = Date.now();
    resourcePulseAt = { ...resourcePulseAt };
  }
  function isPulsing(id: string): boolean {
    return (nowTick - (resourcePulseAt[id] ?? 0)) < 350;
  }
  // Pulse the event's target resource each time a new event starts.
  let lastEventId = $state<string | null>(null);
  $effect(() => {
    const ev = game.event;
    if (ev && ev.id !== lastEventId) {
      pulseResource(ev.resourceId);
      lastEventId = ev.id;
    } else if (!ev) {
      lastEventId = null;
    }
  });

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

  // Build a tooltip explaining how a platform works + which DEPICT
  // techniques it amplifies. Shown on hover of the platform card.
  // Human-readable tooltip explaining what raises each cap.
  // Critical for discoverability — players get stuck at 5K engagement
  // because the game doesn't say "buy Newsletter Stack to grow this".
  function capSourceTooltip(id: string, s: typeof game): string {
    if (id === 'attention') {
      const outlets = s.assets.outlet ?? 0;
      const formula = s.flags['editorialCalendar']
        ? `Editorial Calendar paradigm: 5000 + compounding from outlets (geometric +10% each)`
        : `Baseline 5000 + 600 per Pseudo-News Site (you own ${outlets})`;
      return `Attention cap. ${formula}. Complete the Editorial Calendar project to flip cap from linear to compounding outlet contribution.`;
    }
    if (id === 'engagement') {
      const newsletters = s.assets.newsletter ?? 0;
      if (!s.flags['editorialCalendar']) {
        return `Engagement cap. Currently 1000 (pre-paradigm). Complete the Editorial Calendar project (under Projects in Assets column) to unlock real engagement storage.`;
      }
      const cpc = s.flags['cpcNetwork'] ? ' ×3 from Crisis Pregnancy Center Network.' : '';
      return `Engagement cap. Editorial Calendar paradigm active: 5000 base + 1500 per Newsletter Stack (you own ${newsletters}).${cpc} Newsletter Stack unlocks at 2 outlets OR 1 Anonymous Blogger.`;
    }
    if (id === 'followers') {
      const pods = s.assets.audiencePod ?? 0;
      if (!s.flags['socialEraReached']) {
        return `Followers cap. Locked until Social era (Influencer Phase). Reach social era to unlock.`;
      }
      return `Followers cap. 5000 base + 6000 per Audience Pod (you own ${pods}).`;
    }
    return '';
  }

  function platformTooltip(meta: typeof PLATFORM_META[number]): string {
    const ampEntries = (Object.entries(meta.amp) as Array<[string, number]>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} ×${v.toFixed(1)}`)
      .join(', ');
    return [
      `${meta.name} — ${meta.audience}`,
      '',
      `Amplifies: ${ampEntries}`,
      `Moderation: ${Math.round(meta.moderation * 100)}% (higher = heat decays faster)`,
      '',
      'Charge bar fills over time. POST fires at 100% for full yield (low heat cost).',
      'PUSH IT freestyles anytime — yield scales with charge, heat cost scales with current heat.',
      'Rate slider throttles both charge fill AND bot-heat gain. Drop it when overheating.',
      'At 100% heat: 30s shadow-ban with 3× faster cool-down. Plan accordingly.',
    ].join('\n');
  }

  function depictLetter(t: string): string {
    return t[0].toUpperCase();
  }

  // Which resource does this tree primarily boost? Derived from the FIRST
  // tier-1 upgrade in the tree (the foundational one). Cosmetic — used to
  // label the tree header so the player knows what their investment funds.
  function treeTargetResource(treeId: string): string | null {
    const t1 = UPGRADES.find((u) => u.tree === treeId && u.tier === 1);
    if (!t1) return null;
    const keys = Object.keys(t1.multiplier);
    return keys[0] ?? null;
  }

  // How close is this tree to unlocking its tier-2? Threshold is total
  // tier-1 levels >= 10. Pulled from catalog's tier2Visible logic.
  const TIER2_THRESHOLD = 10;
  function tier2Progress(treeId: string): { unlocked: boolean; current: number; need: number } {
    let cur = 0;
    for (const u of UPGRADES) {
      if (u.tree === treeId && u.tier === 1) {
        cur += game.upgrades[u.id] ?? 0;
      }
    }
    return { unlocked: cur >= TIER2_THRESHOLD, current: cur, need: TIER2_THRESHOLD };
  }

  let showDepictHelp = $state(false);
  let showAssetsHelp = $state(false);
  let showPlatformsHelp = $state(false);

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
    const info = assetEffectInfo(a as { id: string; produces: Record<string, number> });
    return info?.text ?? '';
  }
  // Returns {text, resource} so the effect line can be COLORED by its
  // target resource (yellow for attention, blue for engagement, etc).
  // Handles both produces-based assets AND special cap-raising / utility
  // assets whose effect lives outside the produces map.
  function assetEffectInfo(a: { id: string; produces: Record<string, number> }):
    { text: string; resource: string } | null {
    const RES_ABBR: Record<string, string> = {
      attention: 'attention', engagement: 'engagement',
      followers: 'followers', credibility: 'credibility',
      narrativeDominance: 'narrative dominance',
      syntheticReality: 'synthetic reality',
    };
    const entries = Object.entries(a.produces);
    if (entries.length > 0) {
      const [res, rate] = entries[0];
      return { text: `+${rate} ${RES_ABBR[res] ?? res}/s each`, resource: res };
    }
    // Special-case assets that affect caps / multipliers rather than producing.
    switch (a.id) {
      case 'newsletter':   return { text: '+1500 engagement cap each',   resource: 'engagement' };
      case 'outlet':       return { text: '+attention cap per outlet',   resource: 'attention' };
      case 'audiencePod':  return { text: '+6000 followers cap each',    resource: 'followers' };
      case 'autoPoster':   return { text: '+10% post yield each',        resource: 'attention' };
      default: return null;
    }
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
    // Bar fill = count / next so it matches the "N/next" label intuitively
    // (a player at 70 with target 100 reads as 70%, not 40%).
    const progress = count / next;
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
    const mode = tileMode(id);
    if (mode === 'max') {
      return affordableCount(
        a.baseCost, a.costGrowth,
        game.assets[id] ?? 0,
        game.resources[a.costResource],
      );
    }
    return mode;
  }
  function upgradeBuyCount(id: string): number {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return 0;
    const current = game.upgrades[id] ?? 0;
    const headroom = u.maxLevel - current;
    const mode = tileMode(id);
    if (mode === 'max') {
      return Math.min(
        headroom,
        affordableCount(
          u.baseCost, u.costGrowth, current,
          game.resources[u.costResource],
          u.maxLevel,
        ),
      );
    }
    return Math.min(mode, headroom);
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
        {@const computedRate = rates[r]}
        {@const obsRate = observedRate[id] ?? 0}
        {@const rate = Math.max(computedRate, obsRate)}
        {@const eta = etaToCap(val, cap, rate)}
        {#if cap > 0 || val > 0}
          {@const bd = multBreakdown[r]}
          {@const spendable = spendableCount(id)}
          <div class="rmeter res-{id}" class:pulsing={isPulsing(id)} style="--fill: {cap > 0 ? Math.min(100, (val / cap) * 100) : 0}%">
            <div class="rlabel">
              <span class="res-dot res-{id}"></span>{label}
              {#if spendable > 0}<span class="spendable-badge" title="{spendable} thing{spendable === 1 ? '' : 's'} you can buy right now with {id}">{spendable}</span>{/if}
            </div>
            <div
              class="rvalue num"
              class:pulsing={isPulsing(id)}
              title={capSourceTooltip(id, game)}
            >{fmt(val)}<span class="cap"> / {fmt(cap)}</span></div>
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
        <div
          class="rmeter cure"
          class:reveal-active={game.reveal.active}
          style="--fill: {game.cure * 100}%"
          title={
            game.reveal.active
              ? 'CURE 80%+ · The counter-narrative wins. Mebro fact-checks are landing on your content; reach is dropping fast. Time to ★ Prestige and start a smarter run.'
              : 'Cure (counter-narrative pressure) — rises with total platform heat. Fact-checkers, watchdogs, investigative pieces, defamation suits, and platform policy changes all push it up. At 80% the Mebro reveal triggers: your network gets fact-checked into oblivion. Discrediting upgrades suppress cure growth (up to −80%). Use it as a clock: how much can you build before the truth catches up?'
          }
        >
          <div class="rlabel"><span class="res-dot cure-dot"></span>Cure</div>
          <div class="rvalue num">{(game.cure * 100).toFixed(2)}<span class="cap">%</span></div>
          <div class="rrate">{game.reveal.active ? 'REVEAL' : ''}</div>
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

  {#if game.reveal.active}
    <div class="reveal-banner" title="Mebro reveal triggered at 80% cure. Until the full third-act sequence ships in v0.2, you'll see fact-check annotations conceptually — push to peak and Prestige to bank legacy points and start a smarter run.">
      <span class="reveal-icon">⚠</span>
      <div class="reveal-text">
        <strong>THE PLAYBOOK IS UP</strong> — Mebro fact-checks are landing on your content. The counter-narrative wins; reach is collapsing.
        <span class="reveal-hint">★ Prestige (top-right) to bank legacy points and start a smarter run.</span>
      </div>
    </div>
  {/if}

  <!-- COMBINED STATUS ROW — ticker (left) + event (mid) + next moves (right) in one row -->
  <div class="status-row">
    {#if showTicker}
      <div
        class="status-ticker"
        class:paused={tickerPaused}
        onclick={tickerClick}
        ondblclick={tickerDblClick}
        role="button"
        tabindex="0"
        title={tickerPaused ? 'paused · click to step · double-click to resume rotation' : 'click to pause · auto-rotates every 25s'}
      >
        <span class="status-ticker-text">
          {currentFact.text} <em class="tick-source">— {currentFact.source}</em>
        </span>
        {#if tickerPaused}<span class="tick-paused">⏸</span>{/if}
      </div>
    {:else}
      <div class="status-ticker"></div>
    {/if}

    <div class="status-event" class:has-event={!!activeEvent} class:negative={activeEvent && activeEvent.mult < 1}>
      {#if activeEvent && activeEventDef}
        <span class="event-pulse">▶</span>
        <span class="status-event-headline">{activeEventDef.headline}</span>
        <span class="event-effect">
          {activeEvent.mult >= 1 ? '+' : ''}{Math.round((activeEvent.mult - 1) * 100)}%
          {activeEvent.resourceId}
        </span>
        <span class="event-countdown num">{eventSecsLeft}s</span>
        <div class="event-progress">
          <div class="event-progress-fill" style="--fill: {eventProgress * 100}%"></div>
        </div>
      {:else}
        <span class="event-pulse">○</span>
        <span class="status-event-headline idle">no active headline — next event in 1–2 min</span>
      {/if}
    </div>

    <!-- NEXT MOVES — placeholder, populated in Phase 3 -->
    <div class="status-next" aria-label="next moves">
      <span class="status-next-label">⚡ NEXT</span>
      <span class="status-next-empty">no available moves — keep earning attention</span>
    </div>
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
                onclick={() => setGlobalBulk(mode as BulkMode)}
                title="Set default for all asset tiles (overrides cleared)"
              >×{mode}</button>
            {/each}
          </div>
        {/if}
        <button class="ghost depict-help-btn" onclick={() => (showAssetsHelp = true)} title="What are assets?">?</button>
      </div>
      <div class="cards">
        {#each visibleAssets as a (a.id)}
          {@const rawN = assetBuyCount(a.id)}
          {@const tmode = tileMode(a.id)}
          {@const n = tmode === 'max' ? rawN : Math.max(1, rawN)}
          {@const cost = assetCost(game, a.id, Math.max(1, n))}
          {@const affordable = n > 0 && canBuyAsset(game, a.id, n)}
          {@const ratio = affordabilityRatio(cost, a.costResource)}
          {@const pre = getPrecedent(a.id, a.precedents)}
          {@const sf = !affordable && n > 0 ? shortfall(cost, a.costResource) : null}
          {@const owned = game.assets[a.id] ?? 0}
          {@const m = owned > 0 && Object.keys(a.produces).length > 0 ? milestoneInfo(owned) : null}
          <button class="card asset cost-{a.costResource}" class:fresh={owned === 0} aria-disabled={!affordable} onclick={() => { if (!affordable) return; doBuyAsset(a.id); }} title={a.blurb + (pre ? '\n\n' + pre : '')} style="--afford: {ratio * 100}%">
            {#if owned === 0}<span class="fresh-badge">NEW</span>{/if}
            <div class="card-head">
              <span class="name">{a.name} <span class="kind">[{a.kind}]</span></span>
              <span class="owned">×{owned}</span>
            </div>
            <div class="blurb">{a.blurb}</div>
            {@const aEffect = assetEffectInfo(a)}
            {#if aEffect}<div class="effect res-{aEffect.resource}">{aEffect.text}</div>{/if}
            {#if m}
              <div class="milestone" title="At {m.next} owned: production multiplier rises from ×{m.cur.toFixed(2)} to ×{m.nextMult.toFixed(2)}. {m.next - owned} more to unlock.">
                <div class="milestone-text">
                  <span class="milestone-now">★×{m.cur.toFixed(2)}</span>
                  <span class="milestone-next">→ ×{m.nextMult.toFixed(2)} at {m.next}</span>
                  <span class="milestone-count num">{owned}/{m.next}</span>
                </div>
                <div class="milestone-bar">
                  <div class="milestone-fill" style="--fill: {m.progress * 100}%"></div>
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
            <div class="tile-bulk" role="group" aria-label="bulk-buy for {a.name}">
              {#each [1, 10, 100, 'max'] as bm (bm)}
                <span
                  class="tile-bulk-btn"
                  class:active={tmode === bm}
                  onclick={(e) => setTileBulk(a.id, bm as BulkMode, e)}
                  role="button"
                  tabindex="0"
                  title="Buy ×{bm} from this tile"
                >×{bm}</span>
              {/each}
            </div>
            <div class="card-foot">
              <span class="buy-n">+{n}</span>
              <span class="cost num res-{a.costResource}">{fmt(cost)} {a.costResource}</span>
            </div>
            {#if sf}<div class="shortfall">{sf}</div>{/if}
            <div class="afford-fill" style="--fill: {ratio * 100}%"></div>
          </button>
        {/each}
        {#each teasedAssets as a (a.id)}
          <div class="card teased cost-{a.costResource}" title={a.teaseHint ?? ''}>
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
            <button class="card project cost-{res}" aria-disabled={!affordable} onclick={() => { if (!affordable) return; completeProject(game, p.id); }} title={p.blurb + (ppre ? '\n\n' + ppre : '')} style="--afford: {ratio * 100}%">
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
            <div class="card project teased cost-{res}" title={p.teaseHint ?? ''}>
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
            {@const lvlA = treeTotalLevel(game, sn.trees[0])}
            {@const lvlB = treeTotalLevel(game, sn.trees[1])}
            {@const treeMissing = lvlA < sn.threshold || lvlB < sn.threshold}
            {@const resMissing = (game.resources[res as keyof typeof game.resources] as number) < (amt as number)}
            {@const synRatio = (game.resources[res as keyof typeof game.resources] as number) / (amt as number)}
            <button
              class="card synergy cost-{res}"
              aria-disabled={!affordable}
              onclick={() => { if (!affordable) return; activateSynergy(game, sn.id); }}
              title={sn.blurb + (sn.precedent ? '\n\n' + sn.precedent : '')}
              style="--afford: {Math.min(100, synRatio * 100)}%"
            >
              <div class="card-head">
                <span class="name">{sn.name}</span>
                <span class="owned">{sn.trees[0][0].toUpperCase()}+{sn.trees[1][0].toUpperCase()}</span>
              </div>
              <div class="blurb">{sn.blurb}</div>
              {#if sn.precedent}<div class="precedent">{sn.precedent}</div>{/if}
              <div class="syn-prereq">
                <span class:met={lvlA >= sn.threshold}>{sn.trees[0]} {lvlA}/{sn.threshold}</span>
                <span class:met={lvlB >= sn.threshold}>{sn.trees[1]} {lvlB}/{sn.threshold}</span>
              </div>
              <div class="card-foot">
                <span class="buy-n">combo</span>
                <span class="cost num res-{res}">{fmt(amt as number)} {res}</span>
              </div>
              {#if !affordable}
                <div class="shortfall">
                  {#if treeMissing}
                    need
                    {#if lvlA < sn.threshold}{sn.threshold - lvlA} more {sn.trees[0]}{/if}
                    {#if lvlA < sn.threshold && lvlB < sn.threshold} · {/if}
                    {#if lvlB < sn.threshold}{sn.threshold - lvlB} more {sn.trees[1]}{/if}
                  {:else if resMissing}
                    need {fmt((amt as number) - (game.resources[res as keyof typeof game.resources] as number))} more {res}
                  {/if}
                </div>
              {/if}
            </button>
          {/each}
          {#each teasedSynergies as sn (sn.id)}
            {@const [res, amt] = Object.entries(sn.cost)[0]}
            <div class="card synergy teased cost-{res}">
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
            {@const paRatio = (game.resources[res as keyof typeof game.resources] as number) / (amt as number)}
            <button
              class="card patron cost-{res}"
              aria-disabled={!affordable}
              onclick={() => { if (!affordable) return; activatePatron(game, pa.id); rotatePrecedent(pa.id, pa.precedents); }}
              title={pa.blurb + (ppre ? '\n\n' + ppre : '')}
              style="--afford: {Math.min(100, paRatio * 100)}%"
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

    <!-- RIGHT: Platforms — fixed-width column showing a single-column stack -->
    {#if showPlatformGrid}
    <section class="col platforms-col">
      <div class="section-head">
        <h2>Platforms</h2>
        <button class="ghost depict-help-btn" onclick={() => (showPlatformsHelp = true)} title="What are platforms?">?</button>
      </div>
      <div class="platform-grid">
        {#each PLATFORM_META as meta (meta.id)}
          {@const p = game.platforms[meta.id]}
          {@const unlocked = p.unlocked}
          {#if unlocked || isNextPhase(meta.unlocksAt)}
          <div class="platform-card" class:locked={!unlocked} class:hot={unlocked && p.heat >= 0.75} class:banned={unlocked && p.burned && p.burnedUntil > game.lastTick} style="--tint: {meta.tint}" title={platformTooltip(meta)}>
            <div class="plt-head">
              <span class="plt-name">{meta.name}</span>
              {#if !unlocked}
                <span class="plt-lock">unlocks · {meta.unlocksAt}</span>
              {/if}
            </div>
            <div class="plt-audience">{meta.audience}</div>
            {#if unlocked}
              {@const y = postYield(game, meta.id)}
              {@const fy = freestyleYield(game, meta.id)}
              {@const ready = p.chargeProgress >= 1}
              {@const attCapped = game.resources.attention >= game.caps.attention}
              {@const isBanned = p.burned && p.burnedUntil > game.lastTick}
              <div class="plt-row">
                <div class="plt-buttons">
                  <button
                    class="post-platform"
                    class:ready
                    class:charging={!ready && !isBanned}
                    class:firing={isFiring(meta.id)}
                    disabled={isBanned}
                    onclick={() => postWithPulse(meta.id)}
                    title="POST — fires at 100% charge for full yield. Low heat (+0.8%)."
                  >
                    <span class="post-fill" style="--fill: {p.chargeProgress * 100}%"></span>
                    <span class="post-label">
                      {#if attCapped}POST · +{fmt(y * 0.1)} eng
                      {:else}POST · +{fmt(y)} att
                      {/if}
                    </span>
                  </button>
                  <button
                    class="post-platform freestyle"
                    disabled={isBanned}
                    onclick={() => { freestylePost(game, meta.id); firingPlatforms[meta.id + ':f'] = Date.now(); setTimeout(() => { delete firingPlatforms[meta.id + ':f']; firingPlatforms = { ...firingPlatforms }; }, 200); pulseResource(attCapped ? 'engagement' : 'attention'); }}
                    class:firing={isFiring(meta.id + ':f')}
                    title="PUSH IT — freestyle anytime. {Math.round(fy)} att now. Heat cost +{Math.round(4 * (1 + p.heat))}% per click."
                  >
                    {#if attCapped}PUSH IT · +{fmt(fy * 0.1)} eng
                    {:else}PUSH IT · +{fmt(fy)} att
                    {/if}
                  </button>
                </div>
                <!-- Vertical LED column: 8 segments from bottom up.
                     Top 3 (critical) flash when lit. Fixed width so it
                     never shifts the buttons. -->
                <div class="plt-leds" aria-label="heat {(p.heat * 100).toFixed(0)}%">
                  {#each Array(8) as _, i (i)}
                    <!-- i=0 at top, i=7 at bottom (natural flow).
                         i=7 is the always-on green baseline.
                         i=0..6 are the 7 heat-indicator segments (lit
                         from bottom up). Color tiers map to position:
                           i=4..6 = yellow (low heat)
                           i=2..3 = orange (mid)
                           i=0..1 = red (high; flashes when lit) -->
                    {@const litCount = Math.ceil(p.heat * 7)}
                    {@const isBaseline = i === 7}
                    {@const lit = isBaseline || i >= 7 - litCount}
                    {@const tier = i < 2 ? 'red' : i < 4 ? 'orange' : i < 7 ? 'yellow' : 'green'}
                    {@const crit = lit && tier === 'red'}
                    <span class="plt-led tier-{tier}" class:on={lit} class:baseline={isBaseline} class:critical={crit}></span>
                  {/each}
                </div>
              </div>
              <div class="rate-row" title="Auto-poster rate: throttles post frequency AND bot-heat. Lower when overheating; raise for max output.">
                <span class="rate-label">rate</span>
                <input
                  class="rate-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  bind:value={p.postRate}
                  aria-label="auto-poster rate for {meta.name}"
                />
                <span class="rate-num num">{Math.round((p.postRate ?? 1) * 100)}%</span>
              </div>
              <!-- Reserved-height status slot: always rendered, fixed
                   height + ellipsis, so heat-threshold transitions never
                   shift the buttons above it. -->
              <div class="plt-status"
                class:burned={isBanned}
                class:overheated={!isBanned && p.heat >= 0.75}
                class:hot={!isBanned && p.heat >= 0.5 && p.heat < 0.75}
              >
                {#if isBanned}
                  ⊘ BANNED · {Math.max(0, Math.ceil((p.burnedUntil - game.lastTick) / 1000))}s
                {:else if p.heat >= 0.85}
                  ⚠ OVERHEATED · {Math.round((1 - p.heat * 0.6) * 100)}% yield
                {:else if p.heat >= 0.75}
                  ⚠ DANGER · {Math.round(p.heat * 100)}% heat
                {:else if p.heat >= 0.5}
                  HOT · {Math.round((1 - p.heat * 0.6) * 100)}% yield
                {:else}
                  &nbsp;
                {/if}
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

    <!-- BOTTOM ROW: DEPICT trees — full width -->
    {#if showTrees}
    <section class="col trees-col">
      <div class="section-head">
        <h2>DEPICT trees</h2>
        <button class="ghost depict-help-btn" onclick={() => (showDepictHelp = true)} title="What is DEPICT?">?</button>
      </div>
      <div class="trees">
        {#each Object.keys(TREE_META) as treeId (treeId)}
          {@const meta = TREE_META[treeId]}
          <HexTree
            tree={treeId as 'discrediting' | 'emotional' | 'polarization' | 'impersonation' | 'conspiracy' | 'trolling'}
            label={meta.label}
            letter={meta.letter}
            target={meta.target}
          />
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

  <!-- DEPICT help modal -->
  {#if showDepictHelp}
    <div class="modal-backdrop" onclick={() => (showDepictHelp = false)} role="presentation">
      <div class="depict-modal" role="dialog" onclick={(e) => e.stopPropagation()}>
        <div class="depict-modal-head">
          <h3>DEPICT — The Disinformation Playbook</h3>
          <button class="ghost" onclick={() => (showDepictHelp = false)}>close</button>
        </div>
        <p class="depict-modal-intro">
          Six techniques from the Cambridge SDML inoculation research (Roozenbeek &amp; van der Linden,
          2019). Each tree lets you scale that technique. <strong>Where you invest determines which resource you boost.</strong>
        </p>
        <div class="depict-techniques">
          <div class="depict-tech-row">
            <span class="tree-tag tree-discrediting-letter">D</span>
            <div>
              <strong>Discrediting</strong> · attacks on the messenger
              <span class="depict-tech-target res-attention">→ attention + cure suppression</span>
            </div>
          </div>
          <div class="depict-tech-row">
            <span class="tree-tag tree-emotional-letter">E</span>
            <div>
              <strong>Emotional</strong> · outrage, fear, alarm
              <span class="depict-tech-target res-attention">→ attention</span>
            </div>
          </div>
          <div class="depict-tech-row">
            <span class="tree-tag tree-polarization-letter">P</span>
            <div>
              <strong>Polarization</strong> · us-vs-them framing
              <span class="depict-tech-target res-attention">→ attention</span>
            </div>
          </div>
          <div class="depict-tech-row">
            <span class="tree-tag tree-impersonation-letter">I</span>
            <div>
              <strong>Impersonation</strong> · fake authority / stolen identity
              <span class="depict-tech-target res-credibility">→ credibility</span>
            </div>
          </div>
          <div class="depict-tech-row">
            <span class="tree-tag tree-conspiracy-letter">C</span>
            <div>
              <strong>Conspiracy</strong> · "do your own research" framing
              <span class="depict-tech-target res-engagement">→ engagement</span>
            </div>
          </div>
          <div class="depict-tech-row">
            <span class="tree-tag tree-trolling-letter">T</span>
            <div>
              <strong>Trolling</strong> · volume + bait + brigading
              <span class="depict-tech-target res-attention">→ attention</span>
            </div>
          </div>
        </div>
        <div class="depict-help-section">
          <strong>How the levels work</strong>
          <ul>
            <li><strong>Tier 1:</strong> up to 30 levels per node, costs attention. Each level adds a small percent multiplier to that tree's target resource.</li>
            <li><strong>Tier 2:</strong> unlocks when a tree's tier-1 nodes total ≥ 10 levels. Tier-2 costs engagement.</li>
            <li>The "X/60" on each tree header is total levels purchased across all nodes in that tree.</li>
          </ul>
        </div>
        <div class="depict-help-section">
          <strong>Synergies (combo upgrades)</strong>
          <p>When TWO trees both pass a threshold, a named real-world technique unlocks as a one-shot project — Wedge Content (E+P), Fake Whistleblower (I+C), Flood the Zone (D+T), and others. Find them in the Synergies section.</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Assets help modal -->
  {#if showAssetsHelp}
    <div class="modal-backdrop" onclick={() => (showAssetsHelp = false)} role="presentation">
      <div class="depict-modal" role="dialog" onclick={(e) => e.stopPropagation()}>
        <div class="depict-modal-head">
          <h3>Assets — Your Operational Inventory</h3>
          <button class="ghost" onclick={() => (showAssetsHelp = false)}>close</button>
        </div>
        <p class="depict-modal-intro">
          Assets are <strong>passive producers</strong>. Each one quietly generates resources every second. Buy more to scale up; the cost rises geometrically with each one you own.
        </p>
        <div class="depict-help-section">
          <strong>Asset kinds</strong>
          <ul>
            <li><strong>Bot</strong> — sock puppets, anonymous accounts. Produce attention. Add heat to platforms while online.</li>
            <li><strong>Outlet</strong> — pseudo-news sites and blogs. Produce attention <em>and</em> raise the engagement cap, opening room for bigger synergies.</li>
            <li><strong>Tool</strong> — autoposters, doppelganger clones. Multipliers and quality-of-life (e.g. auto-poster fires platforms for you).</li>
            <li><strong>Project</strong> — one-shot purchases under the Assets list. Permanent paradigm shifts that unlock new resources or change the rules.</li>
          </ul>
        </div>
        <div class="depict-help-section">
          <strong>Milestone multipliers</strong>
          <p>Every doubling of an asset count past 25 grants a permanent +100% production bonus for that asset (Cookie Clicker "milk" pattern). The ★ on each card shows your current multiplier and the next threshold.</p>
        </div>
        <div class="depict-help-section">
          <strong>Reading the tint</strong>
          <p>Yellow-tinted cards drain <span class="res-attention">attention</span>. Blue-tinted cards drain <span class="res-engagement">engagement</span>. Match cost to your stockpile.</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Platforms help modal -->
  {#if showPlatformsHelp}
    <div class="modal-backdrop" onclick={() => (showPlatformsHelp = false)} role="presentation">
      <div class="depict-modal" role="dialog" onclick={(e) => e.stopPropagation()}>
        <div class="depict-modal-head">
          <h3>Platforms — Where The Posts Land</h3>
          <button class="ghost" onclick={() => (showPlatformsHelp = false)}>close</button>
        </div>
        <p class="depict-modal-intro">
          Platforms are how you <strong>convert bots into attention</strong>. Without posting, your bots passively produce a trickle. Posting <strong>multiplies that trickle into bursts</strong> — typically 4-8× faster total attention income while you're active.
        </p>
        <div class="depict-help-section">
          <strong>What POST actually does</strong>
          <p>Each POST fires an instant burst:</p>
          <p style="font-family: ui-monospace, monospace; font-size: 0.8rem; padding: 0.5rem; background: color-mix(in oklab, var(--ink) 5%, transparent); border-radius: 4px;">
            yield = <strong>bots</strong> × <strong>platform_amp</strong> × 5 × auto_bonus × heat_penalty
          </p>
          <ul>
            <li><strong>bots</strong> — count of all bot-kind assets you own (sock puppets, doppelganger clusters, spamouflage nodes).</li>
            <li><strong>platform_amp</strong> — that platform's multiplier for your dominant DEPICT technique (X amps Trolling ×1.7, YouTube amps Conspiracy ×1.7, etc).</li>
            <li><strong>auto_bonus</strong> — +10% per Auto-Poster owned.</li>
            <li><strong>heat_penalty</strong> — drops yield as heat climbs (0% heat = 100% yield; 100% heat = 40% yield).</li>
          </ul>
          <p>The burst fills <strong>attention</strong>. If attention is capped, 10% of the overflow rolls into engagement so the post is never wasted.</p>
        </div>
        <div class="depict-help-section">
          <strong>The three meters</strong>
          <ul>
            <li><strong>Heat</strong> — your platform-risk level. Rises with bot count + each post; falls naturally. <em>Higher heat = lower post yield AND a forced ban at 100%.</em></li>
            <li><strong>Charge</strong> — fills over time (5s base, reduced by DEPICT levels). POST fires at 100% for full yield.</li>
            <li><strong>Rate</strong> — your throttle. Slide it down to slow posting AND slow heat gain from bots. The dial that keeps you out of the ban zone.</li>
          </ul>
        </div>
        <div class="depict-help-section">
          <strong>Heat thresholds</strong>
          <ul>
            <li><strong>50%+</strong> — HOT. Posts produce less.</li>
            <li><strong>75%+</strong> — DANGER. Card glows red. Throttle now or pay the price.</li>
            <li><strong>100%</strong> — SHADOW-BAN. Platform locked for 30 seconds, heat cools 3× faster.</li>
          </ul>
        </div>
        <div class="depict-help-section">
          <strong>POST vs PUSH IT</strong>
          <p><strong>POST</strong> is the disciplined fire — only at 100% charge, low heat cost (+0.8%). <strong>PUSH IT</strong> (freestyle) fires any time, yielding proportional to charge, but the heat cost scales with current heat (4% cold, 8% hot). Spam when you can afford to. Don't when you can't.</p>
        </div>
        <div class="depict-help-section">
          <strong>Per-platform character</strong>
          <p>Each platform amplifies different DEPICT techniques. X loves Trolling and Emotional; YouTube loves Conspiracy; Substack rewards Discrediting. The dominant tree in your DEPICT mix determines which amplifier applies on each post.</p>
        </div>
      </div>
    </div>
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
  .topbar, .status-row, .log { flex-shrink: 0; }
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
  /* CONCEPT A applied to topbar meters: the meter body fills from the
     left with its resource color at width=--fill (current/cap ratio).
     The old thin 2px bar at the bottom is gone. */
  .rmeter {
    --tint: var(--accent);
    position: relative;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--paper);
    overflow: hidden;
    display: grid;
    grid-template-rows: auto auto auto;
    border-left: 2px solid color-mix(in oklab, var(--tint) 55%, var(--line));
  }
  .rmeter::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--tint) 22%, transparent),
      color-mix(in oklab, var(--tint) 6%, transparent));
    width: var(--fill, 0%);
    transition: width 240ms ease-out;
    pointer-events: none;
    z-index: 0;
  }
  .rmeter > * { position: relative; z-index: 1; }
  /* Legacy .rfill thin strip — superseded by the body fill above. */
  .rmeter .rfill, .rmeter .cure-fill { display: none; }
  .rmeter.cure.reveal-active {
    animation: cure-reveal-pulse 1.4s ease-in-out infinite;
  }
  .rmeter.cure.reveal-active .rrate {
    color: var(--bad);
    font-weight: 700;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
  }
  @keyframes cure-reveal-pulse {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--bad) 60%, transparent); }
    50%      { box-shadow: 0 0 0 4px color-mix(in oklab, var(--bad) 0%, transparent); }
  }

  /* Mebro reveal banner — only shown when state.reveal.active = true
     (fires automatically at cure >= 80%). Persistent, prominent, with
     a "what now" hint pointing the player at Prestige. */
  .reveal-banner {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin: 0 0.7rem 0.5rem;
    padding: 0.55rem 0.85rem;
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--bad) 20%, var(--paper-2)),
      color-mix(in oklab, var(--bad) 8%, var(--paper-2)));
    border: 1px solid var(--bad);
    border-radius: 6px;
    color: var(--bad);
    animation: cure-reveal-pulse 1.6s ease-in-out infinite;
  }
  .reveal-icon { font-size: 1.2rem; }
  .reveal-text {
    font-size: 0.78rem;
    line-height: 1.35;
    color: var(--ink);
  }
  .reveal-text strong { color: var(--bad); margin-right: 0.4rem; letter-spacing: 0.05em; }
  .reveal-hint {
    display: block;
    font-size: 0.7rem;
    color: var(--muted);
    margin-top: 0.15rem;
  }
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
  .rmeter.res-attention           { --tint: var(--res-attention); }
  .rmeter.res-engagement          { --tint: var(--res-engagement); }
  .rmeter.res-followers           { --tint: var(--res-followers); }
  .rmeter.res-credibility         { --tint: var(--res-credibility); }
  .rmeter.res-narrativeDominance  { --tint: var(--res-narrativeDominance); }
  .rmeter.res-syntheticReality    { --tint: var(--res-syntheticReality); }
  .rmeter.cure                    { --tint: var(--bad); }
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
    flex-wrap: wrap;
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

  /* Per-tile bulk override. Sits inside the asset card button.
     Uses <span role="button"> instead of <button> to avoid nesting in <button>. */
  .tile-bulk {
    display: inline-flex;
    border: 1px solid var(--line);
    border-radius: 3px;
    overflow: hidden;
    align-self: start;
    background: color-mix(in oklab, var(--paper-2) 70%, transparent);
  }
  .tile-bulk-btn {
    font-size: 0.65rem;
    padding: 0.12rem 0.35rem;
    border-right: 1px solid var(--line);
    color: var(--muted);
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    user-select: none;
  }
  .tile-bulk-btn:last-child { border-right: none; }
  .tile-bulk-btn:hover { color: var(--ink); background: color-mix(in oklab, var(--ink) 6%, transparent); }
  .tile-bulk-btn.active { background: var(--accent); color: white; }
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

  /* ── STATUS ROW (ticker + event in one 36px band) ──────────────────── */
  /* Combined status row: ticker | event | next moves. Three sections side
     by side at 44px tall — saves vertical space vs. stacking. Each section
     truncates text via ellipsis; the row height is fixed regardless of
     event active/idle or next-moves population. */
  .status-row {
    display: grid;
    grid-template-columns: 1fr 1.4fr 1.6fr;
    gap: 0.6rem;
    height: 44px;
    background: color-mix(in oklab, var(--ink) 3%, var(--paper-2));
    border-bottom: 1px solid var(--line);
    align-items: center;
    padding: 0 0.85rem;
    flex-shrink: 0;
  }
  .status-ticker {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    cursor: pointer;
    user-select: none;
    height: 100%;
  }
  .status-ticker:hover { background: color-mix(in oklab, var(--ink) 5%, transparent); }
  .status-ticker.paused { background: color-mix(in oklab, var(--accent) 6%, transparent); }
  .status-ticker-text {
    font-size: 0.78rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }
  .tick-source { opacity: 0.7; font-style: italic; }
  .tick-paused {
    font-size: 0.7rem;
    color: var(--accent);
    pointer-events: none;
    flex-shrink: 0;
  }
  .status-event {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    height: 100%;
    font-size: 0.78rem;
    padding-right: 0.4rem;
  }
  .status-event.has-event { color: var(--ok); }
  .status-event.has-event.negative { color: var(--bad); }
  .status-event-headline {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: inherit;
  }
  .status-event-headline.idle { color: var(--muted); font-style: italic; }
  .status-event .event-effect { font-weight: 600; flex-shrink: 0; }
  .status-event .event-countdown { color: var(--muted); flex-shrink: 0; }
  .status-event .event-pulse { flex-shrink: 0; }
  .status-event .event-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: hsl(0 0% 16%);
  }
  .status-event .event-progress-fill {
    height: 100%;
    width: var(--fill, 0%);
    background: var(--ok);
    transition: width 200ms;
  }
  .status-event.has-event.negative .event-progress-fill { background: var(--bad); }

  /* Right-hand section of the status row — Next Moves placeholder; will
     be replaced by the ranked-recommendation chips in Phase 3. */
  .status-next {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    height: 100%;
    padding-left: 0.6rem;
    border-left: 1px solid var(--line);
  }
  .status-next-label {
    font-size: 0.62rem;
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0.1em;
    flex-shrink: 0;
  }
  .status-next-empty {
    font-size: 0.72rem;
    color: var(--muted);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* UX-2: resource value pulse on big events (POST fire, event trigger). */
  .rvalue.pulsing { animation: rvalue-pop 350ms ease-out 1; }
  @keyframes rvalue-pop {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.18); filter: brightness(1.3); }
    100% { transform: scale(1); }
  }
  .rmeter.pulsing .res-dot {
    box-shadow: 0 0 0 3px color-mix(in oklab, currentColor 40%, transparent);
  }

  .event-pulse {
    color: var(--ok);
    font-size: 0.7rem;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .status-event.has-event.negative .event-pulse { color: var(--bad); }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 1; }
  }
  .event-effect {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 0.78rem;
    color: var(--ok);
    text-transform: lowercase;
  }
  .status-event.has-event.negative .event-effect { color: var(--bad); }
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
    /* New layout per docs/superpowers/specs/2026-05-19-dashboard-redesign-design.md
       - Top row: Next Moves strip (spans all 3 cols, fixed 60px)
       - Bottom row: DEPICT (fixed 400px) | Assets (fluid) | Platforms (fixed 380px)
       INVARIANT: side columns are HARD pixel tracks. No content can change their
       width. Toggles change inner content only. */
    /* Platforms column spans BOTH rows on the right (380px fixed).
       Assets on top-left, DEPICT below it. Trees do NOT extend under
       the platforms column. */
    grid-template-columns: minmax(0, 1fr) 380px;
    grid-template-rows: auto auto;
    grid-template-areas:
      "assets platforms"
      "depict platforms";
    gap: 0.6rem;
    padding: 0.7rem;
    align-items: start;
    align-content: start;
    min-height: 0;
    max-width: 1700px;
    margin: 0 auto;
    width: 100%;
  }
  .col {
    display: grid;
    gap: 0.5rem;
    align-content: start;
    padding: 0.45rem 0.55rem;
    border-radius: 8px;
  }
  /* Grid-area placement (depict left, assets center, platforms right bottom row). */
  .col.left {
    grid-area: assets;
    background: color-mix(in oklab, hsl(25 60% 50%) 4%, var(--paper-2));
    border: 1px solid color-mix(in oklab, hsl(25 60% 50%) 25%, var(--line));
  }
  .col.platforms-col {
    grid-area: platforms;
    background: color-mix(in oklab, hsl(165 40% 45%) 4%, var(--paper-2));
    border: 1px solid color-mix(in oklab, hsl(165 40% 45%) 25%, var(--line));
  }
  /* DASHBOARD INVARIANT: the platforms column NEVER changes width when
     you collapse/expand the drawer. Only the inner content swaps. Assets
     stays put; nothing reflows when you click anything. */
  .col.trees-col {
    grid-area: depict;
    background: color-mix(in oklab, hsl(220 70% 50%) 4%, var(--paper-2));
    border: 1px solid color-mix(in oklab, hsl(220 70% 50%) 25%, var(--line));
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
  /* Asset tiles use CSS multi-column for masonry packing — each tile
     is content-height; no row-stretching means no empty middle on
     short tiles next to tall ones with a milestone meter. Reading
     order flows column-by-column (top-to-bottom within col 1, then
     col 2, etc.), which matches catalog order well enough.
     break-inside: avoid keeps a tile from splitting between columns. */
  .cards {
    column-count: 3;
    column-gap: 0.4rem;
  }
  .cards > .card {
    break-inside: avoid;
    margin-bottom: 0.4rem;
    width: 100%;
    display: block;
  }
  @media (max-width: 1400px) {
    .cards { column-count: 2; }
  }
  @media (max-width: 700px) {
    .cards { column-count: 1; }
  }
  /* (CSS columns now handles tile layout — no align-content needed.) */

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
    /* Compact padding — assets live in a narrow 400px column; tile
       density beats interior whitespace. */
    padding: 0.3rem 0.45rem;
    cursor: pointer;
    display: grid;
    gap: 0.12rem;
    overflow: hidden;
    font-size: 0.78rem;
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
  .card:disabled,
  .card[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
  /* aria-disabled cards still receive hover events, so the browser title
     tooltip fires reliably even when the tile is unaffordable. Firefox
     suppresses mouse events on truly-disabled buttons; aria-disabled fixes
     that without giving up the visual treatment. */
  .card[aria-disabled="true"]:hover { background: var(--paper-2); }

  /* CONCEPT A — Background-as-state.
     Every purchasable card/node carries a CSS variable --tint (its cost
     resource color) and --afford (0-100%, how close the player is to
     affording it). The card body fills from the left with the tint at
     that width, so the eye reads progress at a glance — no separate
     bar needed. For DEPICT nodes, --level (X/maxLevel) drives a second
     fill layer so the player can see how built-up a node is.
     Hover deepens the tint; affordable cards glow softly. */
  .card.cost-attention   { --tint: var(--res-attention); }
  .card.cost-engagement  { --tint: var(--res-engagement); }
  .card.cost-followers   { --tint: var(--res-followers); }
  .card.cost-credibility { --tint: var(--res-credibility); }
  .card.cost-narrativeDominance { --tint: var(--res-narrativeDominance); }
  .card.cost-syntheticReality   { --tint: var(--res-syntheticReality); }

  .card[class*="cost-"] {
    background: var(--paper-2);
    border-left: 2px solid color-mix(in oklab, var(--tint) 55%, var(--line));
  }
  /* Affordability/level fill — left-anchored gradient that grows as
     --afford (or --level) rises. ::before sits below the card content. */
  .card[class*="cost-"]::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--tint) 22%, transparent),
      color-mix(in oklab, var(--tint) 8%, transparent));
    width: var(--afford, 0%);
    transition: width 280ms ease-out;
    pointer-events: none;
    z-index: 0;
  }
  .card[class*="cost-"] > * {
    position: relative;
    z-index: 1;
  }
  /* Affordable card gets a soft tint-colored glow */
  .card[class*="cost-"]:not([aria-disabled="true"]):not(:disabled) {
    box-shadow:
      0 0 0 1px color-mix(in oklab, var(--tint) 28%, transparent),
      0 0 14px color-mix(in oklab, var(--tint) 15%, transparent);
    border-color: color-mix(in oklab, var(--tint) 50%, var(--line));
  }
  .card[class*="cost-"]:hover:not([aria-disabled="true"]):not(:disabled)::before {
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--tint) 34%, transparent),
      color-mix(in oklab, var(--tint) 14%, transparent));
  }

  /* Shortfall hint shown on disabled buy buttons (UX-4). */
  .shortfall {
    font-size: 0.7rem;
    color: var(--bad);
    font-style: italic;
    margin-top: 0.15rem;
    text-align: right;
  }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.4rem; }
  .name { font-weight: 600; font-size: 0.82rem; }
  /* Kind tag is purely decorative and eats horizontal space. Hidden by
     default; the title attribute already carries this info. */
  .kind { display: none; }
  .owned { color: var(--muted); font-size: 0.72rem; font-variant-numeric: tabular-nums; }
  /* On dense ASSET tiles, blurb is decorative flavor — hidden, available
     in the tooltip. On SYNERGY / PATRON / PROJECT tiles, the blurb
     describes what the thing actually does, which is critical to the
     player's decision — keep it visible. */
  .card.asset .blurb { display: none !important; }
  .card.synergy .blurb,
  .card.patron .blurb,
  .card.project .blurb {
    font-size: 0.72rem;
    color: var(--ink);
    line-height: 1.3;
    font-style: italic;
    opacity: 0.88;
  }

  /* Synergy tree-prereq line — tells the player exactly which DEPICT
     trees still need levels, separate from the resource cost row. */
  .syn-prereq {
    display: flex;
    gap: 0.5rem;
    font-size: 0.62rem;
    color: var(--bad);
    text-transform: lowercase;
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
  }
  .syn-prereq .met { color: var(--ok); }
  .card-foot { display: flex; justify-content: space-between; align-items: baseline; gap: 0.4rem; }
  .cost { font-weight: 600; font-size: 0.72rem; }
  .buy-n {
    font-size: 0.65rem;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    padding: 0.05rem 0.3rem;
    background: color-mix(in oklab, var(--accent) 14%, transparent);
    border: 1px solid color-mix(in oklab, var(--accent) 35%, transparent);
    border-radius: 3px;
  }
  .card:disabled .buy-n { opacity: 0.5; }
  /* UX-6: precedent — was a colored stripe that read as a clickable link.
     Now a muted quote-style block: subtle italic muted text with a thin
     muted border. Hidden by default to keep cards compact; appears on
     hover for desktop, or on a tap-and-hold for touch via :focus-within
     fallback. Clearly informational, not interactive. */
  /* Precedent lives only in the browser tooltip (title= attr) now —
     never rendered inline so the tile size/shape never changes on hover. */
  .precedent,
  .precedent-counter { display: none !important; }
  .effect {
    font-size: 0.66rem;
    color: var(--ok);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
  /* When the effect line carries a res-* class, use that resource's
     color instead of the default green so the eye learns "blue =
     engagement", "yellow = attention", etc. */
  .effect.res-attention          { color: var(--res-attention); }
  .effect.res-engagement         { color: var(--res-engagement); }
  .effect.res-followers          { color: var(--res-followers); }
  .effect.res-credibility        { color: var(--res-credibility); }
  .effect.res-narrativeDominance { color: var(--res-narrativeDominance); }
  .effect.res-syntheticReality   { color: var(--res-syntheticReality); }
  /* UX-9: per-asset milestone progress (AdVenture Capitalist style).
     Beefy 8px meter with gold gradient + glow at fill edge. Persistent
     reminder of the upcoming bonus. */
  .milestone {
    margin-top: 0.2rem;
    display: grid;
    gap: 0.15rem;
    padding: 0.25rem 0.4rem;
    background: color-mix(in oklab, hsl(45 90% 50%) 5%, transparent);
    border: 1px solid color-mix(in oklab, hsl(45 90% 50%) 22%, transparent);
    border-radius: 4px;
  }
  .milestone-text {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.66rem;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
    gap: 0.3rem;
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
    height: 4px;
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
  /* Old thin afford-fill at bottom — superseded by the Concept-A
     full-card-body fill. Kept hidden in case any non-cost-tinted card
     still emits the element. */
  .afford-fill { display: none; }

  /* "NEW" badge for unbought assets / unleveled DEPICT nodes — anchors
     to the top-right corner of the tile. The tile itself gets a soft
     accent-color pulse so the eye catches new things at a glance. */
  .fresh-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    font-size: 0.5rem;
    background: var(--tint, var(--accent));
    color: white;
    padding: 0.05rem 0.32rem;
    border-radius: 999px;
    letter-spacing: 0.1em;
    font-weight: 800;
    line-height: 1.2;
    z-index: 2;
    pointer-events: none;
    box-shadow: 0 1px 3px hsl(0 0% 0% / 0.5);
    animation: fresh-pulse 1.8s ease-in-out infinite;
  }
  @keyframes fresh-pulse {
    0%, 100% { opacity: 0.9;  transform: scale(1); }
    50%      { opacity: 1;    transform: scale(1.08); }
  }
  /* Soft accent-color ring on fresh tiles so even un-affordable ones
     are visually distinct from already-owned tiles. */
  .card.fresh {
    border-color: color-mix(in oklab, var(--tint, var(--accent)) 55%, var(--line));
    animation: fresh-ring 2.4s ease-in-out infinite;
  }
  @keyframes fresh-ring {
    0%, 100% { box-shadow: 0 0 0 0   color-mix(in oklab, var(--tint, var(--accent)) 40%, transparent); }
    50%      { box-shadow: 0 0 0 4px color-mix(in oklab, var(--tint, var(--accent)) 0%, transparent); }
  }
  .project { border-style: dashed; }
  .synergy {
    /* Cost-tint fill handles the background now; synergies keep their
       accent border but lose the conflicting flat background. */
    border-color: var(--accent);
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
  .card.teased {
    border-style: dashed;
    background: transparent;
    cursor: default;
    opacity: 0.65;
  }
  .card.teased .name {
    letter-spacing: 0.3em;
    color: var(--muted);
  }
  .card.teased:hover { border-color: var(--line); }
  .card.teased .blurb {
    font-style: italic;
  }

  /* Platforms collapsed RAIL: thin vertical strip of status chips.
     Each chip shows platform name + heat % + charge-ready dot.
     Click any chip to expand the drawer back to the full grid. */
  /* ── PLATFORM GRID ─────────────────────────────────────────────────── */
  .platform-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .platform-card {
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 0.4rem 0.55rem;
    background: var(--paper-2);
    border-top: 2px solid var(--tint);
    display: grid;
    gap: 0.25rem;
    min-height: 0;
    font-size: 0.78rem;
    /* Hand cursor on body matches the other tiles (which are <button>s).
       The buttons inside override with their own cursor styles. */
    cursor: pointer;
  }
  .platform-card.locked { cursor: default; }
  .platform-card.banned { cursor: default; }
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
  .plt-name { font-weight: 700; font-size: 0.82rem; letter-spacing: -0.01em; }
  .plt-lock { font-size: 0.62rem; color: var(--muted); text-transform: lowercase; }
  .plt-audience { font-size: 0.62rem; color: var(--muted); font-style: italic; line-height: 1.2; }
  /* CONCEPT B platform layout:
     - .plt-row places buttons + vertical LED heat column side-by-side
     - charge fills the POST button itself (no separate charge bar)
     - heat is a vertical LED column; critical segments flash red */
  .plt-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.35rem;
    align-items: stretch;
  }
  .plt-buttons { display: grid; gap: 0.25rem; min-width: 0; }
  .plt-leds {
    display: flex;
    /* Natural top-to-bottom flow: i=0 sits at the top of the column,
       i=7 at the bottom. The lit-calculation in the template puts the
       bottom N segments on when litCount=N — thermometer-style fill. */
    flex-direction: column;
    gap: 2px;
    width: 9px;
    padding: 1px;
    background: hsl(0 0% 8%);
    border: 1px solid var(--line);
    border-radius: 3px;
  }
  .plt-led {
    flex: 1;
    min-height: 4px;
    background: hsl(0 0% 14%);
    border-radius: 1px;
    box-shadow: inset 0 0 1px hsl(0 0% 0%);
    transition: background 140ms;
  }
  /* Always-on green baseline at the bottom */
  .plt-led.baseline {
    background: hsl(140 60% 38%);
    box-shadow: 0 0 4px hsl(140 60% 50% / 0.6);
  }
  /* Tier colors when lit (low → high heat) */
  .plt-led.tier-yellow.on {
    background: hsl(50 85% 52%);
    box-shadow: 0 0 4px hsl(50 85% 55% / 0.7);
  }
  .plt-led.tier-orange.on {
    background: hsl(28 95% 52%);
    box-shadow: 0 0 5px hsl(28 95% 55% / 0.8);
  }
  .plt-led.tier-red.on {
    background: hsl(0 85% 52%);
    box-shadow: 0 0 6px hsl(0 85% 55% / 0.85);
  }
  .plt-led.critical {
    animation: heat-pulse 0.85s ease-in-out infinite;
  }
  @keyframes heat-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(0.45); }
  }

  /* DANGER tint: at 75%+ heat, whole platform card glows red. */
  .platform-card.hot {
    background: color-mix(in oklab, var(--bad) 10%, var(--paper-2));
    border-color: color-mix(in oklab, var(--bad) 40%, var(--line));
  }
  .platform-card.banned {
    background: color-mix(in oklab, var(--bad) 18%, var(--paper-2));
    border-color: var(--bad);
    opacity: 0.85;
  }

  /* Per-platform postRate slider — the heat-management dial. */
  .rate-row {
    display: grid;
    grid-template-columns: 2.4rem 1fr 2.6rem;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.62rem;
  }
  .rate-label {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.52rem;
  }
  .rate-num { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }
  .rate-slider {
    appearance: none;
    -webkit-appearance: none;
    height: 4px;
    background: var(--line);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    margin: 0;
  }
  .rate-slider::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: var(--tint, var(--accent));
    border-radius: 50%;
    cursor: grab;
    border: 1px solid var(--paper-2);
  }
  .rate-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--tint, var(--accent));
    border-radius: 50%;
    cursor: grab;
    border: 1px solid var(--paper-2);
  }
  /* Status slot — always rendered with a fixed height so heat-threshold
     transitions can't shift the POST/PUSH IT buttons below it. */
  .plt-status {
    margin-top: 0.2rem;
    padding: 0.25rem 0.4rem;
    border-radius: 3px;
    font-size: 0.62rem;
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
    /* FIXED height (not min-height) so longer warning text can't grow
       the slot and shove buttons down. Single line, ellipsis on overflow. */
    height: calc(0.62rem * 1.2 + 0.5rem + 2px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: transparent;
    border: 1px solid transparent;
    color: var(--muted);
    transition: background 120ms, border-color 120ms, color 120ms;
    box-sizing: border-box;
  }
  .plt-status.hot {
    background: color-mix(in oklab, var(--warn) 12%, transparent);
    border-color: color-mix(in oklab, var(--warn) 60%, transparent);
    color: var(--warn);
  }
  .plt-status.overheated {
    background: color-mix(in oklab, var(--bad) 14%, transparent);
    border-color: var(--bad);
    color: var(--bad);
  }
  .plt-status.burned {
    background: color-mix(in oklab, var(--bad) 15%, transparent);
    border-color: var(--bad);
    color: var(--bad);
  }
  /* (legacy .plt-hot / .plt-burned merged into .plt-status above) */
  .meter-fill.reach  { background: var(--tint, var(--accent)); }
  .meter-fill.charge { background: var(--accent); }

  .post-platform {
    appearance: none;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.42rem 0.5rem;
    border: 1px solid hsl(0 0% 30%);
    border-top-color: hsl(0 0% 40%);
    border-bottom-color: hsl(0 0% 8%);
    background: linear-gradient(180deg, hsl(0 0% 20%), hsl(0 0% 13%));
    color: hsl(0 0% 88%);
    border-radius: 4px;
    cursor: pointer;
    margin: 0;
    position: relative;
    overflow: hidden;
    text-align: center;
    box-shadow: 0 1px 0 hsl(0 0% 0% / 0.4);
    transition: filter 120ms;
  }
  .post-platform:disabled { opacity: 0.55; cursor: not-allowed; }
  /* Charge fills the POST button itself — no separate charge bar */
  .post-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--fill, 0%);
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--warn) 30%, transparent),
      color-mix(in oklab, var(--warn) 55%, transparent));
    transition: width 200ms ease-out;
  }
  .post-label { position: relative; z-index: 1; }
  .post-platform.ready .post-fill {
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--ok) 35%, transparent),
      color-mix(in oklab, var(--ok) 65%, transparent));
    box-shadow: 0 0 12px color-mix(in oklab, var(--ok) 50%, transparent);
  }
  .post-platform.ready {
    color: hsl(0 0% 98%);
    border-color: color-mix(in oklab, var(--ok) 50%, hsl(0 0% 30%));
  }
  .post-platform.ready:hover {
    filter: brightness(1.15);
  }
  .post-platform.ready:active {
    background: linear-gradient(180deg, hsl(0 0% 13%), hsl(0 0% 20%));
    box-shadow: inset 0 1px 4px hsl(0 0% 0% / 0.6);
  }
  /* PUSH IT — freestyle button. Always available, tactile orange. */
  .post-platform.freestyle {
    margin: 0;
    border-color: hsl(20 75% 50%);
    background: linear-gradient(180deg, hsl(20 60% 22%), hsl(15 70% 14%));
    color: hsl(30 90% 80%);
  }
  .post-platform.freestyle:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  .post-platform.freestyle:active:not(:disabled) {
    background: linear-gradient(180deg, hsl(15 70% 14%), hsl(20 60% 22%));
    box-shadow: inset 0 1px 4px hsl(0 0% 0% / 0.6);
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
  /* 2-column tree grid — six trees stacked single-file fell off the page,
     so they flow in two columns when the trees-column is wide enough.
     auto-fit + minmax(220px,...) gracefully collapses to one column on
     narrow screens. align-items: start so a short tree (few nodes) doesn't
     pad to match a tall neighbor. */
  /* DEPICT now sits in a full-width row below assets/platforms, so it can
     flow 4-6 trees per row instead of the old 1-2 vertical stack. */
  /* DEPICT trees now live in the FULL-WIDTH bottom row. Six trees fit
     comfortably in 6 cols × 1 row at desktop; collapses to 3 then 2.
     align-items: stretch ensures all tiles in the row are the same
     height, regardless of which ones have the affordable highlight. */
  .trees {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.45rem;
    align-items: stretch;
  }
  @media (max-width: 1700px) {
    .trees { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 1100px) {
    .trees { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .depict-help-btn {
    width: 1.8em;
    height: 1.8em;
    padding: 0;
    font-weight: 700;
    border-radius: 50%;
  }
  .depict-modal {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 1.4rem 1.5rem;
    max-width: 560px;
    width: calc(100vw - 2rem);
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 16px 48px color-mix(in oklab, var(--ink) 28%, transparent);
    display: grid;
    gap: 0.9rem;
  }
  .depict-modal-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .depict-modal-head h3 { margin: 0; font-size: 1.05rem; }
  .depict-modal-intro {
    margin: 0;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.45;
  }
  .depict-techniques { display: grid; gap: 0.5rem; }
  .depict-tech-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.6rem;
    align-items: start;
    font-size: 0.85rem;
    line-height: 1.4;
  }
  /* .tree-tag base styles — used by DEPICT help modal letter badges */
  .tree-tag {
    display: inline-block;
    width: 1.4em; height: 1.4em; line-height: 1.4em;
    text-align: center;
    font-weight: 700; font-size: 0.78rem;
    border-radius: 3px;
    color: white;
  }
  .depict-tech-row .tree-tag {
    width: 1.6em; height: 1.6em; line-height: 1.6em;
    font-size: 0.85rem;
  }
  .tree-tag.tree-discrediting-letter  { background: hsl(0 60% 45%); color: white; }
  .tree-tag.tree-emotional-letter     { background: hsl(20 75% 50%); color: white; }
  .tree-tag.tree-polarization-letter  { background: hsl(280 55% 50%); color: white; }
  .tree-tag.tree-impersonation-letter { background: hsl(160 50% 40%); color: white; }
  .tree-tag.tree-conspiracy-letter    { background: hsl(220 60% 45%); color: white; }
  .tree-tag.tree-trolling-letter      { background: hsl(60 70% 40%); color: hsl(220 18% 12%); }
  .depict-tech-target {
    display: inline-block;
    margin-left: 0.5em;
    font-weight: 600;
    font-size: 0.78rem;
  }
  .depict-help-section {
    padding: 0.7rem 0.8rem;
    background: var(--paper-2);
    border-radius: 5px;
    font-size: 0.82rem;
    line-height: 1.45;
  }
  .depict-help-section strong { display: block; margin-bottom: 0.3rem; }
  .depict-help-section ul { margin: 0.3rem 0 0 1.1rem; padding: 0; }
  .depict-help-section li { margin-bottom: 0.3rem; }
  .depict-help-section p { margin: 0; }
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
    .grid {
      grid-template-columns: 1fr;
      grid-template-areas:
        "assets"
        "platforms"
        "depict";
    }
  }
</style>

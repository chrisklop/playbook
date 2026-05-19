<script lang="ts">
  // PROTOTYPE — three tile redesigns applied to PLATFORM, ASSET, and DEPICT
  // tiles side-by-side at multiple states. Reachable at ?mockup=tiles.
  // Not wired to real game state; uses synthetic data so the comparison
  // is apples-to-apples.

  type PlatformState = {
    heat: number; charge: number; postRate: number;
    burned: boolean; bannedSecs?: number;
  };
  const P_STATES: { label: string; s: PlatformState }[] = [
    { label: 'cool (12% heat)',        s: { heat: 0.12, charge: 0.45, postRate: 1.0,  burned: false } },
    { label: 'hot (62% heat)',         s: { heat: 0.62, charge: 0.82, postRate: 0.7,  burned: false } },
    { label: 'overheated (87% heat)',  s: { heat: 0.87, charge: 0.97, postRate: 1.0,  burned: false } },
    { label: 'banned (18s left)',      s: { heat: 0.40, charge: 0,    postRate: 0.5,  burned: true, bannedSecs: 18 } },
  ];
  const platformMeta = {
    name: 'X', audience: 'news-junkie · polarized',
    topAmps: ['T+P', 'trolling, polarization'],
  };
  const postYield = 311;
  const freestyleYield = 247;

  // ── Asset prototypes ────────────────────────────────────────────────────
  type AssetState = {
    name: string; kind: string; count: number;
    produces: string;           // "+2 attention/s each"
    milestoneCur: number;       // current multiplier
    milestoneNext: number;      // next multiplier
    milestoneAt: number;        // count threshold
    cost: number;
    costResource: 'attention' | 'engagement';
    have: number;
    bulkN: number;
  };
  const ASSET_VARIANTS: { label: string; s: AssetState }[] = [
    { label: 'sock puppet · affordable',
      s: { name: 'Sock Puppet', kind: 'bot', count: 60, produces: '+2 att/s each',
           milestoneCur: 2.26, milestoneNext: 3.0, milestoneAt: 100,
           cost: 5060, costResource: 'attention', have: 12340, bulkN: 1 } },
    { label: 'newsletter · half-way affordable',
      s: { name: 'Newsletter Stack', kind: 'bot', count: 60, produces: 'raises eng cap +1500',
           milestoneCur: 2.26, milestoneNext: 3.0, milestoneAt: 100,
           cost: 152000, costResource: 'attention', have: 78000, bulkN: 1 } },
    { label: 'doppelganger · costs engagement',
      s: { name: 'Doppelganger Cluster', kind: 'bot', count: 12, produces: '+1.5 eng/s each',
           milestoneCur: 1.0, milestoneNext: 1.5, milestoneAt: 25,
           cost: 1800, costResource: 'engagement', have: 24000, bulkN: 1 } },
    { label: 'auto-poster · unaffordable',
      s: { name: 'Auto-Poster', kind: 'tool', count: 13, produces: '+10% post yield ea',
           milestoneCur: 1.0, milestoneNext: 1.0, milestoneAt: 0,
           cost: 8630, costResource: 'attention', have: 2100, bulkN: 1 } },
  ];

  // ── DEPICT node prototypes ───────────────────────────────────────────────
  type NodeState = {
    name: string; tree: string; level: number; maxLevel: number;
    perLevel: string; nowEffect: string;
    cost: number; costResource: 'attention' | 'engagement';
    have: number;
    bulkN: number;
  };
  const NODE_VARIANTS: { label: string; s: NodeState }[] = [
    { label: 'fresh · 1/30 · affordable',
      s: { name: 'Whataboutism Kit', tree: 'D', level: 1, maxLevel: 30,
           perLevel: '+0.8% att/lvl', nowEffect: 'now +0.8% att',
           cost: 134_400, costResource: 'attention', have: 1_500_000, bulkN: 1 } },
    { label: 'mid-tree · 11/30',
      s: { name: 'Upworthy Bait Engine', tree: 'E', level: 11, maxLevel: 30,
           perLevel: '+1.5% att/lvl', nowEffect: 'now +16.5% att',
           cost: 8_700, costResource: 'attention', have: 1_500_000, bulkN: 1 } },
    { label: 'tier-2 · 4/30 · engagement',
      s: { name: 'Houston Mosque Op', tree: 'P', level: 4, maxLevel: 30,
           perLevel: '+2.0% eng/lvl', nowEffect: 'now +8.0% eng',
           cost: 33_780, costResource: 'engagement', have: 95_000, bulkN: 1 } },
    { label: 'maxed · 30/30',
      s: { name: 'Q-Style Drop Schedule', tree: 'C', level: 30, maxLevel: 30,
           perLevel: '+1.5% eng/lvl', nowEffect: 'now +45.0% eng',
           cost: 0, costResource: 'engagement', have: 95_000, bulkN: 0 } },
  ];

  // Helpers
  function affordRatio(have: number, cost: number): number {
    if (cost <= 0) return 1;
    return Math.min(1, have / cost);
  }
  function fmt(n: number): string {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.round(n).toString();
  }
</script>

<div class="mockup-page">
  <header>
    <a href="./" class="back">← back to game</a>
    <h1>Tile redesign prototypes</h1>
    <p class="lede">
      Three concepts applied to <strong>platform</strong>, <strong>asset</strong>, and <strong>DEPICT node</strong> tiles.
      Real-estate-conscious — every tile is sized like it'll actually appear in the game.
      Concept B has been tightened per feedback (LED flash kept, empty space killed).
    </p>
  </header>

  <!-- ═════════════════════════════════════════════════════════════════════
       CONCEPT A — Heat / progress IS the background
       ═════════════════════════════════════════════════════════════════════ -->
  <section class="concept">
    <h2>Concept A · Background-as-state</h2>
    <p class="rationale">
      Every gauge that can be encoded as <em>background tint or fill</em> is.
      Platforms: card body gradients cool→red with heat; charge fills the POST button itself.
      Assets: card-body fill ratio = affordability progress; milestone shown as a small ★ chip.
      DEPICT nodes: card body fills left-to-right with level progress (X / maxLevel).
      Heaviest <strong>delete</strong> of meters and bars.
    </p>

    <h3>Platform tiles</h3>
    <div class="row row-4">
      {#each P_STATES as { label, s } (label)}
        <div class="tile-wrap">
          <div class="concept-a-platform" class:burned={s.burned}
            style="--heat: {s.heat};">
            <div class="ap-head">
              <span class="ap-name">{platformMeta.name}</span>
              <span class="ap-tag">{platformMeta.topAmps[0]}</span>
            </div>
            <div class="ap-audience">{platformMeta.audience}</div>
            <button class="ap-post" class:ready={s.charge >= 1 && !s.burned} disabled={s.burned}>
              <span class="ap-fill" style="--fill: {s.charge * 100}%"></span>
              <span class="ap-label">POST · +{postYield} att</span>
            </button>
            <button class="ap-push" disabled={s.burned}>PUSH IT · +{freestyleYield}</button>
            <div class="ap-rate" title="rate">
              <span class="ap-rate-thumb" style="--pos: {s.postRate * 100}%"></span>
            </div>
            {#if s.burned}
              <div class="ap-overlay">⊘ BANNED · {s.bannedSecs}s</div>
            {:else if s.heat >= 0.85}
              <div class="ap-status">⚠ OVERHEATED · {Math.round((1 - s.heat * 0.6) * 100)}% yield</div>
            {:else if s.heat >= 0.75}
              <div class="ap-status">⚠ DANGER · {Math.round(s.heat * 100)}%</div>
            {/if}
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>

    <h3>Asset tiles</h3>
    <div class="row row-4">
      {#each ASSET_VARIANTS as { label, s } (label)}
        {@const ratio = affordRatio(s.have, s.cost)}
        {@const affordable = s.have >= s.cost}
        <div class="tile-wrap">
          <div class="concept-a-asset cost-{s.costResource}"
            class:affordable
            style="--afford: {ratio * 100}%;">
            <div class="aa-head">
              <span class="aa-name">{s.name} <span class="aa-kind">[{s.kind}]</span></span>
              <span class="aa-count">×{s.count}</span>
            </div>
            <div class="aa-produces">{s.produces}</div>
            {#if s.milestoneAt > 0}
              <div class="aa-milestone">
                <span class="aa-mile-now">★×{s.milestoneCur.toFixed(2)}</span>
                <span class="aa-mile-next">→ ×{s.milestoneNext.toFixed(2)} at {s.milestoneAt}</span>
              </div>
            {/if}
            <div class="aa-foot">
              <span class="aa-bulk">+{s.bulkN}</span>
              <span class="aa-cost">{fmt(s.cost)} {s.costResource}</span>
            </div>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>

    <h3>DEPICT node tiles</h3>
    <div class="row row-4">
      {#each NODE_VARIANTS as { label, s } (label)}
        {@const ratio = affordRatio(s.have, s.cost)}
        {@const maxed = s.level >= s.maxLevel}
        {@const lvlPct = (s.level / s.maxLevel) * 100}
        <div class="tile-wrap">
          <div class="concept-a-node cost-{s.costResource}"
            class:maxed
            style="--level: {lvlPct}%; --afford: {ratio * 100}%;">
            <div class="an-head">
              <span class="an-tree">{s.tree}</span>
              <span class="an-name">{s.name}</span>
              <span class="an-level">{s.level}/{s.maxLevel}</span>
            </div>
            <div class="an-effect">{s.perLevel} · <em>{s.nowEffect}</em></div>
            <div class="an-foot">
              {#if maxed}
                <span class="an-maxed">maxed</span>
              {:else}
                <span class="an-bulk">+{s.bulkN}</span>
                <span class="an-cost">{fmt(s.cost)} {s.costResource}</span>
              {/if}
            </div>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- ═════════════════════════════════════════════════════════════════════
       CONCEPT B — Tactile / instrument (TIGHTENED)
       ═════════════════════════════════════════════════════════════════════ -->
  <section class="concept">
    <h2>Concept B · Tactile console (tightened)</h2>
    <p class="rationale">
      Per your feedback: kept the LED flash for overheat, killed the empty space.
      The charge dial and fader are gone — charge now fills the POST button,
      heat is a thin <strong>vertical LED column on the right edge</strong> (critical segments flash red), rate is a slim slider at the bottom.
      For asset and DEPICT tiles, level/milestone progress becomes a similar LED ladder.
    </p>

    <h3>Platform tiles (compact)</h3>
    <div class="row row-4">
      {#each P_STATES as { label, s } (label)}
        <div class="tile-wrap">
          <div class="concept-b-platform" class:burned={s.burned}>
            <div class="bp-head">
              <span class="bp-name">{platformMeta.name}</span>
              <span class="bp-amp">{platformMeta.topAmps[1]}</span>
            </div>
            <div class="bp-row">
              <div class="bp-buttons">
                <button class="bp-post" class:ready={s.charge >= 1 && !s.burned} disabled={s.burned}>
                  <span class="bp-post-fill" style="--fill: {s.charge * 100}%"></span>
                  <span class="bp-post-label">POST · +{postYield}</span>
                </button>
                <button class="bp-push" disabled={s.burned}>PUSH · +{freestyleYield}</button>
              </div>
              <!-- vertical LED column for heat -->
              <div class="bp-leds" aria-label="heat">
                {#each Array(8) as _, i (i)}
                  {@const lit = i >= 8 - Math.round(s.heat * 8)}
                  {@const crit = lit && i >= 5}
                  <span class="bp-led" class:on={lit} class:critical={crit}></span>
                {/each}
              </div>
            </div>
            <div class="bp-rate">
              <span class="bp-rate-label">rate</span>
              <div class="bp-rate-track">
                <div class="bp-rate-thumb" style="--pos: {s.postRate * 100}%"></div>
              </div>
              <span class="bp-rate-num">{Math.round(s.postRate * 100)}%</span>
            </div>
            <div class="bp-status">
              {#if s.burned}⊘ BANNED · {s.bannedSecs}s
              {:else if s.heat >= 0.85}⚠ OVERHEAT
              {:else if s.heat >= 0.75}⚠ DANGER
              {:else if s.heat >= 0.5}HOT
              {:else}&nbsp;
              {/if}
            </div>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>

    <h3>Asset tiles</h3>
    <div class="row row-4">
      {#each ASSET_VARIANTS as { label, s } (label)}
        {@const affordable = s.have >= s.cost}
        {@const milePct = s.milestoneAt > 0 ? (s.count / s.milestoneAt) * 100 : 0}
        <div class="tile-wrap">
          <div class="concept-b-asset cost-{s.costResource}" class:affordable>
            <div class="ba-head">
              <span class="ba-name">{s.name}</span>
              <span class="ba-count">×{s.count}</span>
            </div>
            <div class="ba-produces">{s.produces}</div>
            {#if s.milestoneAt > 0}
              <div class="ba-leds" title="milestone progress">
                {#each Array(10) as _, i (i)}
                  <span class="ba-led" class:on={(i + 1) * 10 <= milePct}></span>
                {/each}
                <span class="ba-mile-num">★×{s.milestoneCur.toFixed(2)} → ×{s.milestoneNext.toFixed(2)}</span>
              </div>
            {/if}
            <button class="ba-buy" disabled={!affordable}>
              <span class="ba-bulk">+{s.bulkN}</span>
              <span class="ba-cost">{fmt(s.cost)} {s.costResource}</span>
            </button>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>

    <h3>DEPICT node tiles</h3>
    <div class="row row-4">
      {#each NODE_VARIANTS as { label, s } (label)}
        {@const affordable = s.have >= s.cost}
        {@const maxed = s.level >= s.maxLevel}
        <div class="tile-wrap">
          <div class="concept-b-node cost-{s.costResource} tree-{s.tree.toLowerCase()}" class:affordable class:maxed>
            <div class="bn-head">
              <span class="bn-tree">{s.tree}</span>
              <span class="bn-name">{s.name}</span>
              <span class="bn-level">{s.level}/{s.maxLevel}</span>
            </div>
            <div class="bn-leds" title="level ladder">
              {#each Array(s.maxLevel) as _, i (i)}
                <span class="bn-led" class:on={i < s.level} class:maxed-led={maxed}></span>
              {/each}
            </div>
            <div class="bn-effect">{s.perLevel} · <em>{s.nowEffect}</em></div>
            <button class="bn-buy" disabled={!affordable || maxed}>
              {#if maxed}
                <span class="bn-maxed">maxed</span>
              {:else}
                <span class="bn-cost">+{s.bulkN} · {fmt(s.cost)} {s.costResource}</span>
              {/if}
            </button>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- ═════════════════════════════════════════════════════════════════════
       CONCEPT C — Living scroll / ambient motion
       ═════════════════════════════════════════════════════════════════════ -->
  <section class="concept">
    <h2>Concept C · Living scroll</h2>
    <p class="rationale">
      Ambient motion in the background reflects state. For platforms it's a post-feed
      scrolling vertically — fast and red when hot, frozen when banned. For assets
      it's a slow, low-opacity thematic feed (sock-puppet comments, newsletter headers,
      etc.). For DEPICT nodes the level ladder pulses gently when affordable.
      Most cinematic — also the most moving parts on screen at once.
    </p>

    <h3>Platform tiles</h3>
    <div class="row row-4">
      {#each P_STATES as { label, s } (label)}
        <div class="tile-wrap">
          <div class="concept-c-platform" class:burned={s.burned}
            style="--heat: {s.heat}; --scroll-speed: {Math.max(1.2, 12 - s.heat * 10)}s;">
            <div class="cp-feed" aria-hidden="true">
              <div class="cp-feed-strip">
                <p>"BREAKING: sources say..."</p>
                <p>"WAIT — you won't believe what..."</p>
                <p>"just asking questions..."</p>
                <p>"the REAL story they don't want..."</p>
                <p>"thread 🧵 (1/47)"</p>
                <p>"PEOPLE ARE SAYING this is..."</p>
                <p>"do your own research, friends"</p>
              </div>
            </div>
            <div class="cp-content">
              <div class="cp-head">
                <span class="cp-name">{platformMeta.name}</span>
                <span class="cp-audience">{platformMeta.audience}</span>
              </div>
              <button class="cp-post" disabled={s.burned || s.charge < 1}>
                <span class="cp-fill" style="--fill: {s.charge * 100}%"></span>
                <span class="cp-text">POST · +{postYield} att</span>
              </button>
              <button class="cp-push" disabled={s.burned}>PUSH IT · +{freestyleYield}</button>
              <div class="cp-rate">
                <span class="cp-rate-label">rate</span>
                <div class="cp-rate-track"><div class="cp-rate-knob" style="--pos: {s.postRate * 100}%"></div></div>
                <span class="cp-rate-num">{Math.round(s.postRate * 100)}%</span>
              </div>
              {#if s.burned}<div class="cp-overlay">⊘ SUSPENDED · {s.bannedSecs}s</div>{/if}
            </div>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>

    <h3>Asset tiles</h3>
    <div class="row row-4">
      {#each ASSET_VARIANTS as { label, s } (label)}
        {@const affordable = s.have >= s.cost}
        <div class="tile-wrap">
          <div class="concept-c-asset cost-{s.costResource}" class:affordable>
            <div class="ca-feed" aria-hidden="true">
              <div class="ca-feed-strip">
                <p>"first of all,"</p>
                <p>"actually,"</p>
                <p>"BREAKING:"</p>
                <p>"sources say"</p>
                <p>"do your own research"</p>
              </div>
            </div>
            <div class="ca-content">
              <div class="ca-head">
                <span class="ca-name">{s.name}</span>
                <span class="ca-count">×{s.count}</span>
              </div>
              <div class="ca-produces">{s.produces}</div>
              {#if s.milestoneAt > 0}
                <div class="ca-mile">★×{s.milestoneCur.toFixed(2)} · next ×{s.milestoneNext.toFixed(2)} at {s.milestoneAt}</div>
              {/if}
              <button class="ca-buy" disabled={!affordable}>
                +{s.bulkN} · {fmt(s.cost)} {s.costResource}
              </button>
            </div>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>

    <h3>DEPICT node tiles</h3>
    <div class="row row-4">
      {#each NODE_VARIANTS as { label, s } (label)}
        {@const affordable = s.have >= s.cost}
        {@const maxed = s.level >= s.maxLevel}
        <div class="tile-wrap">
          <div class="concept-c-node tree-{s.tree.toLowerCase()} cost-{s.costResource}"
            class:affordable class:maxed>
            <div class="cn-pulse"></div>
            <div class="cn-head">
              <span class="cn-tree">{s.tree}</span>
              <span class="cn-name">{s.name}</span>
              <span class="cn-level">{s.level}/{s.maxLevel}</span>
            </div>
            <div class="cn-bar">
              <div class="cn-bar-fill" style="--fill: {(s.level / s.maxLevel) * 100}%"></div>
            </div>
            <div class="cn-effect">{s.perLevel} · <em>{s.nowEffect}</em></div>
            <button class="cn-buy" disabled={!affordable || maxed}>
              {#if maxed}maxed
              {:else}+{s.bulkN} · {fmt(s.cost)} {s.costResource}
              {/if}
            </button>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <footer>
    <p>
      Pick a concept overall, OR call out specific elements from different concepts
      ("A's button-as-charge + B's vertical LED heat + C's affordable-pulse on nodes")
      and I'll mix them into the real cards.
    </p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    background: hsl(0 0% 7%);
    color: hsl(0 0% 90%);
    font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .mockup-page { max-width: 1400px; margin: 0 auto; padding: 1.5rem 2rem 4rem; }
  header { margin-bottom: 2rem; }
  header h1 { margin: 0.4rem 0; font-size: 1.4rem; }
  .back { color: hsl(200 70% 60%); text-decoration: none; font-size: 0.85rem; }
  .lede { color: hsl(0 0% 60%); margin: 0; max-width: 80ch; }
  .concept { margin: 3rem 0; padding-top: 2rem; border-top: 1px solid hsl(0 0% 15%); }
  .concept h2 { font-size: 1.2rem; margin: 0 0 0.4rem; }
  .concept h3 { font-size: 0.9rem; color: hsl(200 50% 70%); margin: 1.6rem 0 0.7rem;
                text-transform: uppercase; letter-spacing: 0.08em; }
  .rationale { color: hsl(0 0% 65%); font-size: 0.85rem; max-width: 80ch; margin: 0 0 0.8rem; }
  .row { display: grid; gap: 0.9rem; }
  .row-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .tile-wrap { display: flex; flex-direction: column; }
  .state-label { font-size: 0.65rem; color: hsl(0 0% 55%); text-align: center;
                 margin-top: 0.3rem; font-variant-numeric: tabular-nums; }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid hsl(0 0% 18%);
           color: hsl(0 0% 65%); font-size: 0.85rem; }

  /* Shared cost-resource colors (matching real app) */
  :root {
    --res-attention: hsl(40 85% 50%);
    --res-engagement: hsl(200 70% 50%);
  }

  /* ═════════════════════════════════════════════════════════════════════
     CONCEPT A · background-as-state
     ═════════════════════════════════════════════════════════════════════ */
  /* ---------- platform ---------- */
  .concept-a-platform {
    background: linear-gradient(180deg,
      color-mix(in oklab,
        hsl(calc(220 - var(--heat) * 220) 60% 18%) calc(var(--heat) * 100%),
        hsl(220 6% 14%)),
      hsl(220 6% 11%));
    border: 1px solid color-mix(in oklab,
      hsl(0 80% 50%) calc(var(--heat) * 100%), hsl(0 0% 22%));
    border-radius: 7px;
    padding: 0.55rem 0.7rem 0.5rem;
    display: grid;
    gap: 0.32rem;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 0 calc(var(--heat) * 18px) color-mix(in oklab, hsl(0 80% 50%) calc(var(--heat) * 50%), transparent);
    transition: background 200ms, border-color 200ms, box-shadow 200ms;
    min-height: 140px;
  }
  .concept-a-platform.burned { background: linear-gradient(180deg, hsl(0 0% 16%), hsl(0 0% 9%));
    filter: grayscale(0.5); opacity: 0.85; }
  .ap-head { display: flex; justify-content: space-between; align-items: baseline; }
  .ap-name { font-weight: 700; font-size: 0.95rem; }
  .ap-tag { font-size: 0.5rem; color: hsl(200 50% 70%);
    background: color-mix(in oklab, hsl(200 70% 50%) 18%, transparent);
    padding: 0.08rem 0.32rem; border-radius: 999px;
    letter-spacing: 0.06em; font-weight: 600; }
  .ap-audience { font-size: 0.62rem; color: hsl(0 0% 60%); font-style: italic; }
  .ap-post, .ap-push {
    appearance: none; font: inherit; color: inherit;
    border: 1px solid hsl(0 0% 30%); background: hsl(0 0% 13%);
    border-radius: 4px; padding: 0.35rem 0.5rem;
    position: relative; overflow: hidden; cursor: pointer;
    text-align: center; font-weight: 600; font-size: 0.72rem;
    margin-right: 0.7rem;
  }
  .ap-post:disabled, .ap-push:disabled { opacity: 0.4; cursor: not-allowed; }
  .ap-fill { position: absolute; inset: 0 auto 0 0; width: var(--fill, 0%);
    background: linear-gradient(90deg, hsl(200 70% 35%), hsl(200 80% 45%));
    transition: width 200ms ease-out; }
  .ap-post.ready .ap-fill { background: linear-gradient(90deg, hsl(140 70% 35%), hsl(140 80% 50%));
    box-shadow: 0 0 12px hsl(140 80% 50% / 0.5); }
  .ap-label { position: relative; z-index: 1; }
  .ap-push { background: linear-gradient(180deg, hsl(20 60% 22%), hsl(15 70% 14%));
    border-color: hsl(20 60% 35%); color: hsl(30 90% 80%); }
  .ap-rate { position: absolute; top: 0.55rem; bottom: 0.55rem; right: 0.32rem;
    width: 4px; background: hsl(0 0% 20%); border-radius: 3px; }
  .ap-rate-thumb { position: absolute; width: 10px; height: 10px;
    background: hsl(200 70% 55%); border: 1px solid hsl(0 0% 0%);
    border-radius: 50%; left: 50%; top: calc((100% - var(--pos)) - 5px);
    transform: translateX(-50%); }
  .ap-status, .ap-overlay {
    position: absolute; left: 0.4rem; right: 1rem; bottom: -1px;
    padding: 0.16rem 0.4rem; font-size: 0.58rem; text-align: center;
    font-weight: 700; letter-spacing: 0.05em;
    background: color-mix(in oklab, hsl(0 80% 45%) 30%, hsl(0 0% 10%));
    color: hsl(0 0% 100%); border-radius: 3px 3px 0 0;
  }
  .ap-overlay { background: hsl(0 0% 0% / 0.7); color: hsl(0 80% 70%); }

  /* ---------- asset ---------- */
  .concept-a-asset {
    --tint: var(--res-attention);
    position: relative;
    border: 1px solid hsl(0 0% 22%);
    border-left: 2px solid color-mix(in oklab, var(--tint) 55%, hsl(0 0% 30%));
    border-radius: 6px;
    padding: 0.4rem 0.55rem;
    background: hsl(0 0% 11%);
    overflow: hidden;
    display: grid;
    gap: 0.18rem;
    min-height: 90px;
  }
  .concept-a-asset.cost-engagement { --tint: var(--res-engagement); }
  .concept-a-asset::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--tint) 22%, transparent) 0%,
      color-mix(in oklab, var(--tint) 8%, transparent) 100%);
    width: var(--afford, 0%);
    transition: width 280ms ease-out;
    pointer-events: none;
  }
  .concept-a-asset.affordable {
    border-color: color-mix(in oklab, var(--tint) 60%, hsl(0 0% 25%));
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--tint) 30%, transparent),
                0 0 14px color-mix(in oklab, var(--tint) 18%, transparent);
  }
  .concept-a-asset > * { position: relative; z-index: 1; }
  .aa-head { display: flex; justify-content: space-between; align-items: baseline; }
  .aa-name { font-weight: 700; font-size: 0.85rem; }
  .aa-kind { font-weight: 400; color: hsl(0 0% 55%); font-size: 0.65rem; }
  .aa-count { color: hsl(0 0% 65%); font-variant-numeric: tabular-nums; font-size: 0.72rem; }
  .aa-produces { font-size: 0.65rem; color: hsl(140 50% 65%); }
  .aa-milestone { display: flex; gap: 0.5rem; font-size: 0.62rem; }
  .aa-mile-now { color: hsl(45 90% 60%); font-weight: 700; }
  .aa-mile-next { color: hsl(0 0% 55%); }
  .aa-foot { display: flex; justify-content: space-between; align-items: baseline;
    margin-top: auto; padding-top: 0.2rem; font-size: 0.72rem;
    font-variant-numeric: tabular-nums; }
  .aa-bulk { color: hsl(0 0% 60%); }
  .aa-cost { color: var(--tint); font-weight: 600; }

  /* ---------- DEPICT node ---------- */
  .concept-a-node {
    --tint: var(--res-attention);
    position: relative;
    border: 1px solid hsl(0 0% 22%);
    border-left: 2px solid color-mix(in oklab, var(--tint) 55%, hsl(0 0% 30%));
    border-radius: 5px;
    padding: 0.32rem 0.5rem;
    background: hsl(0 0% 11%);
    overflow: hidden;
    display: grid;
    gap: 0.14rem;
    min-height: 64px;
  }
  .concept-a-node.cost-engagement { --tint: var(--res-engagement); }
  .concept-a-node::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--tint) 28%, transparent),
      color-mix(in oklab, var(--tint) 10%, transparent));
    width: var(--level, 0%);
    pointer-events: none;
    transition: width 240ms;
  }
  .concept-a-node.maxed::before {
    width: 100%;
    background: linear-gradient(90deg,
      color-mix(in oklab, hsl(140 70% 45%) 30%, transparent),
      color-mix(in oklab, hsl(140 70% 45%) 12%, transparent));
  }
  .concept-a-node > * { position: relative; z-index: 1; }
  .an-head { display: flex; gap: 0.4rem; align-items: baseline;
    font-size: 0.78rem; font-weight: 600; }
  .an-tree { display: inline-block; width: 1.1rem; text-align: center; font-weight: 700;
    background: hsl(0 0% 18%); border-radius: 3px; font-size: 0.66rem; padding: 0.05rem 0; }
  .an-name { flex: 1; }
  .an-level { color: hsl(0 0% 60%); font-size: 0.7rem; font-variant-numeric: tabular-nums; }
  .an-effect { font-size: 0.62rem; color: hsl(0 0% 65%); }
  .an-effect em { color: hsl(140 50% 70%); font-style: normal; }
  .an-foot { display: flex; justify-content: space-between; align-items: baseline;
    margin-top: auto; padding-top: 0.16rem; font-size: 0.7rem;
    font-variant-numeric: tabular-nums; }
  .an-bulk { color: hsl(0 0% 60%); }
  .an-cost { color: var(--tint); font-weight: 600; }
  .an-maxed { color: hsl(140 60% 60%); font-weight: 700; }

  /* ═════════════════════════════════════════════════════════════════════
     CONCEPT B · tactile console (TIGHTENED)
     ═════════════════════════════════════════════════════════════════════ */
  /* ---------- platform (tightened) ---------- */
  .concept-b-platform {
    background: linear-gradient(180deg, hsl(220 8% 14%), hsl(220 8% 10%));
    border: 1px solid hsl(220 8% 22%);
    border-radius: 6px;
    padding: 0.5rem 0.55rem 0.4rem;
    display: grid;
    gap: 0.32rem;
    box-shadow: inset 0 1px 0 hsl(220 8% 28%);
    min-height: 140px;
  }
  .concept-b-platform.burned { filter: grayscale(0.6); opacity: 0.65; }
  .bp-head { display: flex; justify-content: space-between; align-items: baseline; }
  .bp-name { font-weight: 700; font-size: 0.9rem; }
  .bp-amp { font-size: 0.56rem; color: hsl(200 50% 65%); font-style: italic; }
  .bp-row { display: grid; grid-template-columns: 1fr auto; gap: 0.4rem; align-items: stretch; }
  .bp-buttons { display: grid; gap: 0.25rem; }
  .bp-post, .bp-push {
    appearance: none; font: inherit; position: relative; overflow: hidden;
    border: 1px solid hsl(0 0% 30%); border-top-color: hsl(0 0% 40%);
    border-bottom-color: hsl(0 0% 8%);
    background: linear-gradient(180deg, hsl(0 0% 20%), hsl(0 0% 13%));
    color: hsl(0 0% 90%); border-radius: 4px;
    padding: 0.42rem 0.5rem; font-weight: 700; font-size: 0.72rem;
    cursor: pointer; box-shadow: 0 1px 0 hsl(0 0% 0% / 0.4); text-align: center;
  }
  .bp-post:disabled, .bp-push:disabled { opacity: 0.4; cursor: not-allowed; }
  .bp-post-fill { position: absolute; inset: 0 auto 0 0; width: var(--fill, 0%);
    background: linear-gradient(90deg, hsl(50 70% 30%), hsl(50 90% 45%));
    transition: width 200ms; }
  .bp-post.ready .bp-post-fill {
    background: linear-gradient(90deg, hsl(140 70% 30%), hsl(140 90% 50%));
    box-shadow: 0 0 12px hsl(140 90% 50% / 0.5);
  }
  .bp-post-label { position: relative; z-index: 1; }
  .bp-push { color: hsl(30 90% 75%); }
  .bp-leds {
    display: flex; flex-direction: column-reverse; gap: 2px;
    width: 9px; padding: 1px; background: hsl(0 0% 8%);
    border: 1px solid hsl(0 0% 18%); border-radius: 3px;
  }
  .bp-led { flex: 1; min-height: 4px; background: hsl(0 0% 14%);
    border-radius: 1px; box-shadow: inset 0 0 1px hsl(0 0% 0%); }
  .bp-led.on { background: hsl(50 90% 50%); box-shadow: 0 0 4px hsl(50 90% 50% / 0.7); }
  .bp-led.critical { background: hsl(0 90% 55%);
    box-shadow: 0 0 6px hsl(0 90% 55% / 0.9);
    animation: led-blink 0.85s ease-in-out infinite;
  }
  @keyframes led-blink { 50% { filter: brightness(0.45); } }
  .bp-rate { display: grid; grid-template-columns: 2.2rem 1fr 2.4rem; gap: 0.3rem;
    align-items: center; font-size: 0.58rem; }
  .bp-rate-label { color: hsl(0 0% 55%); text-transform: uppercase; letter-spacing: 0.08em; }
  .bp-rate-track { height: 4px; background: hsl(0 0% 18%); border-radius: 2px; position: relative; }
  .bp-rate-thumb { position: absolute; width: 10px; height: 10px; border-radius: 50%;
    background: hsl(200 70% 55%); border: 1px solid hsl(0 0% 0%);
    top: 50%; left: var(--pos, 100%); transform: translate(-50%, -50%); }
  .bp-rate-num { text-align: right; color: hsl(0 0% 60%); font-variant-numeric: tabular-nums; }
  .bp-status {
    font-size: 0.58rem; height: 0.95rem; letter-spacing: 0.08em;
    text-transform: uppercase; font-weight: 700; text-align: center; color: hsl(0 80% 60%);
  }

  /* ---------- asset ---------- */
  .concept-b-asset {
    --tint: var(--res-attention);
    background: linear-gradient(180deg, hsl(220 8% 13%), hsl(220 8% 10%));
    border: 1px solid hsl(220 8% 22%);
    border-radius: 5px;
    padding: 0.4rem 0.5rem 0.4rem;
    display: grid;
    gap: 0.2rem;
    box-shadow: inset 0 1px 0 hsl(220 8% 26%);
    min-height: 90px;
  }
  .concept-b-asset.cost-engagement { --tint: var(--res-engagement); }
  .ba-head { display: flex; justify-content: space-between; align-items: baseline; }
  .ba-name { font-weight: 700; font-size: 0.8rem; }
  .ba-count { color: hsl(50 90% 65%);
    font-family: ui-monospace, monospace;
    font-variant-numeric: tabular-nums; font-size: 0.72rem;
    background: hsl(0 0% 8%);
    padding: 0.04rem 0.32rem; border: 1px solid hsl(0 0% 18%);
    border-radius: 2px; box-shadow: inset 0 1px 2px hsl(0 0% 0%);
  }
  .ba-produces { font-size: 0.62rem; color: hsl(140 50% 65%); }
  .ba-leds { display: flex; align-items: center; gap: 2px; height: 7px; }
  .ba-led { flex: 1; height: 100%; background: hsl(0 0% 12%); border-radius: 1px;
    box-shadow: inset 0 0 1px hsl(0 0% 0%); }
  .ba-led.on { background: hsl(45 90% 50%); box-shadow: 0 0 3px hsl(45 90% 55% / 0.6); }
  .ba-mile-num { margin-left: 0.3rem; font-size: 0.58rem; color: hsl(45 90% 65%);
    white-space: nowrap; font-variant-numeric: tabular-nums; }
  .ba-buy {
    appearance: none; font: inherit; color: inherit;
    border: 1px solid hsl(0 0% 30%); border-top-color: hsl(0 0% 40%);
    border-bottom-color: hsl(0 0% 8%);
    background: linear-gradient(180deg, hsl(0 0% 20%), hsl(0 0% 13%));
    border-radius: 4px; padding: 0.32rem 0.5rem; cursor: pointer;
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 0.7rem; font-weight: 600;
    margin-top: auto;
  }
  .ba-buy:disabled { opacity: 0.45; cursor: not-allowed; }
  .ba-bulk { color: hsl(0 0% 60%); }
  .ba-cost { color: var(--tint); font-weight: 700; }

  /* ---------- DEPICT node ---------- */
  .concept-b-node {
    --tint: var(--res-attention);
    background: linear-gradient(180deg, hsl(220 8% 13%), hsl(220 8% 10%));
    border: 1px solid hsl(220 8% 22%);
    border-radius: 5px;
    padding: 0.32rem 0.5rem 0.4rem;
    display: grid;
    gap: 0.16rem;
    box-shadow: inset 0 1px 0 hsl(220 8% 26%);
    min-height: 78px;
  }
  .concept-b-node.cost-engagement { --tint: var(--res-engagement); }
  .bn-head { display: flex; gap: 0.4rem; align-items: baseline; font-size: 0.78rem; font-weight: 600; }
  .bn-tree { display: inline-block; width: 1.1rem; text-align: center; font-weight: 700;
    background: hsl(0 0% 18%); border-radius: 3px; font-size: 0.62rem; padding: 0.06rem 0; }
  .bn-name { flex: 1; }
  .bn-level {
    color: hsl(140 60% 65%); font-family: ui-monospace, monospace;
    font-size: 0.68rem;
    background: hsl(0 0% 8%);
    padding: 0.04rem 0.3rem; border: 1px solid hsl(0 0% 18%);
    border-radius: 2px; box-shadow: inset 0 1px 2px hsl(0 0% 0%);
  }
  .bn-leds { display: flex; gap: 1px; height: 5px; }
  .bn-led { flex: 1; height: 100%; background: hsl(0 0% 14%); border-radius: 1px; }
  .bn-led.on { background: hsl(200 80% 50%); box-shadow: 0 0 3px hsl(200 90% 60% / 0.5); }
  .bn-led.maxed-led { background: hsl(140 80% 50%); }
  .bn-effect { font-size: 0.6rem; color: hsl(0 0% 65%); }
  .bn-effect em { color: hsl(140 50% 70%); font-style: normal; }
  .bn-buy {
    appearance: none; font: inherit; color: inherit;
    border: 1px solid hsl(0 0% 30%); border-top-color: hsl(0 0% 40%);
    border-bottom-color: hsl(0 0% 8%);
    background: linear-gradient(180deg, hsl(0 0% 20%), hsl(0 0% 13%));
    border-radius: 4px; padding: 0.28rem 0.4rem; cursor: pointer;
    font-size: 0.68rem; font-weight: 600;
    margin-top: auto; text-align: center;
  }
  .bn-buy:disabled { opacity: 0.45; cursor: not-allowed; }
  .bn-cost { color: var(--tint); }
  .bn-maxed { color: hsl(140 60% 60%); font-weight: 700; }

  /* ═════════════════════════════════════════════════════════════════════
     CONCEPT C · living scroll
     ═════════════════════════════════════════════════════════════════════ */
  /* ---------- platform ---------- */
  .concept-c-platform {
    background: hsl(220 8% 10%);
    border: 1px solid hsl(220 8% 22%);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    min-height: 200px;
    display: grid;
  }
  .concept-c-platform.burned { filter: grayscale(0.6); }
  .cp-feed { position: absolute; inset: 0; overflow: hidden;
    opacity: 0.16;
    mask-image: linear-gradient(180deg, transparent, black 20%, black 80%, transparent);
  }
  .cp-feed-strip {
    animation: scroll-feed var(--scroll-speed, 8s) linear infinite;
    color: color-mix(in oklab, hsl(0 80% 70%) calc(var(--heat) * 100%), hsl(200 30% 80%));
  }
  .cp-feed-strip p { margin: 0; padding: 0.16rem 0.5rem; font-size: 0.62rem;
    font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .concept-c-platform.burned .cp-feed-strip { animation-play-state: paused; }
  @keyframes scroll-feed { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
  .cp-content { position: relative; z-index: 1; padding: 0.55rem 0.7rem;
    display: grid; gap: 0.32rem;
    background: linear-gradient(180deg, hsl(220 8% 10% / 0.9), hsl(220 8% 8% / 0.85)); }
  .cp-head { display: flex; justify-content: space-between; align-items: baseline; }
  .cp-name { font-weight: 700; font-size: 0.9rem; }
  .cp-audience { font-size: 0.6rem; color: hsl(0 0% 60%); font-style: italic; }
  .cp-post, .cp-push {
    appearance: none; font: inherit; color: inherit;
    border: 1px solid hsl(0 0% 30%); background: hsl(0 0% 12% / 0.9);
    border-radius: 4px; padding: 0.4rem 0.5rem;
    position: relative; overflow: hidden; cursor: pointer;
    text-align: center; font-weight: 600; font-size: 0.72rem;
  }
  .cp-post:disabled, .cp-push:disabled { opacity: 0.45; cursor: not-allowed; }
  .cp-fill { position: absolute; inset: 0 auto 0 0; width: var(--fill, 0%);
    background: linear-gradient(90deg, hsl(200 60% 30%), hsl(200 80% 45%)); }
  .cp-text { position: relative; z-index: 1; }
  .cp-push { background: linear-gradient(180deg, hsl(20 50% 20% / 0.9), hsl(15 60% 12% / 0.9));
    border-color: hsl(20 50% 30%); color: hsl(30 80% 78%); }
  .cp-rate { display: flex; gap: 0.4rem; align-items: center; font-size: 0.58rem; }
  .cp-rate-label, .cp-rate-num { color: hsl(0 0% 60%); }
  .cp-rate-track { flex: 1; height: 4px; background: hsl(0 0% 18%); border-radius: 2px; position: relative; }
  .cp-rate-knob { position: absolute; width: 10px; height: 10px; border-radius: 50%;
    background: hsl(200 70% 55%); top: 50%; left: var(--pos, 100%);
    transform: translate(-50%, -50%); }
  .cp-overlay { position: absolute; inset: 0; background: hsl(0 0% 0% / 0.75);
    color: hsl(0 80% 70%); display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; }

  /* ---------- asset ---------- */
  .concept-c-asset {
    --tint: var(--res-attention);
    position: relative;
    background: hsl(220 8% 10%);
    border: 1px solid hsl(220 8% 22%);
    border-radius: 5px;
    overflow: hidden;
    min-height: 100px;
  }
  .concept-c-asset.cost-engagement { --tint: var(--res-engagement); }
  .ca-feed { position: absolute; inset: 0; opacity: 0.13; overflow: hidden;
    mask-image: linear-gradient(180deg, transparent, black 20%, black 80%, transparent); }
  .ca-feed-strip { animation: scroll-feed 14s linear infinite; color: var(--tint); }
  .ca-feed-strip p { margin: 0; padding: 0.16rem 0.5rem; font-size: 0.6rem;
    font-style: italic; white-space: nowrap; }
  .ca-content { position: relative; z-index: 1; padding: 0.4rem 0.55rem; display: grid; gap: 0.16rem;
    background: linear-gradient(180deg, hsl(220 8% 10% / 0.9), hsl(220 8% 8% / 0.85)); }
  .ca-head { display: flex; justify-content: space-between; align-items: baseline; }
  .ca-name { font-weight: 700; font-size: 0.8rem; }
  .ca-count { color: hsl(0 0% 65%); font-variant-numeric: tabular-nums; font-size: 0.7rem; }
  .ca-produces { font-size: 0.62rem; color: hsl(140 50% 65%); }
  .ca-mile { font-size: 0.58rem; color: hsl(45 90% 65%);
    font-variant-numeric: tabular-nums; }
  .ca-buy {
    appearance: none; font: inherit; color: inherit;
    border: 1px solid color-mix(in oklab, var(--tint) 50%, hsl(0 0% 25%));
    background: color-mix(in oklab, var(--tint) 10%, hsl(0 0% 12% / 0.9));
    border-radius: 4px; padding: 0.32rem 0.5rem; cursor: pointer;
    font-size: 0.7rem; font-weight: 600; text-align: center;
    margin-top: auto; color: var(--tint);
  }
  .concept-c-asset.affordable .ca-buy {
    animation: pulse-affordable 2.2s ease-in-out infinite;
  }
  .ca-buy:disabled { opacity: 0.45; cursor: not-allowed; animation: none; }
  @keyframes pulse-affordable {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--tint) 40%, transparent); }
    50%      { box-shadow: 0 0 0 4px color-mix(in oklab, var(--tint) 0%, transparent); }
  }

  /* ---------- DEPICT node ---------- */
  .concept-c-node {
    --tint: var(--res-attention);
    position: relative;
    background: hsl(220 8% 10%);
    border: 1px solid hsl(220 8% 22%);
    border-radius: 5px;
    padding: 0.3rem 0.5rem 0.4rem;
    display: grid;
    gap: 0.14rem;
    overflow: hidden;
    min-height: 70px;
  }
  .concept-c-node.cost-engagement { --tint: var(--res-engagement); }
  .cn-pulse { display: none; }
  .concept-c-node.affordable .cn-pulse {
    display: block; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 50%,
      color-mix(in oklab, var(--tint) 18%, transparent) 0%,
      transparent 70%);
    animation: cn-throb 2.4s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes cn-throb { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.9; } }
  .concept-c-node > *:not(.cn-pulse) { position: relative; z-index: 1; }
  .cn-head { display: flex; gap: 0.4rem; align-items: baseline; font-size: 0.76rem; font-weight: 600; }
  .cn-tree { display: inline-block; width: 1.1rem; text-align: center; font-weight: 700;
    background: hsl(0 0% 18%); border-radius: 3px; font-size: 0.62rem; padding: 0.04rem 0; }
  .cn-name { flex: 1; }
  .cn-level { color: hsl(0 0% 60%); font-size: 0.66rem; font-variant-numeric: tabular-nums; }
  .cn-bar { height: 3px; background: hsl(0 0% 18%); border-radius: 2px; overflow: hidden; }
  .cn-bar-fill { height: 100%; width: var(--fill, 0%);
    background: linear-gradient(90deg, var(--tint), color-mix(in oklab, var(--tint) 50%, white)); }
  .concept-c-node.maxed .cn-bar-fill { background: linear-gradient(90deg, hsl(140 70% 45%), hsl(140 90% 60%)); }
  .cn-effect { font-size: 0.6rem; color: hsl(0 0% 65%); }
  .cn-effect em { color: hsl(140 50% 70%); font-style: normal; }
  .cn-buy {
    appearance: none; font: inherit; color: var(--tint);
    border: 1px solid color-mix(in oklab, var(--tint) 50%, hsl(0 0% 25%));
    background: color-mix(in oklab, var(--tint) 8%, hsl(0 0% 12% / 0.9));
    border-radius: 4px; padding: 0.24rem 0.4rem; cursor: pointer;
    font-size: 0.66rem; font-weight: 600;
    margin-top: auto; text-align: center;
  }
  .cn-buy:disabled { opacity: 0.45; cursor: not-allowed; }
</style>

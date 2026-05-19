<script lang="ts">
  // PROTOTYPE — three platform-tile redesigns side-by-side at 4 heat states.
  // Reachable at ?mockup=tiles. Not wired to real game state; uses
  // synthetic data so the comparison is apples-to-apples.

  type State = {
    heat: number;          // 0..1
    charge: number;        // 0..1
    postRate: number;      // 0..1
    burned: boolean;
    bannedSecs?: number;
  };
  const STATES: { label: string; s: State }[] = [
    { label: 'cool (12% heat)',        s: { heat: 0.12, charge: 0.45, postRate: 1.0,  burned: false } },
    { label: 'hot (62% heat)',         s: { heat: 0.62, charge: 0.82, postRate: 0.7,  burned: false } },
    { label: 'overheated (87% heat)',  s: { heat: 0.87, charge: 0.97, postRate: 1.0,  burned: false } },
    { label: 'banned (18s left)',      s: { heat: 0.40, charge: 0,    postRate: 0.5,  burned: true, bannedSecs: 18 } },
  ];

  const meta = {
    name: 'X',
    audience: 'news-junkie · polarized',
    tint: 'hsl(220 5% 25%)',
    topAmps: ['T+P', 'trolling, polarization'],
  };

  const postYield = 311;     // attention
  const freestyleYield = 247;
</script>

<div class="mockup-page">
  <header>
    <a href="./" class="back">← back to game</a>
    <h1>Platform tile redesign — prototypes</h1>
    <p class="lede">Three concepts, four heat states each. Pick what feels best — or take pieces from different ones.</p>
  </header>

  <!-- ── CONCEPT A: Heat IS the background ────────────────────────────── -->
  <section>
    <h2>Concept A · Heat IS the background</h2>
    <p class="rationale">
      Whole card body gradients cool→red with heat. <strong>No heat bar</strong> — the card itself is the gauge.
      <strong>Charge fills the POST button</strong> left-to-right, so no separate charge bar.
      <strong>Rate is a thin vertical fader</strong> on the right edge. Status banner only appears at 75%+.
    </p>
    <div class="row">
      {#each STATES as { label, s } (label)}
        <div class="concept-a-wrap">
          <div
            class="concept-a"
            class:burned={s.burned}
            style="--heat: {s.heat}; --tint: {meta.tint};"
          >
            <div class="a-head">
              <span class="a-name">{meta.name}</span>
              <span class="a-tag">{meta.topAmps[0]}</span>
            </div>
            <div class="a-audience">{meta.audience}</div>

            <div class="a-buttons">
              <button class="a-post" class:ready={s.charge >= 1 && !s.burned} disabled={s.burned}>
                <span class="a-post-fill" style="--fill: {s.charge * 100}%"></span>
                <span class="a-post-label">POST · +{postYield} att</span>
              </button>
              <button class="a-push" disabled={s.burned}>
                <span class="a-push-label">PUSH IT · +{freestyleYield} att</span>
              </button>
            </div>

            <div class="a-rate" title="rate slider">
              <span class="a-rate-thumb" style="--pos: {s.postRate * 100}%"></span>
            </div>

            {#if s.burned}
              <div class="a-overlay">⊘ BANNED · {s.bannedSecs}s</div>
            {:else if s.heat >= 0.85}
              <div class="a-status">⚠ OVERHEATED · {Math.round((1 - s.heat * 0.6) * 100)}% yield</div>
            {:else if s.heat >= 0.75}
              <div class="a-status">⚠ DANGER · {Math.round(s.heat * 100)}%</div>
            {/if}
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- ── CONCEPT B: Tactile console ────────────────────────────────────── -->
  <section>
    <h2>Concept B · Tactile console</h2>
    <p class="rationale">
      Card looks like a physical instrument. <strong>Circular charge dial</strong> with a sweeping arc.
      <strong>Vertical fader</strong> for rate on the right (drag the knob). <strong>Heat is a row of LED segments</strong>
      at the bottom — segments light up as heat climbs. POST/PUSH are tactile buttons.
    </p>
    <div class="row">
      {#each STATES as { label, s } (label)}
        <div class="concept-b-wrap">
          <div
            class="concept-b"
            class:burned={s.burned}
            style="--tint: {meta.tint};"
          >
            <div class="b-head">
              <span class="b-name">{meta.name}</span>
              <span class="b-amp">{meta.topAmps[1]}</span>
            </div>

            <div class="b-instruments">
              <div class="b-dial" title="charge">
                <svg viewBox="0 0 100 100" class="b-dial-svg">
                  <circle cx="50" cy="50" r="42" class="b-dial-track" />
                  <circle
                    cx="50" cy="50" r="42"
                    class="b-dial-fill"
                    style="stroke-dasharray: {2 * Math.PI * 42}; stroke-dashoffset: {2 * Math.PI * 42 * (1 - s.charge)};"
                  />
                </svg>
                <span class="b-dial-num">{Math.round(s.charge * 100)}<small>%</small></span>
                <span class="b-dial-label">charge</span>
              </div>

              <div class="b-fader" title="rate fader">
                <div class="b-fader-track">
                  <div class="b-fader-knob" style="--pos: {(1 - s.postRate) * 100}%"></div>
                </div>
                <span class="b-fader-label">rate {Math.round(s.postRate * 100)}%</span>
              </div>
            </div>

            <div class="b-buttons">
              <button class="b-button b-post" disabled={s.burned}>POST · +{postYield}</button>
              <button class="b-button b-push" disabled={s.burned}>PUSH · +{freestyleYield}</button>
            </div>

            <div class="b-leds">
              {#each Array(10) as _, i (i)}
                <span
                  class="b-led"
                  class:on={i < Math.round(s.heat * 10)}
                  class:critical={i >= 7 && i < Math.round(s.heat * 10)}
                ></span>
              {/each}
              <span class="b-leds-label">
                {#if s.burned}BANNED · {s.bannedSecs}s
                {:else if s.heat >= 0.85}OVERHEAT
                {:else if s.heat >= 0.75}DANGER
                {:else if s.heat >= 0.5}HOT
                {:else}heat
                {/if}
              </span>
            </div>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- ── CONCEPT C: Living scroll ──────────────────────────────────────── -->
  <section>
    <h2>Concept C · Living scroll</h2>
    <p class="rationale">
      Ambient post-feed scrolls vertically behind the controls. <strong>Calm scroll = healthy</strong>,
      <strong>fast + red-tinted = hot</strong>, <strong>frozen with overlay = banned</strong>.
      Most cinematic, but more moving parts on screen.
    </p>
    <div class="row">
      {#each STATES as { label, s } (label)}
        <div class="concept-c-wrap">
          <div
            class="concept-c"
            class:burned={s.burned}
            style="--tint: {meta.tint}; --heat: {s.heat}; --scroll-speed: {Math.max(1, 12 - s.heat * 10)}s;"
          >
            <!-- Background scroll layer -->
            <div class="c-feed" aria-hidden="true">
              <div class="c-feed-strip">
                <p>"BREAKING: 'sources say' shocking new..."</p>
                <p>"WAIT — you won't believe what comes next"</p>
                <p>"just asking questions about..."</p>
                <p>"the REAL story they don't want you to..."</p>
                <p>"thread 🧵 (1/47)"</p>
                <p>"PEOPLE ARE SAYING this is..."</p>
                <p>"my source inside the agency confirms"</p>
                <p>"do your own research, friends"</p>
                <p>"the silence is deafening"</p>
                <p>"don't let them tell you what to..."</p>
              </div>
            </div>

            <div class="c-content">
              <div class="c-head">
                <span class="c-name">{meta.name}</span>
                <span class="c-audience">{meta.audience}</span>
              </div>

              <button class="c-post" disabled={s.burned || s.charge < 1}>
                <span class="c-post-fill" style="--fill: {s.charge * 100}%"></span>
                <span class="c-post-text">POST · +{postYield} att · {Math.round(s.charge * 100)}%</span>
              </button>
              <button class="c-push" disabled={s.burned}>PUSH IT · +{freestyleYield} att</button>

              <div class="c-rate">
                <span class="c-rate-label">rate</span>
                <div class="c-rate-track">
                  <div class="c-rate-knob" style="--pos: {s.postRate * 100}%"></div>
                </div>
                <span class="c-rate-num">{Math.round(s.postRate * 100)}%</span>
              </div>

              {#if s.burned}
                <div class="c-overlay">⊘ ACCOUNT SUSPENDED · {s.bannedSecs}s</div>
              {/if}
            </div>
          </div>
          <span class="state-label">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <footer>
    <p>
      When you've picked, tell me. I can also mix-and-match — e.g. Concept A's charge-as-button + Concept B's
      LED heat strip. The CSS for whichever wins moves straight into App.svelte's platform card.
    </p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    background: hsl(0 0% 7%);
    color: hsl(0 0% 90%);
    font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .mockup-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem 2rem 4rem;
  }
  header { margin-bottom: 2rem; }
  header h1 { margin: 0.4rem 0; font-size: 1.4rem; }
  .back { color: hsl(200 70% 60%); text-decoration: none; font-size: 0.85rem; }
  .lede { color: hsl(0 0% 60%); margin: 0; }
  section { margin: 3rem 0; }
  section h2 { font-size: 1.1rem; margin-bottom: 0.3rem; letter-spacing: 0.01em; }
  .rationale {
    color: hsl(0 0% 65%);
    font-size: 0.85rem;
    max-width: 64ch;
    margin: 0 0 1.2rem;
  }
  .row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .state-label {
    display: block;
    font-size: 0.7rem;
    color: hsl(0 0% 55%);
    text-align: center;
    margin-top: 0.4rem;
    font-variant-numeric: tabular-nums;
  }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid hsl(0 0% 18%); color: hsl(0 0% 60%); }

  /* ─────────────────────────────────────────────────────────────────────
     CONCEPT A — Heat IS the background
     ───────────────────────────────────────────────────────────────────── */
  .concept-a-wrap { display: flex; flex-direction: column; }
  .concept-a {
    /* Heat drives the entire card's tint. */
    background: linear-gradient(
      180deg,
      color-mix(in oklab,
        hsl(calc(220 - var(--heat) * 220) 60% 18%) calc(var(--heat) * 100%),
        hsl(220 6% 14%)),
      hsl(220 6% 11%)
    );
    border: 1px solid color-mix(in oklab,
      hsl(0 80% 50%) calc(var(--heat) * 100%),
      hsl(0 0% 22%));
    border-radius: 8px;
    padding: 0.7rem 0.85rem 0.5rem;
    display: grid;
    gap: 0.4rem;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 0 calc(var(--heat) * 22px) color-mix(in oklab, hsl(0 80% 50%) calc(var(--heat) * 60%), transparent),
      inset 0 0 0 1px color-mix(in oklab, hsl(0 0% 0%) 30%, transparent);
    transition: background 200ms, border-color 200ms, box-shadow 200ms;
  }
  .concept-a.burned {
    background: linear-gradient(180deg, hsl(0 0% 16%), hsl(0 0% 9%));
    filter: grayscale(0.5);
    opacity: 0.85;
  }
  .a-head { display: flex; justify-content: space-between; align-items: baseline; }
  .a-name { font-weight: 700; font-size: 1rem; letter-spacing: -0.01em; }
  .a-tag {
    font-size: 0.55rem;
    color: hsl(200 50% 70%);
    background: color-mix(in oklab, hsl(200 70% 50%) 18%, transparent);
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .a-audience { font-size: 0.7rem; color: hsl(0 0% 60%); font-style: italic; }
  .a-buttons { display: grid; gap: 0.3rem; padding-right: 1.1rem; }
  .a-post, .a-push {
    appearance: none;
    font: inherit;
    color: inherit;
    border: 1px solid hsl(0 0% 30%);
    background: hsl(0 0% 14%);
    border-radius: 5px;
    padding: 0.45rem 0.6rem;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    text-align: center;
    font-weight: 600;
    font-size: 0.78rem;
  }
  .a-post:disabled, .a-push:disabled { opacity: 0.4; cursor: not-allowed; }
  .a-post-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--fill, 0%);
    background: linear-gradient(90deg, hsl(200 70% 35%), hsl(200 80% 45%));
    transition: width 200ms ease-out;
  }
  .a-post.ready .a-post-fill {
    background: linear-gradient(90deg, hsl(140 70% 35%), hsl(140 80% 50%));
    box-shadow: 0 0 12px hsl(140 80% 50% / 0.6);
  }
  .a-post-label, .a-push-label { position: relative; z-index: 1; }
  .a-push {
    background: linear-gradient(180deg, hsl(20 60% 22%), hsl(15 70% 14%));
    border-color: hsl(20 60% 35%);
    color: hsl(30 90% 80%);
  }
  .a-rate {
    position: absolute;
    top: 0.7rem;
    bottom: 0.7rem;
    right: 0.45rem;
    width: 5px;
    background: hsl(0 0% 20%);
    border-radius: 3px;
  }
  .a-rate-thumb {
    position: absolute;
    width: 11px;
    height: 11px;
    background: hsl(200 70% 55%);
    border: 1px solid hsl(0 0% 0%);
    border-radius: 50%;
    left: 50%;
    top: calc((100% - var(--pos)) - 5.5px);
    transform: translateX(-50%);
  }
  .a-status, .a-overlay {
    position: absolute;
    left: 0.5rem; right: 1.4rem;
    bottom: -1px;
    padding: 0.2rem 0.4rem;
    font-size: 0.62rem;
    text-align: center;
    font-weight: 700;
    letter-spacing: 0.05em;
    background: color-mix(in oklab, hsl(0 80% 45%) 30%, hsl(0 0% 10%));
    color: hsl(0 0% 100%);
    border-radius: 3px 3px 0 0;
  }
  .a-overlay { background: hsl(0 0% 0% / 0.7); color: hsl(0 80% 70%); }

  /* ─────────────────────────────────────────────────────────────────────
     CONCEPT B — Tactile console
     ───────────────────────────────────────────────────────────────────── */
  .concept-b-wrap { display: flex; flex-direction: column; }
  .concept-b {
    background: linear-gradient(180deg, hsl(220 8% 14%), hsl(220 8% 10%));
    border: 1px solid hsl(220 8% 22%);
    border-radius: 7px;
    padding: 0.7rem 0.85rem;
    display: grid;
    gap: 0.6rem;
    box-shadow: inset 0 1px 0 hsl(220 8% 28%);
  }
  .concept-b.burned { filter: grayscale(0.5); opacity: 0.7; }
  .b-head { display: flex; justify-content: space-between; align-items: baseline; }
  .b-name { font-weight: 700; font-size: 1rem; }
  .b-amp { font-size: 0.6rem; color: hsl(200 50% 65%); font-style: italic; }
  .b-instruments {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.8rem;
    align-items: center;
  }
  .b-dial {
    width: 80px;
    height: 80px;
    position: relative;
    margin: 0 auto;
  }
  .b-dial-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .b-dial-track { fill: none; stroke: hsl(0 0% 18%); stroke-width: 6; }
  .b-dial-fill {
    fill: none;
    stroke: hsl(200 80% 55%);
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 300ms;
  }
  .b-dial-num {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
  }
  .b-dial-num small { font-size: 0.55rem; opacity: 0.6; margin-left: 1px; }
  .b-dial-label {
    position: absolute;
    bottom: -1.2rem;
    left: 0; right: 0;
    text-align: center;
    font-size: 0.55rem;
    color: hsl(0 0% 55%);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .b-fader { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
  .b-fader-track {
    width: 6px;
    height: 64px;
    background: hsl(0 0% 14%);
    border-radius: 3px;
    border: 1px solid hsl(0 0% 22%);
    position: relative;
    box-shadow: inset 0 0 4px hsl(0 0% 0% / 0.6);
  }
  .b-fader-knob {
    position: absolute;
    width: 14px;
    height: 10px;
    left: 50%;
    transform: translateX(-50%);
    top: calc(var(--pos) - 5px);
    background: linear-gradient(180deg, hsl(0 0% 70%), hsl(0 0% 35%));
    border: 1px solid hsl(0 0% 10%);
    border-radius: 2px;
    cursor: grab;
  }
  .b-fader-label { font-size: 0.55rem; color: hsl(0 0% 55%); letter-spacing: 0.1em; }
  .b-buttons { display: grid; gap: 0.3rem; }
  .b-button {
    appearance: none;
    font: inherit;
    background: linear-gradient(180deg, hsl(0 0% 22%), hsl(0 0% 14%));
    border: 1px solid hsl(0 0% 30%);
    border-top-color: hsl(0 0% 40%);
    border-bottom-color: hsl(0 0% 8%);
    color: hsl(0 0% 90%);
    padding: 0.5rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.78rem;
    cursor: pointer;
    box-shadow: 0 1px 0 hsl(0 0% 0% / 0.4);
  }
  .b-button:disabled { opacity: 0.4; cursor: not-allowed; }
  .b-button:active:not(:disabled) {
    background: linear-gradient(180deg, hsl(0 0% 14%), hsl(0 0% 22%));
    box-shadow: inset 0 1px 4px hsl(0 0% 0% / 0.6);
  }
  .b-push { color: hsl(30 90% 75%); }
  .b-leds {
    display: flex;
    gap: 3px;
    align-items: center;
    padding: 0.3rem 0;
  }
  .b-led {
    flex: 1;
    height: 6px;
    background: hsl(0 0% 14%);
    border-radius: 1px;
    box-shadow: inset 0 0 1px hsl(0 0% 0%);
  }
  .b-led.on {
    background: hsl(50 90% 50%);
    box-shadow: 0 0 4px hsl(50 90% 50% / 0.7);
  }
  .b-led.critical {
    background: hsl(0 90% 55%);
    box-shadow: 0 0 6px hsl(0 90% 55% / 0.9);
    animation: led-blink 0.9s ease-in-out infinite;
  }
  @keyframes led-blink { 50% { filter: brightness(0.5); } }
  .b-leds-label {
    margin-left: 0.4rem;
    font-size: 0.55rem;
    color: hsl(0 0% 55%);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
    min-width: 5rem;
  }

  /* ─────────────────────────────────────────────────────────────────────
     CONCEPT C — Living scroll
     ───────────────────────────────────────────────────────────────────── */
  .concept-c-wrap { display: flex; flex-direction: column; }
  .concept-c {
    background: hsl(220 8% 10%);
    border: 1px solid hsl(220 8% 22%);
    border-radius: 7px;
    overflow: hidden;
    position: relative;
    min-height: 240px;
    display: grid;
  }
  .concept-c.burned { filter: grayscale(0.6); }
  .c-feed {
    position: absolute;
    inset: 0;
    overflow: hidden;
    opacity: 0.18;
    mask-image: linear-gradient(180deg, transparent, black 20%, black 80%, transparent);
  }
  .c-feed-strip {
    animation: scroll-feed var(--scroll-speed, 8s) linear infinite;
    color: color-mix(in oklab, hsl(0 80% 70%) calc(var(--heat) * 100%), hsl(200 30% 80%));
  }
  .c-feed-strip p {
    margin: 0;
    padding: 0.2rem 0.6rem;
    font-size: 0.68rem;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .concept-c.burned .c-feed-strip { animation-play-state: paused; }
  @keyframes scroll-feed {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  .c-content {
    position: relative;
    z-index: 1;
    padding: 0.7rem 0.85rem;
    display: grid;
    gap: 0.4rem;
    background: linear-gradient(180deg, hsl(220 8% 10% / 0.9), hsl(220 8% 8% / 0.85));
  }
  .c-head { display: flex; justify-content: space-between; align-items: baseline; }
  .c-name { font-weight: 700; font-size: 1rem; }
  .c-audience { font-size: 0.65rem; color: hsl(0 0% 60%); font-style: italic; }
  .c-post, .c-push {
    appearance: none;
    font: inherit;
    color: inherit;
    border: 1px solid hsl(0 0% 30%);
    background: hsl(0 0% 12% / 0.9);
    border-radius: 5px;
    padding: 0.45rem 0.6rem;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    text-align: center;
    font-weight: 600;
    font-size: 0.78rem;
  }
  .c-post:disabled, .c-push:disabled { opacity: 0.45; cursor: not-allowed; }
  .c-post-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--fill, 0%);
    background: linear-gradient(90deg, hsl(200 60% 30%), hsl(200 80% 45%));
  }
  .c-post-text { position: relative; z-index: 1; }
  .c-push {
    background: linear-gradient(180deg, hsl(20 50% 20% / 0.9), hsl(15 60% 12% / 0.9));
    border-color: hsl(20 50% 30%);
    color: hsl(30 80% 78%);
  }
  .c-rate {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.62rem;
  }
  .c-rate-label, .c-rate-num { color: hsl(0 0% 60%); }
  .c-rate-track {
    flex: 1;
    height: 4px;
    background: hsl(0 0% 18%);
    border-radius: 2px;
    position: relative;
  }
  .c-rate-knob {
    position: absolute;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: hsl(200 70% 55%);
    top: 50%;
    left: var(--pos, 100%);
    transform: translate(-50%, -50%);
  }
  .c-overlay {
    position: absolute;
    inset: 0;
    background: hsl(0 0% 0% / 0.75);
    color: hsl(0 80% 70%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }
</style>

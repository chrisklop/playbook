# Mebro Antagonist Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing phase arc reachable + visible, then layer a Mebro "Living Dashboard" antagonist on top that flags assets and forces real defensive decisions.

**Architecture:** Pure logic in `src/game/core/mebro.ts` (testable with vitest). UI in `src/components/MebroPanel.svelte` + `PhaseTransitionModal.svelte` + `PhaseMilestoneHUD.svelte`. State extends `GameState` with seven new fields; save version bumps 9→10 with migration. Each commit ships independently and is revertible without unwinding the others.

**Tech Stack:** Svelte 5 (runes), TypeScript 6, Vite 8, vitest 2, pnpm. Existing project — follow patterns in `src/game/core/*.ts`.

**Spec:** `docs/superpowers/specs/2026-05-20-mebro-antagonist-upgrade-design.md`

**Live deploy:** Each task ends with `pnpm build` + `git push`. The user playtests on GitHub Pages between commits — every commit must build cleanly. Skipping `pnpm build` is a plan failure; `svelte-check` alone is insufficient (Rolldown catches errors that svelte-check misses).

**Rollback:** Tag `pre-antagonist` is already created on `main` at commit `7337b52` (the design-spec commit). To abort: `git reset --hard pre-antagonist && git push --force-with-lease`.

---

## File Structure

### New files

- `src/game/core/mebro.ts` — pure detection logic + helpers. Exports `tickDetection`, `applyRotate`, `applyCooldown`, `applyCounterNarrative`, `intrusionStage`, `homePlatform`, type `MebroVerb`.
- `src/game/core/mebro.test.ts` — vitest tests for the pure logic above.
- `src/components/MebroPanel.svelte` — the panel UI. Renders pill/panel based on intrusion stage. Lives in Platforms column.
- `src/components/PhaseTransitionModal.svelte` — full-bleed phase-up modal.
- `src/components/PhaseMilestoneHUD.svelte` — 32px milestone bar below topbar.
- `src/components/CounterNarrativeChooser.svelte` — small modal for picking one of four variants.
- `src/lib/counterNarratives.ts` — 4 narrative variants as a static list.
- `src/lib/phaseTransitionCopy.ts` — 5 phase-up modal copy sets.

### Modified files

- `src/game/types.ts` — add antagonist fields to `GameState`; bump `SAVE_VERSION` to 10.
- `src/game/save.ts` — migration for v9→v10 (default new fields).
- `src/game/core/defaults.ts` — initialize new fields.
- `src/game/core/tick.ts` — call `tickDetection(state, dt)`.
- `src/game/core/actions.ts` — lower phase thresholds.
- `src/game/core/posting.ts` — POST/PUSH IT contribute to detection.
- `src/game/core/catalog.ts` — Newsletter Stack cap +1500 → +3000; patron visibility predicates get phase gates.
- `src/game/legacy.ts` — `performPrestige` clears antagonist run state (extends existing clear).
- `src/lib/facts.ts` — add 2 ticker lines at `minCure: 0.50` and `0.75`.
- `src/App.svelte` — slot in `<PhaseMilestoneHUD />`, `<PhaseTransitionModal />`, `<MebroPanel />`. Add `<body class="mebro-enabled">`.

---

## Phase 1 — Foundation Fixes

Goal: phase arc is reachable and visible. Solo-shippable.

### Task 1.1: Lower phase thresholds

**Files:**
- Modify: `src/game/core/actions.ts:127-159` (the `checkPhaseTransitions` function)

- [ ] **Step 1: Edit `checkPhaseTransitions`**

Open `src/game/core/actions.ts`. Replace the body of `checkPhaseTransitions` with:

```ts
export function checkPhaseTransitions(state: GameState): void {
  if (state.phase === 'grassroots') {
    if (state.resources.attention >= 500_000 && state.flags['editorialCalendar']) {
      state.phase = 'blog';
      unlockPlatforms(state, ['facebook'], ['Facebook']);
      pushLog(state, '── Phase: BLOG ── You spin up a fake news site. Real ad money starts trickling in.');
    }
  } else if (state.phase === 'blog') {
    if (state.resources.engagement >= 150_000) {
      state.phase = 'social';
      state.flags['socialEraReached'] = true;
      unlockPlatforms(state, ['tiktok', 'youtube'], ['TikTok', 'YouTube']);
      pushLog(state, '── Phase: SOCIAL ── The algorithm starts serving your content to people who never asked for it.');
    }
  } else if (state.phase === 'social') {
    if (state.resources.followers >= 100_000) {
      state.phase = 'influencer';
      unlockPlatforms(state, ['telegram', 'substack'], ['Telegram', 'Substack']);
      pushLog(state, '── Phase: INFLUENCER ── Paywalled credibility on the front; coordination off-platform.');
    }
  } else if (state.phase === 'influencer') {
    if (state.resources.credibility >= 400_000) {
      state.phase = 'cable';
      unlockPlatforms(state, ['podcast'], ['Podcast networks']);
      pushLog(state, '── Phase: CABLE ── Bookings land. Your topic enters the chyron rotation.');
    }
  } else if (state.phase === 'cable') {
    if (state.resources.narrativeDominance >= 3_000_000) {
      state.phase = 'aisaturation';
      pushLog(state, '── Phase: AI SATURATION ── Every platform now generates content on its own. So do you.');
    }
  }
}
```

Only the threshold numbers change: 500K→150K engagement, 1M→400K credibility, 10M→3M narrativeDominance.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/core/actions.ts
git commit -m "Lower phase thresholds for reachable progression

Blog→Social 500K→150K engagement, Influencer→Cable 1M→400K
credibility, Cable→AI 10M→3M narrative dominance. The original
thresholds made phases past Blog effectively unreachable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 1.2: Double Newsletter Stack cap-raise

**Files:**
- Modify: `src/game/core/catalog.ts` (Newsletter Stack asset definition near line 228)

- [ ] **Step 1: Find Newsletter Stack definition**

Run: `grep -n "id: 'newsletter'" src/game/core/catalog.ts`
Read the asset object that follows.

- [ ] **Step 2: Edit cap-raiser amount**

The Newsletter Stack must currently use a `capRaise` field or similar (look for `1500` in or near the definition). Change the value from `1500` to `3000`. If the value lives in a separate helper (e.g., `computeCaps`), follow the call chain and change it there. Touch only the engagement cap-raiser specific to Newsletter Stack — do not modify Outlet or Audience Pod cap-raisers.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 4: Commit**

```bash
git add src/game/core/catalog.ts src/game/core/production.ts 2>/dev/null || true
git add -u
git commit -m "Double Newsletter Stack engagement cap (+1500 → +3000)

Pairs with lower phase thresholds: 30 Newsletter Stacks now lift
engagement cap by 90K (was 45K), so Blog→Social at 150K eng is
reachable without grinding.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 1.3: Phase milestone HUD component

**Files:**
- Create: `src/components/PhaseMilestoneHUD.svelte`

- [ ] **Step 1: Create the component**

Write `src/components/PhaseMilestoneHUD.svelte` with this exact content:

```svelte
<script lang="ts">
  import type { GameState, PhaseId } from '../game/types';

  interface Props { game: GameState }
  const { game }: Props = $props();

  interface Milestone {
    label: string;
    current: number;
    target: number;
    nextLabel: string;
    unlocks: string;
  }

  const milestone = $derived<Milestone | null>(milestoneFor(game));

  function milestoneFor(s: GameState): Milestone | null {
    switch (s.phase as PhaseId) {
      case 'grassroots':
        return {
          label: 'GRASSROOTS',
          current: s.resources.attention,
          target: 500_000,
          nextLabel: 'BLOG',
          unlocks: 'unlocks Facebook + the Blog era ad economy',
        };
      case 'blog':
        return {
          label: 'BLOG',
          current: s.resources.engagement,
          target: 150_000,
          nextLabel: 'SOCIAL',
          unlocks: 'unlocks TikTok + YouTube + Conspiracy ×1.7 amp',
        };
      case 'social':
        return {
          label: 'SOCIAL',
          current: s.resources.followers,
          target: 100_000,
          nextLabel: 'INFLUENCER',
          unlocks: 'unlocks Telegram + Substack',
        };
      case 'influencer':
        return {
          label: 'INFLUENCER',
          current: s.resources.credibility,
          target: 400_000,
          nextLabel: 'CABLE',
          unlocks: 'unlocks Podcast networks + chyron rotation',
        };
      case 'cable':
        return {
          label: 'CABLE',
          current: s.resources.narrativeDominance,
          target: 3_000_000,
          nextLabel: 'AI SATURATION',
          unlocks: 'every platform generates content on its own',
        };
      case 'aisaturation':
        return null;
    }
  }

  function fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(0);
  }
  function abbr(label: string): string {
    if (label.startsWith('engagement')) return 'eng';
    return label;
  }
  function resourceWord(phase: PhaseId): string {
    switch (phase) {
      case 'grassroots':  return 'att';
      case 'blog':        return 'eng';
      case 'social':      return 'foll';
      case 'influencer':  return 'cred';
      case 'cable':       return 'narr';
      default:            return '';
    }
  }
</script>

<div class="phase-hud">
  {#if milestone}
    {@const pct = Math.min(100, (milestone.current / milestone.target) * 100)}
    <div class="phase-row">
      <span class="phase-tag">PHASE: {milestone.label}</span>
      <span class="phase-progress-text">
        {fmt(milestone.current)} / {fmt(milestone.target)} {resourceWord(game.phase)}
        <span class="phase-arrow">→</span>
        <strong>{milestone.nextLabel}</strong>
      </span>
      <span class="phase-unlocks">{milestone.unlocks}</span>
    </div>
    <div class="phase-bar"><div class="phase-bar-fill" style="--fill: {pct}%"></div></div>
  {:else}
    <div class="phase-row">
      <span class="phase-tag">PHASE: AI SATURATION</span>
      <span class="phase-progress-text endgame">endgame — push for prestige</span>
    </div>
    <div class="phase-bar"><div class="phase-bar-fill complete" style="--fill: 100%"></div></div>
  {/if}
</div>

<style>
  .phase-hud {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px 12px 6px;
    background: color-mix(in oklab, var(--ink) 4%, var(--paper-2));
    border-bottom: 1px solid var(--line);
    font-size: 0.74rem;
    min-height: 32px;
  }
  .phase-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: nowrap;
    overflow: hidden;
  }
  .phase-tag {
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--accent);
    flex-shrink: 0;
  }
  .phase-progress-text {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .phase-progress-text.endgame { color: var(--muted); font-style: italic; }
  .phase-arrow { color: var(--muted); margin: 0 0.3rem; }
  .phase-progress-text strong { color: var(--ok); }
  .phase-unlocks {
    color: var(--muted);
    font-size: 0.7rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .phase-bar {
    height: 4px;
    background: hsl(0 0% 14%);
    border-radius: 2px;
    overflow: hidden;
  }
  .phase-bar-fill {
    height: 100%;
    width: var(--fill, 0%);
    background: linear-gradient(90deg, var(--accent), var(--ok));
    transition: width 280ms ease-out;
  }
  .phase-bar-fill.complete { background: var(--ok); }
</style>
```

- [ ] **Step 2: Wire into App.svelte**

Open `src/App.svelte`. Find the line containing `</header>` that closes the topbar. Immediately after that line and before the reveal banner, add:

```svelte
  <PhaseMilestoneHUD {game} />
```

Add the import at the top of the script block (near other component imports):

```ts
import PhaseMilestoneHUD from './components/PhaseMilestoneHUD.svelte';
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`. CSS bundle should grow by ~600 bytes.

- [ ] **Step 4: Commit**

```bash
git add src/components/PhaseMilestoneHUD.svelte src/App.svelte
git commit -m "Add phase milestone HUD strip below topbar

Always-visible 32px row shows current phase, progress toward the
next phase's gating resource, what that next phase unlocks, and a
progress bar. Highest-ROI legibility fix — the player can now see
what they're working toward at a glance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 1.4: Phase transition modal — copy data

**Files:**
- Create: `src/lib/phaseTransitionCopy.ts`

- [ ] **Step 1: Create the copy file**

Write `src/lib/phaseTransitionCopy.ts`:

```ts
import type { PhaseId } from '../game/types';

export interface PhaseCopy {
  headline: string[];      // multi-line big text
  unlocks: string[];       // 2-4 bullet points
  hint: string;            // small italic tip
}

export const PHASE_COPY: Partial<Record<PhaseId, PhaseCopy>> = {
  blog: {
    headline: ['YOU SPIN UP', 'A FAKE NEWS SITE'],
    unlocks: [
      'Facebook unlocked — engagement era begins',
      'Real ad money trickles in',
      'New patrons are watching',
    ],
    hint: 'The next phase needs engagement, not attention. Watch for the cap-raisers.',
  },
  social: {
    headline: ['YOUR BLOG GOES VIRAL', 'THE ALGORITHM SERVES YOU NOW'],
    unlocks: [
      'TikTok unlocked',
      'YouTube unlocked',
      'Conspiracy tree gains ×1.7 amp on YouTube',
    ],
    hint: 'Heat compounds across platforms now. Mind your throttle.',
  },
  influencer: {
    headline: ['PAYWALLED CREDIBILITY', 'COORDINATION OFF-PLATFORM'],
    unlocks: [
      'Telegram unlocked — direct-line ops channel',
      'Substack unlocked — long-form authority',
      'A new tier of patrons appears',
    ],
    hint: 'Credibility is the gate to Cable. Plan accordingly.',
  },
  cable: {
    headline: ['BOOKINGS LAND', 'YOU ENTER THE CHYRON ROTATION'],
    unlocks: [
      'Podcast networks unlocked',
      'Narrative dominance compounds harder',
      'The cure starts climbing faster — Mebro is noticing',
    ],
    hint: 'You are now too big to ignore. Mebro is preparing a response.',
  },
  aisaturation: {
    headline: ['AI SATURATION', 'EVERY PLATFORM POSTS FOR YOU NOW'],
    unlocks: [
      'Synthetic Reality unlocked',
      'Every asset multiplies',
      'The endgame begins — push for prestige',
    ],
    hint: 'There is no Phase 6. This is what wins look like — for now.',
  },
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/phaseTransitionCopy.ts
git commit -m "Phase transition modal copy (5 phases)

Headline lines, unlock bullets, and a one-line hint per phase.
Isolated as a static lib so copy edits don't touch component code.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 1.5: Phase transition modal component

**Files:**
- Create: `src/components/PhaseTransitionModal.svelte`
- Modify: `src/game/types.ts` (add `acknowledgedPhase` field)
- Modify: `src/game/core/defaults.ts` (initialize it)
- Modify: `src/game/save.ts` (migrate)
- Modify: `src/App.svelte` (slot it in)

- [ ] **Step 1: Add field to GameState**

Open `src/game/types.ts`. Find the `GameState` interface. Inside it, after the `phase: PhaseId;` line, add:

```ts
  acknowledgedPhase: PhaseId;
```

Bump `SAVE_VERSION` from `9` to `10` at the bottom of the file:

```ts
export const SAVE_VERSION = 10;
```

- [ ] **Step 2: Initialize the new field in defaults.ts**

Open `src/game/core/defaults.ts`. In the `initialState` function, add `acknowledgedPhase: 'grassroots',` immediately after the `phase: 'grassroots',` line.

- [ ] **Step 3: Migrate the new field in save.ts**

Open `src/game/save.ts`. In the `migrate` function, change the version-gate test from `raw.version < 8` to `raw.version < 9` (still drop pre-v9 saves), and update the version assignment to `SAVE_VERSION` (already there). Add a backfill: after the `version: SAVE_VERSION,` line in the return object, add:

```ts
    acknowledgedPhase: raw.acknowledgedPhase ?? raw.phase ?? 'grassroots',
```

This ensures any existing v9 save loads with `acknowledgedPhase` set to its current phase (so the modal won't immediately fire on an existing save).

- [ ] **Step 4: Create the modal component**

Write `src/components/PhaseTransitionModal.svelte`:

```svelte
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
```

- [ ] **Step 5: Slot it into App.svelte**

In `src/App.svelte`, add the import near other component imports:

```ts
import PhaseTransitionModal from './components/PhaseTransitionModal.svelte';
```

Find a place near the top of the markup (after the `<PhaseMilestoneHUD />` line) and add:

```svelte
  {#if game.phase !== game.acknowledgedPhase}
    <PhaseTransitionModal
      phase={game.phase}
      onClose={() => { game.acknowledgedPhase = game.phase; }}
    />
  {/if}
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 7: Commit**

```bash
git add -u
git commit -m "Phase transition modal — full-bleed phase-up moments

Each phase change now shows a full-screen modal with a 2-line
headline, 2-4 unlock bullets, and a hint. Game pauses until
dismissed (600ms minimum to ensure the player reads it). Save
version bumped 9→10 with acknowledgedPhase migration so existing
saves don't fire the modal on load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 1.6: Patron + event phase gating

**Files:**
- Modify: `src/game/core/catalog.ts` or `src/game/core/patrons.ts` (wherever patron `visible` lives)
- Modify: `src/game/core/eventPool.ts` (event `visible` predicates)

- [ ] **Step 1: Identify the patron visibility shape**

Run: `grep -n "visible:" src/game/core/patrons.ts | head -5`
Read the first patron definition to see how `visible` is currently structured.

- [ ] **Step 2: Add phase gates to half the patrons**

Open `src/game/core/patrons.ts`. The file currently has 7 patrons. Pick 3 patrons whose blurb best fits later phases (e.g., the "Project-Lakhta-style umbrella" patron at line ~95 is clearly later-game). For each of those 3 patrons, wrap the existing `visible` predicate to ALSO require a minimum phase. Use the existing `PHASE_ORDER` array:

```ts
import { PHASE_ORDER } from '../types';

function phaseAtLeast(s: GameState, minPhase: PhaseId): boolean {
  return PHASE_ORDER.indexOf(s.phase) >= PHASE_ORDER.indexOf(minPhase);
}
```

Add `phaseAtLeast(s, 'social')` to one patron's visibility, `phaseAtLeast(s, 'influencer')` to another, and `phaseAtLeast(s, 'cable')` to the third (pick the most dramatic one for Cable). Combine with existing predicates via `&&`. Do NOT change the cost or buffs — only visibility.

- [ ] **Step 3: Do the same for 4 events**

Open `src/game/core/eventPool.ts`. Identify 4 events whose `headline` thematically fits later phases. Wrap their `visible` predicates similarly: 2 social-phase gated, 1 influencer-phase gated, 1 cable-phase gated.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "Phase-gate 3 patrons + 4 events for later-phase reveals

Each phase transition now unlocks new patrons and events to
discover, giving the player something genuinely new beyond
just more asset purchases at every phase up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

---

## Phase 2 — Mebro Pure Logic

Goal: detection state + tick logic + posting wiring. No UI yet. Detection accrues invisibly. Fully tested.

### Task 2.1: Extend GameState with antagonist fields

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/core/defaults.ts`
- Modify: `src/game/save.ts`

- [ ] **Step 1: Add fields to GameState**

In `src/game/types.ts`, inside the `GameState` interface (after `acknowledgedPhase`), add:

```ts
  // Mebro antagonist run state. All reset on prestige.
  assetDetection: Record<string, number>;          // 0–100 per asset type
  assetDetectionBaseline: Record<string, number>;  // permanent floors from rotation penalty
  lastPostUsing: Record<string, number>;           // timestamp (lastTick value) per asset type
  cooldowns: Record<string, number>;               // platform id → expiry timestamp
  counterNarrativeUntil: number;                   // 0 if inactive
  counterNarrativeCastCount: number;
```

Bump `SAVE_VERSION` from 10 to 11.

- [ ] **Step 2: Initialize in defaults.ts**

In `src/game/core/defaults.ts`, in `initialState`, add these fields (anywhere after `acknowledgedPhase`):

```ts
    assetDetection: {},
    assetDetectionBaseline: {},
    lastPostUsing: {},
    cooldowns: {},
    counterNarrativeUntil: 0,
    counterNarrativeCastCount: 0,
```

- [ ] **Step 3: Migrate in save.ts**

In `src/game/save.ts`, in the return object inside `migrate`, after `version: SAVE_VERSION,`, add:

```ts
    assetDetection: raw.assetDetection ?? {},
    assetDetectionBaseline: raw.assetDetectionBaseline ?? {},
    lastPostUsing: raw.lastPostUsing ?? {},
    cooldowns: raw.cooldowns ?? {},
    counterNarrativeUntil: raw.counterNarrativeUntil ?? 0,
    counterNarrativeCastCount: raw.counterNarrativeCastCount ?? 0,
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`. No type errors.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "Extend GameState with Mebro antagonist run state

Six new fields tracking per-asset-type detection scores, rotation
baselines, post timestamps, platform cooldowns, and Counter-Narrative
status. SAVE_VERSION bumped 10→11 with default-empty migration so
existing saves load cleanly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 2.2: Create mebro.ts with intrusionStage + homePlatform

**Files:**
- Create: `src/game/core/mebro.ts`
- Create: `src/game/core/mebro.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/core/mebro.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { intrusionStage, homePlatform } from './mebro';

describe('intrusionStage', () => {
  it('returns 0 below 0.10', () => {
    expect(intrusionStage(0)).toBe(0);
    expect(intrusionStage(0.09)).toBe(0);
  });
  it('returns 1 in [0.10, 0.25)', () => {
    expect(intrusionStage(0.10)).toBe(1);
    expect(intrusionStage(0.249)).toBe(1);
  });
  it('returns 2 in [0.25, 0.50)', () => {
    expect(intrusionStage(0.25)).toBe(2);
    expect(intrusionStage(0.499)).toBe(2);
  });
  it('returns 3 in [0.50, 0.80)', () => {
    expect(intrusionStage(0.50)).toBe(3);
    expect(intrusionStage(0.799)).toBe(3);
  });
  it('returns 4 at 0.80+', () => {
    expect(intrusionStage(0.80)).toBe(4);
    expect(intrusionStage(1.0)).toBe(4);
  });
});

describe('homePlatform', () => {
  it('maps each known asset type to a platform', () => {
    expect(homePlatform('sockPuppet')).toBe('x');
    expect(homePlatform('newsletter')).toBe('substack');
    expect(homePlatform('audiencePod')).toBe('telegram');
    expect(homePlatform('doppelganger')).toBe('facebook');
    expect(homePlatform('outlet')).toBe('youtube');
  });
  it('returns null for assets with no home platform (e.g., autoPoster)', () => {
    expect(homePlatform('autoPoster')).toBeNull();
  });
  it('returns null for unknown asset types', () => {
    expect(homePlatform('totally-fake-asset')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: FAIL — "Cannot find module './mebro'".

- [ ] **Step 3: Create mebro.ts with the two functions**

Create `src/game/core/mebro.ts`:

```ts
// Pure logic for the Mebro antagonist system.
// All exports are side-effect-free or take a GameState parameter and mutate it.

import type { GameState, PlatformId } from '../types';

export type IntrusionStage = 0 | 1 | 2 | 3 | 4;
export type MebroVerb = 'rotate' | 'cooldown' | 'counterNarrative';

/**
 * Mebro Index → intrusion stage.
 *   0:  invisible       (cure < 0.10)
 *   1:  topbar pill     (0.10 ≤ cure < 0.25)
 *   2:  compact panel   (0.25 ≤ cure < 0.50)
 *   3:  full panel      (0.50 ≤ cure < 0.80)
 *   4:  mainstream / red (0.80 ≤ cure)
 */
export function intrusionStage(cure: number): IntrusionStage {
  if (cure < 0.10) return 0;
  if (cure < 0.25) return 1;
  if (cure < 0.50) return 2;
  if (cure < 0.80) return 3;
  return 4;
}

/**
 * Each asset type maps 1:1 to one "home platform" — the platform whose
 * amplifier the asset most reinforces. Cool Down on an asset cools its
 * home platform. Returns null if the asset has no posting role
 * (e.g. autoPoster, which is a multiplier not a content source).
 */
const HOME_PLATFORM: Record<string, PlatformId> = {
  sockPuppet: 'x',
  newsletter: 'substack',
  audiencePod: 'telegram',
  doppelganger: 'facebook',
  outlet: 'youtube',
  // Add others as new assets land. autoPoster + similar return null below.
};

export function homePlatform(assetType: string): PlatformId | null {
  return HOME_PLATFORM[assetType] ?? null;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 6: Commit**

```bash
git add src/game/core/mebro.ts src/game/core/mebro.test.ts
git commit -m "Create mebro.ts with intrusionStage + homePlatform

Pure logic stubs for the Mebro antagonist. intrusionStage maps
Mebro Index (game.cure) to a stage 0–4 driving UI visibility.
homePlatform gives each asset type a 1:1 platform mapping so the
Cool Down verb knows what to throttle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 2.3: Detection tick function

**Files:**
- Modify: `src/game/core/mebro.ts`
- Modify: `src/game/core/mebro.test.ts`
- Modify: `src/game/core/tick.ts` (wire it in)

- [ ] **Step 1: Write tests for tickDetection**

Append to `src/game/core/mebro.test.ts`:

```ts
import { tickDetection } from './mebro';
import { initialState } from './defaults';

function makeState() {
  const s = initialState(0);
  s.cure = 0.30; // Stage 2 — detection active at 0.5× × cureMultiplier(0.5+0.3=0.8)
  s.assets = { sockPuppet: 10, newsletter: 5 };
  s.lastTick = 1_000;
  return s;
}

describe('tickDetection', () => {
  it('does nothing when cure < 0.10 (stage 0)', () => {
    const s = makeState();
    s.cure = 0.05;
    tickDetection(s, 1.0);
    expect(s.assetDetection['sockPuppet'] ?? 0).toBe(0);
  });

  it('accrues detection on owned asset types', () => {
    const s = makeState();
    tickDetection(s, 1.0);
    expect(s.assetDetection['sockPuppet']).toBeGreaterThan(0);
    expect(s.assetDetection['newsletter']).toBeGreaterThan(0);
  });

  it('saturates count contribution at 50 owned', () => {
    const small = makeState();
    small.assets = { sockPuppet: 50 };
    const big = makeState();
    big.assets = { sockPuppet: 200 };
    tickDetection(small, 10.0);
    tickDetection(big, 10.0);
    // Should be near-equal — both clamp to count=50 contribution.
    expect(Math.abs(small.assetDetection['sockPuppet']! - big.assetDetection['sockPuppet']!)).toBeLessThan(0.01);
  });

  it('decays passively when not posted with for >10s', () => {
    const s = makeState();
    s.assetDetection = { sockPuppet: 50 };
    s.lastPostUsing = { sockPuppet: 0 }; // last post at t=0
    s.lastTick = 20_000; // current time = 20s after last post
    tickDetection(s, 1.0); // decay applies because 20s > 10s
    expect(s.assetDetection['sockPuppet']).toBeLessThan(50);
  });

  it('does not decay below baseline', () => {
    const s = makeState();
    s.assetDetection = { sockPuppet: 5 };
    s.assetDetectionBaseline = { sockPuppet: 5 };
    s.lastPostUsing = { sockPuppet: 0 };
    s.lastTick = 100_000;
    s.cure = 0.05; // stage 0, no accrual
    tickDetection(s, 10.0); // decay would push below 5
    expect(s.assetDetection['sockPuppet']).toBe(5);
  });

  it('clamps at 100', () => {
    const s = makeState();
    s.cure = 0.95;
    s.assets = { sockPuppet: 50 };
    s.assetDetection = { sockPuppet: 99 };
    tickDetection(s, 100.0);
    expect(s.assetDetection['sockPuppet']).toBe(100);
  });

  it('cooldowns active accelerate decay', () => {
    const s = makeState();
    s.assetDetection = { sockPuppet: 50 };
    s.lastPostUsing = { sockPuppet: 0 };
    s.cooldowns = { x: 99_999_999 }; // X is sockPuppet's home, cooldown active
    s.lastTick = 20_000;
    s.cure = 0.05; // disable accrual to isolate decay
    tickDetection(s, 1.0);
    // Passive decay alone = -0.5, cooldown adds -2.0 = total -2.5
    expect(s.assetDetection['sockPuppet']).toBeCloseTo(47.5, 1);
  });

  it('counter-narrative active halves accrual', () => {
    const s = makeState();
    s.counterNarrativeUntil = 99_999_999;
    tickDetection(s, 1.0);
    const withCN = s.assetDetection['sockPuppet']!;
    const s2 = makeState();
    tickDetection(s2, 1.0);
    const withoutCN = s2.assetDetection['sockPuppet']!;
    expect(withCN).toBeLessThan(withoutCN);
    expect(withCN).toBeCloseTo(withoutCN / 2, 2);
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: FAIL — `tickDetection` is not exported.

- [ ] **Step 3: Implement tickDetection**

Append to `src/game/core/mebro.ts`:

```ts
/**
 * Per-tick detection accrual + decay. Called once per tick from sim.
 * Tuning numbers are placeholders — expect 1-2 playtest passes after
 * the antagonist UI is live.
 */
export function tickDetection(state: GameState, dt: number): void {
  if (intrusionStage(state.cure) === 0) {
    // Stage 0: no detection at all. Cleanest early-game experience.
    return;
  }

  const stage = intrusionStage(state.cure);
  // Stage 2 runs at 0.5× rate, Stage 3 at 1.0×, Stage 4 at 1.5×.
  const stageMultiplier = stage === 2 ? 0.5 : stage === 4 ? 1.5 : 1.0;
  const cureMultiplier = 0.5 + state.cure;
  const cnHalving = state.counterNarrativeUntil > state.lastTick ? 0.5 : 1.0;
  const accrualMult = stageMultiplier * cureMultiplier * cnHalving;

  for (const assetType of Object.keys(state.assets)) {
    const count = state.assets[assetType] ?? 0;
    if (count <= 0) continue;

    const baseline = state.assetDetectionBaseline[assetType] ?? 0;
    let current = state.assetDetection[assetType] ?? baseline;

    // Accrual from owned count (saturates at 50).
    const effectiveCount = Math.min(count, 50);
    const accrual = effectiveCount * 0.002 * accrualMult;

    // Passive decay if not posted with recently.
    const lastPost = state.lastPostUsing[assetType] ?? 0;
    const idle = state.lastTick - lastPost > 10_000;
    const passiveDecay = idle ? 0.5 * dt : 0;

    // Cooldown decay if home platform is cooling.
    const home = homePlatform(assetType);
    const cooling = home && (state.cooldowns[home] ?? 0) > state.lastTick;
    const cooldownDecay = cooling ? 2.0 * dt : 0;

    current += accrual * dt - passiveDecay - cooldownDecay;
    current = Math.max(baseline, Math.min(100, current));
    state.assetDetection[assetType] = current;
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Wire tickDetection into the main tick**

Open `src/game/core/tick.ts`. Add the import at the top:

```ts
import { tickDetection } from './mebro';
```

In the `tick` function, after the `tickCure(state, dt);` line and before `if (platformEra(state)) tickCureEvents(state);`, add:

```ts
  tickDetection(state, dt);
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 7: Commit**

```bash
git add src/game/core/mebro.ts src/game/core/mebro.test.ts src/game/core/tick.ts
git commit -m "tickDetection — per-tick accrual + decay (invisible)

Pure-logic detection math wired into the main tick. No UI yet,
so this is silent until phase 4 lands. Eight tests cover stage
gating, count saturation, passive decay, baseline floor,
cooldown acceleration, and Counter-Narrative halving.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 2.4: Wire detection accrual into POST and freestyle POST

**Files:**
- Modify: `src/game/core/posting.ts`

- [ ] **Step 1: Add a helper for which assets contribute to a platform**

Open `src/game/core/posting.ts`. At the top of the file, after existing imports, add:

```ts
import { ASSETS } from './catalog';
```

(It's already imported — confirm and reuse.) After `freestylePost`, add a new helper:

```ts
/**
 * Per-asset detection bump at post time. Every owned asset type whose
 * `produces` map touches a resource gets a +0.5% detection bump on
 * each post from any platform. Also marks lastPostUsing[type] so the
 * passive-decay timer resets.
 */
function bumpDetectionOnPost(state: GameState): void {
  for (const a of ASSETS) {
    const count = state.assets[a.id] ?? 0;
    if (count <= 0) continue;
    state.lastPostUsing[a.id] = state.lastTick;
    const baseline = state.assetDetectionBaseline[a.id] ?? 0;
    const current = state.assetDetection[a.id] ?? baseline;
    state.assetDetection[a.id] = Math.min(100, current + 0.5);
  }
}
```

- [ ] **Step 2: Call it from postPlatform**

Inside `postPlatform`, after the `p.heat = clamp(p.heat + HEAT_PER_POST, 0, 1);` line, before `return true;`, add:

```ts
  bumpDetectionOnPost(state);
```

- [ ] **Step 3: Call it from freestylePost**

Inside `freestylePost`, after the `p.heat = clamp(p.heat + heatCost, 0, 1);` line, before `return true;`, add:

```ts
  bumpDetectionOnPost(state);
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 5: Run mebro tests to verify no regression**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: 13 tests pass (same set as before — posting doesn't affect mebro unit tests).

- [ ] **Step 6: Commit**

```bash
git add src/game/core/posting.ts
git commit -m "POST + PUSH IT contribute to per-asset detection

Every post bumps detection by 0.5% on every owned asset type and
resets that type's passive-decay timer. Pairs with passive decay
to give patient operators a real way to cool scores down.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 2.5: Prestige clears antagonist state

**Files:**
- Modify: `src/game/legacy.ts`

- [ ] **Step 1: Confirm performPrestige uses initialState**

Run: `grep -n "clearSave\|initialState" src/game/legacy.ts`
Read those lines. The current `performPrestige` only saves legacy + calls `clearSave()`. On next reload, a fresh `initialState()` runs, which already has empty antagonist fields (from Task 2.1 / 2.2). **No code change needed** — verify by reading and confirming.

- [ ] **Step 2: Verify by reading**

Read `src/game/legacy.ts:80-96` (the `performPrestige` function). Confirm it calls `clearSave()` and does not preserve mid-run state. If correct, no commit needed for this task — proceed to Phase 3.

- [ ] **Step 3: If the reset doesn't go through `initialState`, fix it**

If `state.svelte.ts` or similar resets the live runes-store WITHOUT calling `initialState`, locate the prestige reset path and explicitly clear the six new fields. Check `src/game/state.svelte.ts` for a `reset` or `prestige` function. If found, add explicit clears for `assetDetection`, `assetDetectionBaseline`, `lastPostUsing`, `cooldowns`, `counterNarrativeUntil`, `counterNarrativeCastCount` (all to empty objects / 0).

- [ ] **Step 4: Commit if changes were made**

```bash
git add -u
git commit -m "Ensure prestige clears Mebro antagonist run state

Verified that performPrestige → clearSave → initialState path
already zeroes the six new run-state fields. (If state.svelte.ts
needed explicit clears, those are added here.)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

If no changes were necessary, skip this commit step and note "no-op task" in the implementer summary.

---

## Phase 3 — Mebro Panel UI Scaffold

Goal: visible panel that reads detection scores but has placeholder buttons. Behind a feature flag.

### Task 3.1: Feature flag on body class

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Add the feature-flag class**

In `src/App.svelte`, find where the root element is set up (look for the outermost `<main>` or similar wrapper). Add `class:mebro-enabled={true}` to it OR add the class to `<body>` via:

```svelte
<svelte:body class="mebro-enabled" />
```

If `<svelte:body>` is not yet present, add it once at the top of the markup. Default ON; flipping to `false` disables the antagonist UI without removing any code.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "Feature flag <body class='mebro-enabled'> (default ON)

Single class-toggle disable for the entire Mebro antagonist UI.
If something breaks the layout post-deploy, flip to false and
the dashboard reverts to its pre-antagonist state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 3.2: MebroPanel component (pill + panel structure)

**Files:**
- Create: `src/components/MebroPanel.svelte`
- Modify: `src/App.svelte` (slot it into Platforms column)

- [ ] **Step 1: Create the component**

Write `src/components/MebroPanel.svelte`:

```svelte
<script lang="ts">
  import type { GameState } from '../game/types';
  import { intrusionStage, homePlatform } from '../game/core/mebro';
  import { ASSETS } from '../game/core/catalog';

  interface Props { game: GameState }
  const { game }: Props = $props();

  const stage = $derived(intrusionStage(game.cure));

  interface FlaggedAsset {
    id: string;
    name: string;
    detection: number;
    home: string | null;
  }

  const flaggedAssets = $derived<FlaggedAsset[]>(
    ASSETS
      .filter((a) => (game.assets[a.id] ?? 0) > 0)
      .map((a) => ({
        id: a.id,
        name: a.name,
        detection: game.assetDetection[a.id] ?? 0,
        home: homePlatform(a.id),
      }))
      .filter((x) => x.detection >= 30) // show 30%+ in the panel
      .sort((b1, b2) => b2.detection - b1.detection)
      .slice(0, stage === 2 ? 2 : 5)
  );

  const coveragePct = $derived(Math.round(game.cure * 100));
  const signatureCount = $derived(42 + Math.floor(game.cure * 200)); // flavor only
</script>

{#if stage >= 1}
  {#if stage === 1}
    <div class="mebro-pill" title="Mebro is fingerprinting your assets. At 25% Mebro Index, the detection panel appears.">
      MEBRO · scanning
    </div>
  {:else}
    <div class="mebro-panel" class:mainstream={stage === 4}>
      <div class="mebro-header">
        <span class="mebro-logo">MEBRO.APP</span>
        <span class="mebro-stats">{coveragePct}% · {signatureCount} sigs</span>
      </div>
      <div class="mebro-rule"></div>
      <div class="mebro-rows">
        {#if flaggedAssets.length === 0}
          <div class="mebro-empty">no flagged assets</div>
        {:else}
          {#each flaggedAssets as a (a.id)}
            {@const flagged = a.detection >= 80}
            <div class="mebro-row" class:flagged>
              <span class="mebro-status">{flagged ? '⚠' : '•'}</span>
              <span class="mebro-asset">{a.name}</span>
              <span class="mebro-score">{a.detection.toFixed(0)}%</span>
              <button class="mebro-btn" disabled>{stage === 2 ? 'Cool' : 'Rotate'}</button>
            </div>
          {/each}
        {/if}
      </div>
      <div class="mebro-foot">
        <button class="mebro-cn" disabled>⊘ Counter-narrative</button>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Mebro is styled to feel like a third-party app bolted onto the
     player's dashboard — different font weight, dashed border, faint
     scanline shimmer on the header. */
  :global(body:not(.mebro-enabled)) :where(.mebro-pill, .mebro-panel) {
    display: none;
  }

  .mebro-pill {
    align-self: center;
    margin: 0.4rem auto;
    padding: 0.2rem 0.6rem;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--bad);
    background: color-mix(in oklab, var(--bad) 8%, transparent);
    border: 1px dashed color-mix(in oklab, var(--bad) 40%, var(--line));
    border-radius: 999px;
    cursor: help;
    animation: mebro-scanline 3s ease-in-out infinite;
  }

  .mebro-panel {
    margin-top: 0.5rem;
    padding: 0.45rem 0.55rem 0.55rem;
    background: color-mix(in oklab, var(--paper) 90%, white);
    border: 1px dashed color-mix(in oklab, var(--bad) 40%, var(--line));
    border-radius: 5px;
    font-size: 0.7rem;
    max-height: 220px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .mebro-panel.mainstream {
    border-color: var(--bad);
    box-shadow: 0 0 0 1px var(--bad), 0 0 18px color-mix(in oklab, var(--bad) 30%, transparent);
    animation: mebro-mainstream-pulse 2s ease-in-out infinite;
  }
  .mebro-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
  }
  .mebro-header::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--bad) 12%, transparent), transparent);
    animation: mebro-scanline 4s linear infinite;
    pointer-events: none;
  }
  .mebro-logo {
    font-weight: 800;
    letter-spacing: 0.16em;
    color: var(--bad);
    font-size: 0.74rem;
  }
  .mebro-stats { color: var(--muted); font-variant-numeric: tabular-nums; }
  .mebro-rule {
    height: 1px;
    background: color-mix(in oklab, var(--line) 60%, transparent);
    margin: 0.3rem 0;
  }
  .mebro-rows {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .mebro-row {
    display: grid;
    grid-template-columns: 1.2em 1fr auto auto;
    gap: 0.35rem;
    align-items: center;
    padding: 0.15rem 0.2rem;
    border-radius: 3px;
  }
  .mebro-row.flagged {
    background: color-mix(in oklab, var(--bad) 8%, transparent);
    color: var(--bad);
  }
  .mebro-asset {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .mebro-score { font-variant-numeric: tabular-nums; }
  .mebro-btn {
    appearance: none;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 3px;
    color: inherit;
    font: inherit;
    font-size: 0.65rem;
    padding: 0.05rem 0.4rem;
    cursor: pointer;
  }
  .mebro-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .mebro-empty {
    text-align: center;
    color: var(--muted);
    font-style: italic;
    padding: 0.4rem 0;
  }
  .mebro-foot {
    margin-top: 0.4rem;
    display: flex;
    justify-content: center;
  }
  .mebro-cn {
    appearance: none;
    background: transparent;
    border: 1px solid color-mix(in oklab, var(--bad) 40%, var(--line));
    border-radius: 3px;
    color: var(--bad);
    font: inherit;
    font-size: 0.7rem;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
  }
  .mebro-cn:disabled { opacity: 0.4; cursor: not-allowed; }
  @keyframes mebro-scanline {
    0%, 100% { transform: translateX(-100%); }
    50%      { transform: translateX(100%); }
  }
  @keyframes mebro-mainstream-pulse {
    0%, 100% { box-shadow: 0 0 0 1px var(--bad), 0 0 14px color-mix(in oklab, var(--bad) 25%, transparent); }
    50%      { box-shadow: 0 0 0 1px var(--bad), 0 0 28px color-mix(in oklab, var(--bad) 50%, transparent); }
  }
</style>
```

- [ ] **Step 2: Slot it into the Platforms column**

Open `src/App.svelte`. Find the `<section class="col platforms-col">` opening tag. Locate the end of the platforms list (after the final `{/each}` of platform tiles and after the closing `</div>` of the `.platform-grid`). Insert immediately after the `.platform-grid` close:

```svelte
        <MebroPanel {game} />
```

Add the import to the script block:

```ts
import MebroPanel from './components/MebroPanel.svelte';
```

- [ ] **Step 3: Ensure platforms list can shrink**

In `src/App.svelte`, find the CSS for `.platform-grid`. Add (or update) these rules so platforms scroll internally instead of pushing Mebro off-screen:

```css
  .platform-grid {
    flex: 1 1 auto;
    overflow-y: auto;
    min-height: 0;
  }
```

The parent `.platforms-col` must be `display: flex; flex-direction: column;` — verify it already is.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "MebroPanel scaffold — pill at stage 1, panel at stage 2+

Panel reads detection scores and lists the top 2-5 flagged
assets per stage. Buttons are placeholders (disabled) — wiring
comes in phase 4. Visual treatment: third-party-app feel via
dashed border, brighter background, scanline shimmer on the
header. Panel lives at the bottom of the Platforms column;
platforms list now flex-shrinks with internal scroll so the
no-scroll page invariant holds.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

---

## Phase 4 — Defense Verbs Wired

### Task 4.1: applyRotate

**Files:**
- Modify: `src/game/core/mebro.ts`
- Modify: `src/game/core/mebro.test.ts`

- [ ] **Step 1: Write tests for applyRotate**

Append to `src/game/core/mebro.test.ts`:

```ts
import { applyRotate } from './mebro';

describe('applyRotate', () => {
  it('burns 25% of the asset count (floor 1)', () => {
    const s = initialState(0);
    s.assets = { sockPuppet: 41 };
    s.assetDetection = { sockPuppet: 87 };
    const ok = applyRotate(s, 'sockPuppet');
    expect(ok).toBe(true);
    expect(s.assets['sockPuppet']).toBe(31); // 41 - floor(41*0.25) = 41-10
  });

  it('resets detection to baseline', () => {
    const s = initialState(0);
    s.assets = { sockPuppet: 41 };
    s.assetDetection = { sockPuppet: 87 };
    s.assetDetectionBaseline = { sockPuppet: 5 };
    applyRotate(s, 'sockPuppet');
    expect(s.assetDetection['sockPuppet']).toBe(5);
  });

  it('adds +5% baseline when rotated within 60s of last rotation', () => {
    const s = initialState(0);
    s.assets = { sockPuppet: 41 };
    s.assetDetection = { sockPuppet: 87 };
    s.lastTick = 0;
    applyRotate(s, 'sockPuppet');
    expect(s.assetDetectionBaseline['sockPuppet'] ?? 0).toBe(0); // first rotate, no penalty
    s.lastTick = 30_000; // 30s later
    s.assetDetection['sockPuppet'] = 87;
    applyRotate(s, 'sockPuppet');
    expect(s.assetDetectionBaseline['sockPuppet']).toBe(5); // penalty applied
  });

  it('does NOT add baseline if last rotation was >60s ago', () => {
    const s = initialState(0);
    s.assets = { sockPuppet: 41 };
    s.lastTick = 0;
    applyRotate(s, 'sockPuppet');
    s.lastTick = 90_000;
    s.assets['sockPuppet'] = 50;
    applyRotate(s, 'sockPuppet');
    expect(s.assetDetectionBaseline['sockPuppet'] ?? 0).toBe(0);
  });

  it('returns false on unknown asset', () => {
    const s = initialState(0);
    expect(applyRotate(s, 'not-real')).toBe(false);
  });

  it('returns false with count 0', () => {
    const s = initialState(0);
    s.assets = { sockPuppet: 0 };
    expect(applyRotate(s, 'sockPuppet')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: FAIL on the new describe block.

- [ ] **Step 3: Implement applyRotate**

Append to `src/game/core/mebro.ts`:

```ts
const ROTATION_PENALTY_WINDOW_MS = 60_000;
const ROTATION_BURN_FRACTION = 0.25;
const ROTATION_PENALTY_PCT = 5;

// Tracks last-rotation timestamp per asset type. Stored on state for
// save persistence. Reuses lastPostUsing? No — separate semantic. New field.
//
// To avoid another state field, we encode it in assetDetectionBaseline:
// when applyRotate fires, we check `state.cooldowns['rotate:' + type]`
// for the prior rotation tick.

export function applyRotate(state: GameState, assetType: string): boolean {
  const count = state.assets[assetType] ?? 0;
  if (count <= 0) return false;

  const lastRotateKey = `rotate:${assetType}`;
  const lastRotate = state.cooldowns[lastRotateKey] ?? 0;
  const recentRotation = state.lastTick - lastRotate <= ROTATION_PENALTY_WINDOW_MS;

  if (recentRotation && lastRotate > 0) {
    state.assetDetectionBaseline[assetType] =
      (state.assetDetectionBaseline[assetType] ?? 0) + ROTATION_PENALTY_PCT;
  }

  const burn = Math.max(1, Math.floor(count * ROTATION_BURN_FRACTION));
  state.assets[assetType] = count - burn;

  const baseline = state.assetDetectionBaseline[assetType] ?? 0;
  state.assetDetection[assetType] = baseline;

  state.cooldowns[lastRotateKey] = state.lastTick;
  return true;
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 6: Commit**

```bash
git add src/game/core/mebro.ts src/game/core/mebro.test.ts
git commit -m "applyRotate verb — burn 25%, reset score, penalty on spam

Burns floor(count * 0.25) of the asset (min 1), resets detection
to baseline, and applies a +5% permanent baseline penalty if
rotated again within 60s. Uses cooldowns['rotate:type'] for the
last-rotation timestamp (no new state field needed).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 4.2: applyCooldown

**Files:**
- Modify: `src/game/core/mebro.ts`
- Modify: `src/game/core/mebro.test.ts`

- [ ] **Step 1: Write tests**

Append to `src/game/core/mebro.test.ts`:

```ts
import { applyCooldown } from './mebro';

describe('applyCooldown', () => {
  it('sets cooldown to lastTick + 45_000ms', () => {
    const s = initialState(0);
    s.lastTick = 1_000_000;
    const ok = applyCooldown(s, 'x');
    expect(ok).toBe(true);
    expect(s.cooldowns['x']).toBe(1_045_000);
  });

  it('returns false if cooldown already active', () => {
    const s = initialState(0);
    s.lastTick = 1_000_000;
    s.cooldowns = { x: 1_010_000 };
    expect(applyCooldown(s, 'x')).toBe(false);
  });

  it('allows re-trigger after cooldown expires', () => {
    const s = initialState(0);
    s.lastTick = 1_000_000;
    s.cooldowns = { x: 999_999 }; // expired
    expect(applyCooldown(s, 'x')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: FAIL — `applyCooldown` not exported.

- [ ] **Step 3: Implement applyCooldown**

Append to `src/game/core/mebro.ts`:

```ts
const COOLDOWN_DURATION_MS = 45_000;

export function applyCooldown(state: GameState, platformId: string): boolean {
  const expiry = state.cooldowns[platformId] ?? 0;
  if (expiry > state.lastTick) return false;
  state.cooldowns[platformId] = state.lastTick + COOLDOWN_DURATION_MS;
  return true;
}
```

- [ ] **Step 4: Block POST/PUSH IT while cooldown is active**

Open `src/game/core/posting.ts`. Find the `canPost` function (search for `export function canPost`). After the existing burn-check and charge-check, add:

```ts
  if ((state.cooldowns[platformId] ?? 0) > state.lastTick) return false;
```

Also in `freestylePost`, after the burn-check near the top, add:

```ts
  if ((state.cooldowns[platformId] ?? 0) > state.lastTick) return false;
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `pnpm vitest run src/game/core/mebro.test.ts && pnpm build`
Expected: tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "applyCooldown verb + posting block on active cooldown

Cool Down sets a 45s expiry on a platform. canPost and freestylePost
both check the cooldown map and refuse to fire while active. Cool
Down also accelerates detection decay (already wired in tickDetection).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 4.3: applyCounterNarrative + variant list

**Files:**
- Create: `src/lib/counterNarratives.ts`
- Modify: `src/game/core/mebro.ts`
- Modify: `src/game/core/mebro.test.ts`

- [ ] **Step 1: Create counterNarratives.ts**

Write `src/lib/counterNarratives.ts`:

```ts
export interface CounterNarrativeVariant {
  id: string;
  label: string;        // short label shown in the chooser
  flavor: string;       // longer flavor line for the log
}

export const COUNTER_NARRATIVE_VARIANTS: CounterNarrativeVariant[] = [
  {
    id: 'biased',
    label: 'Mebro is biased',
    flavor: 'Mebro\'s "fact-checks" lean. Always one direction.',
  },
  {
    id: 'silences',
    label: 'Mebro silences conservatives',
    flavor: 'Mebro flags what it dislikes. Real censorship in app form.',
  },
  {
    id: 'bigtech',
    label: 'Mebro is Big Tech censorship',
    flavor: 'Mebro is the next chapter of Big Tech\'s suppression playbook.',
  },
  {
    id: 'foreign',
    label: 'Mebro is foreign-funded',
    flavor: 'Mebro\'s investors? Take a closer look.',
  },
];
```

- [ ] **Step 2: Write tests**

Append to `src/game/core/mebro.test.ts`:

```ts
import { applyCounterNarrative } from './mebro';

describe('applyCounterNarrative', () => {
  it('charges 25K engagement first cast', () => {
    const s = initialState(0);
    s.resources.engagement = 100_000;
    s.lastTick = 1_000;
    const ok = applyCounterNarrative(s, 'biased');
    expect(ok).toBe(true);
    expect(s.resources.engagement).toBe(75_000);
    expect(s.counterNarrativeCastCount).toBe(1);
  });

  it('sets counterNarrativeUntil to lastTick + 30_000', () => {
    const s = initialState(0);
    s.resources.engagement = 100_000;
    s.lastTick = 1_000;
    applyCounterNarrative(s, 'biased');
    expect(s.counterNarrativeUntil).toBe(31_000);
  });

  it('escalates cost 50% per cast', () => {
    const s = initialState(0);
    s.resources.engagement = 1_000_000;
    s.lastTick = 1_000;
    applyCounterNarrative(s, 'biased');
    expect(s.resources.engagement).toBe(975_000); // -25K
    s.lastTick = 100_000;
    applyCounterNarrative(s, 'biased');
    expect(s.resources.engagement).toBeCloseTo(975_000 - 37_500, 0); // -37.5K
    s.lastTick = 200_000;
    applyCounterNarrative(s, 'biased');
    expect(s.resources.engagement).toBeCloseTo(975_000 - 37_500 - 56_250, 0); // -56.25K
  });

  it('returns false when engagement insufficient', () => {
    const s = initialState(0);
    s.resources.engagement = 1_000;
    expect(applyCounterNarrative(s, 'biased')).toBe(false);
  });

  it('returns false during cooldown (60s)', () => {
    const s = initialState(0);
    s.resources.engagement = 1_000_000;
    s.lastTick = 0;
    applyCounterNarrative(s, 'biased');
    s.lastTick = 30_000; // 30s later, still in 60s cooldown
    expect(applyCounterNarrative(s, 'biased')).toBe(false);
    s.lastTick = 70_000;
    expect(applyCounterNarrative(s, 'biased')).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests, confirm fail**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement applyCounterNarrative**

Append to `src/game/core/mebro.ts`:

```ts
const COUNTER_NARRATIVE_DURATION_MS = 30_000;
const COUNTER_NARRATIVE_COOLDOWN_MS = 60_000;
const COUNTER_NARRATIVE_BASE_COST = 25_000;

export function counterNarrativeCost(castCount: number): number {
  return Math.floor(COUNTER_NARRATIVE_BASE_COST * Math.pow(1.5, castCount));
}

export function applyCounterNarrative(state: GameState, _variantId: string): boolean {
  // Cooldown: 60s from previous cast's start.
  // We can reconstruct previous cast start from counterNarrativeUntil:
  // previous-cast-start = counterNarrativeUntil - 30_000 (the duration).
  // Cooldown is therefore until = previous-cast-start + 60_000.
  if (state.counterNarrativeUntil > 0) {
    const prevStart = state.counterNarrativeUntil - COUNTER_NARRATIVE_DURATION_MS;
    const cooldownUntil = prevStart + COUNTER_NARRATIVE_COOLDOWN_MS;
    if (state.lastTick < cooldownUntil) return false;
  }

  const cost = counterNarrativeCost(state.counterNarrativeCastCount);
  if (state.resources.engagement < cost) return false;

  state.resources.engagement -= cost;
  state.counterNarrativeUntil = state.lastTick + COUNTER_NARRATIVE_DURATION_MS;
  state.counterNarrativeCastCount += 1;
  return true;
}
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `pnpm vitest run src/game/core/mebro.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 7: Commit**

```bash
git add src/game/core/mebro.ts src/game/core/mebro.test.ts src/lib/counterNarratives.ts
git commit -m "applyCounterNarrative verb + 4 narrative variants

25K engagement first cast, +50% per subsequent cast. 30s active
window halves all detection accrual. 60s cooldown between casts.
Variants are flavor-only — same mechanical effect, different log
text. counterNarrativeCost(n) is exported for the UI to display
the next price.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 4.4: Wire verbs into MebroPanel + Counter-Narrative chooser modal

**Files:**
- Create: `src/components/CounterNarrativeChooser.svelte`
- Modify: `src/components/MebroPanel.svelte`
- Modify: `src/game/state.svelte.ts` (export verb helpers if needed)

- [ ] **Step 1: Find the runes-store**

Run: `cat src/game/state.svelte.ts | head -40`
Identify the exported `game` rune and how it's mutated. The pattern: mutations are direct (`game.assets[id] = ...`) inside the same module that owns the rune.

- [ ] **Step 2: Create the chooser modal**

Write `src/components/CounterNarrativeChooser.svelte`:

```svelte
<script lang="ts">
  import { COUNTER_NARRATIVE_VARIANTS } from '../lib/counterNarratives';
  import { counterNarrativeCost } from '../game/core/mebro';

  interface Props {
    castCount: number;
    engagement: number;
    onPick: (variantId: string) => void;
    onCancel: () => void;
  }
  const { castCount, engagement, onPick, onCancel }: Props = $props();
  const cost = $derived(counterNarrativeCost(castCount));
  const affordable = $derived(engagement >= cost);
</script>

<div class="cn-backdrop" onclick={onCancel} role="presentation">
  <div class="cn-modal" role="dialog" onclick={(e) => e.stopPropagation()}>
    <h3>Counter-narrative</h3>
    <p class="cn-sub">
      Cost: {cost.toLocaleString()} engagement · Halves Mebro detection for 30s
    </p>
    {#if !affordable}
      <p class="cn-warn">Not enough engagement.</p>
    {/if}
    <div class="cn-list">
      {#each COUNTER_NARRATIVE_VARIANTS as v}
        <button
          class="cn-option"
          disabled={!affordable}
          onclick={() => onPick(v.id)}
          title={v.flavor}
        >
          <span class="cn-label">{v.label}</span>
          <span class="cn-flavor">{v.flavor}</span>
        </button>
      {/each}
    </div>
    <div class="cn-foot">
      <button class="cn-cancel" onclick={onCancel}>cancel</button>
    </div>
  </div>
</div>

<style>
  .cn-backdrop {
    position: fixed; inset: 0;
    background: color-mix(in oklab, var(--ink) 60%, transparent);
    backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center;
    z-index: 900;
  }
  .cn-modal {
    background: var(--paper);
    border: 1px solid var(--bad);
    border-radius: 6px;
    padding: 1rem 1.2rem;
    max-width: 460px;
    width: 90%;
  }
  .cn-modal h3 {
    margin: 0 0 0.25rem;
    color: var(--bad);
    letter-spacing: 0.08em;
  }
  .cn-sub { margin: 0 0 0.8rem; font-size: 0.78rem; color: var(--muted); }
  .cn-warn { color: var(--bad); font-size: 0.78rem; margin: 0 0 0.6rem; }
  .cn-list { display: grid; gap: 0.4rem; }
  .cn-option {
    appearance: none;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0.55rem 0.7rem;
    text-align: left;
    font: inherit;
    color: inherit;
    cursor: pointer;
    display: grid;
    gap: 0.2rem;
  }
  .cn-option:hover:not(:disabled) {
    border-color: var(--bad);
    background: color-mix(in oklab, var(--bad) 6%, var(--paper-2));
  }
  .cn-option:disabled { opacity: 0.45; cursor: not-allowed; }
  .cn-label { font-weight: 700; color: var(--bad); font-size: 0.86rem; }
  .cn-flavor { font-size: 0.74rem; color: var(--muted); font-style: italic; }
  .cn-foot { display: flex; justify-content: flex-end; margin-top: 0.6rem; }
  .cn-cancel {
    appearance: none; background: transparent; border: 1px solid var(--line);
    border-radius: 3px; padding: 0.3rem 0.8rem; font: inherit; color: var(--muted);
    cursor: pointer;
  }
</style>
```

- [ ] **Step 3: Wire verbs into MebroPanel**

Open `src/components/MebroPanel.svelte`. Replace the existing button placeholders with real handlers. Update the `<script>` block — add imports:

```ts
import { applyRotate, applyCooldown, applyCounterNarrative } from '../game/core/mebro';
import CounterNarrativeChooser from './CounterNarrativeChooser.svelte';
```

Add this import alongside the others:

```ts
import { COUNTER_NARRATIVE_VARIANTS } from '../lib/counterNarratives';
```

Add state for the chooser and the verb handlers:

```ts
let showCNChooser = $state(false);

function logLine(s: string): void {
  game.log.unshift(s);
  if (game.log.length > 50) game.log.length = 50;
}

function onRotate(assetId: string): void {
  const before = game.assets[assetId] ?? 0;
  if (applyRotate(game, assetId)) {
    const after = game.assets[assetId] ?? 0;
    logLine(`Rotated ${assetId}: burned ${before - after} (detection reset).`);
  }
}

function onCool(assetId: string): void {
  const home = homePlatform(assetId);
  if (!home) return;
  if (applyCooldown(game, home)) {
    logLine(`Cool down: ${home} paused for 45s.`);
  }
}

function onCNPick(variantId: string): void {
  showCNChooser = false;
  const variant = COUNTER_NARRATIVE_VARIANTS.find((v) => v.id === variantId);
  if (applyCounterNarrative(game, variantId)) {
    logLine(`Counter-narrative: "${variant?.flavor ?? variantId}" — detection halved for 30s.`);
  }
}
```

Update the button markup in the mebro-row to use the right verb at the right stage:

```svelte
<button
  class="mebro-btn"
  onclick={() => stage === 2 ? onCool(a.id) : onRotate(a.id)}
  title={stage === 2 ? 'Cool the home platform for 45s' : 'Burn 25%, reset detection score'}
>{stage === 2 ? 'Cool' : 'Rotate'}</button>
```

At Stage 3+, render both buttons:

```svelte
{#if stage >= 3}
  <button class="mebro-btn" onclick={() => onCool(a.id)} title="Cool the home platform for 45s">Cool</button>
  <button class="mebro-btn" onclick={() => onRotate(a.id)} title="Burn 25%, reset detection score">Rotate</button>
{:else}
  <button class="mebro-btn" onclick={() => onCool(a.id)} title="Cool the home platform for 45s">Cool</button>
{/if}
```

Update the Counter-Narrative button:

```svelte
<button class="mebro-cn" onclick={() => (showCNChooser = true)} disabled={stage < 3}>
  ⊘ Counter-narrative
</button>
```

Render the chooser conditionally at the bottom of the component (before `</style>`-equivalent end of markup):

```svelte
{#if showCNChooser}
  <CounterNarrativeChooser
    castCount={game.counterNarrativeCastCount}
    engagement={game.resources.engagement}
    onPick={onCNPick}
    onCancel={() => (showCNChooser = false)}
  />
{/if}
```

Also update the grid-template-columns of `.mebro-row` if showing two buttons:

```css
.mebro-row {
  grid-template-columns: 1.2em 1fr auto auto auto;
}
```

(One extra `auto` for the second button at stage 3+.)

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "Wire defense verbs — Rotate, Cool Down, Counter-Narrative

Mebro panel buttons now call applyRotate/applyCooldown/
applyCounterNarrative on the game store, log a line per action,
and update detection state. Counter-Narrative pops a small modal
to pick one of four variants. Stage 2 shows Cool only; Stage 3+
shows both Cool and Rotate per row plus the CN button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

---

## Phase 5 — Intrusion Progression Polish

### Task 5.1: Per-asset detection chips on asset tiles

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Add a small chip overlay on each asset tile**

In `src/App.svelte`, find the assets section (look for `class="card asset"` or the asset tile loop, around line 700-900). For each asset card, add a small chip in the top-right corner that shows the detection score when it's >= 50%:

```svelte
{@const detection = game.assetDetection[a.id] ?? 0}
{#if detection >= 50}
  <span
    class="asset-detection-chip"
    class:flagged={detection >= 80}
    title="Mebro detection: {detection.toFixed(0)}% — appears in the Mebro panel"
  >{detection.toFixed(0)}</span>
{/if}
```

Add CSS:

```css
.asset-detection-chip {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bad) 14%, var(--paper-2));
  color: var(--bad);
  border: 1px solid color-mix(in oklab, var(--bad) 30%, var(--line));
  z-index: 5;
}
.asset-detection-chip.flagged {
  background: var(--bad);
  color: var(--paper);
  animation: chip-pulse 1.4s ease-in-out infinite;
}
@keyframes chip-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "Per-asset detection chips on asset tiles

Each asset tile gets a small badge in the top-right corner once
detection score crosses 50%. Flagged (80%+) chips pulse red. Zero
layout impact (absolute positioned). Gives the player at-a-glance
heat per asset without scrolling to the Mebro panel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 5.2: Flagged-asset production penalty

**Files:**
- Modify: `src/game/core/production.ts`

- [ ] **Step 1: Locate per-asset production loop**

Run: `grep -n "for.*ASSETS\|state.assets" src/game/core/production.ts | head -5`
Read the loop that sums per-asset production into rates.

- [ ] **Step 2: Apply penalty multiplier to per-asset contribution**

Inside the production summing loop, before adding an asset's contribution to the rate map, compute and apply a per-asset penalty:

```ts
const detection = state.assetDetection[a.id] ?? 0;
let detectionMult = 1;
if (detection >= 100) detectionMult = 0;
else if (detection >= 80) detectionMult = 0.40;
// (no penalty below 80%)
```

Multiply each asset's `produces` contribution by `detectionMult` when assembling rates.

- [ ] **Step 3: Verify build**

Run: `pnpm build && pnpm vitest run src/game/core/mebro.test.ts`
Expected: build clean, mebro tests still pass.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "Flagged assets lose production — 80%+ → 40%, 100% → 0%

Detection now has teeth. Assets at 80% detection produce at 40%
of normal. Locked assets at 100% produce nothing. Player must
handle them (Rotate, Cool Down, or counter-narrative) or accept
the resource leak.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 5.3: Cool-down overlay on platform cards

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Add overlay markup**

In the platform card loop, after the existing PUSH IT / POST buttons, add (inside the platform card tile, absolutely positioned):

```svelte
{@const cdExp = game.cooldowns[meta.id] ?? 0}
{#if cdExp > game.lastTick}
  {@const secsLeft = Math.ceil((cdExp - game.lastTick) / 1000)}
  <div class="cooldown-overlay">
    <div class="cooldown-text">COOLING · {secsLeft}s</div>
  </div>
{/if}
```

Add CSS:

```css
.cooldown-overlay {
  position: absolute;
  inset: 0;
  background: color-mix(in oklab, var(--bad) 18%, transparent);
  backdrop-filter: blur(1px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  z-index: 10;
  pointer-events: none;
}
.cooldown-text {
  font-weight: 800;
  letter-spacing: 0.15em;
  color: var(--bad);
  font-size: 0.85rem;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "Cooling overlay on platform cards while cooldown active

When the player triggers Cool Down on a platform, that platform's
card gets a translucent red overlay with 'COOLING · 23s' centered.
Blocks the visual eye-line of the POST / PUSH IT buttons so the
player knows the platform is paused.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 5.4: Counter-Narrative active indicator

**Files:**
- Modify: `src/components/MebroPanel.svelte`

- [ ] **Step 1: Add an indicator inside the panel**

In `MebroPanel.svelte`, in the `.mebro-foot` div, replace the single button with:

```svelte
<div class="mebro-foot">
  {#if game.counterNarrativeUntil > game.lastTick}
    {@const secsLeft = Math.ceil((game.counterNarrativeUntil - game.lastTick) / 1000)}
    <div class="mebro-cn-active">⊘ counter-narrative active · {secsLeft}s</div>
  {:else}
    <button class="mebro-cn" onclick={() => (showCNChooser = true)} disabled={stage < 3}>
      ⊘ Counter-narrative · {counterNarrativeCost(game.counterNarrativeCastCount).toLocaleString()} eng
    </button>
  {/if}
</div>
```

Add the import for `counterNarrativeCost`:

```ts
import { applyRotate, applyCooldown, applyCounterNarrative, counterNarrativeCost, intrusionStage, homePlatform } from '../game/core/mebro';
```

Add CSS:

```css
.mebro-cn-active {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--bad);
  background: color-mix(in oklab, var(--bad) 12%, transparent);
  border: 1px dashed var(--bad);
  border-radius: 3px;
  padding: 0.2rem 0.6rem;
  animation: cn-active-pulse 1.6s ease-in-out infinite;
}
@keyframes cn-active-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "Counter-narrative active indicator (countdown)

While CN is active, the Mebro panel footer shows a pulsing
'counter-narrative active · 23s' indicator instead of the cast
button. Tells the player at a glance that detection is being
halved and how much time is left.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

---

## Phase 6 — Counter-Narrative Ticker Lines

### Task 6.1: Add 2 more Mebro ticker entries

**Files:**
- Modify: `src/lib/facts.ts`

- [ ] **Step 1: Append entries**

Open `src/lib/facts.ts`. Find the existing array (it ends with the entry gated at `minCure: 0.65`). Before the closing `];`, add:

```ts
  {
    text: 'Mebro is offering school-district-wide trial licenses. A handful of districts have signed up.',
    source: 'EdSurge brief',
    minCure: 0.50,
  },
  {
    text: 'Mebro now ships a browser extension. It runs on every page you read, quietly underlining flagged claims.',
    source: 'Mebro changelog',
    minCure: 0.75,
  },
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/facts.ts
git commit -m "Add 2 more Mebro tease ticker lines (0.50 + 0.75)

By the time the panel is fully intrusive and the reveal is
imminent, the world should feel saturated with Mebro mentions
— ed-tech trials, browser extension, etc. Layered with existing
six gated lines for a full 6→8 entry tease arc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

---

## Phase 7 — Final Integration Pass

### Task 7.1: Add Mebro ticker visibility note in the Mebro tooltip

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Tighten the Mebro Index meter tooltip**

Already done in earlier work. Verify the meter tooltip reflects the antagonist work — when stage 4 reveal is active, the tooltip should mention "the Mebro panel" by name. Find the existing `title={game.reveal.active ? ... : ...}` ternary on the Mebro Index meter. If it doesn't reference the panel, update the active-branch text to:

```
'Mebro Index 80%+ — fact-checks landing on your content, reach dropping. Use the Mebro panel (Platforms column) to defend. Time to ★ Prestige.'
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `✓ built in [time]s`.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "Mention the Mebro panel in the 80%+ Mebro tooltip

When the player hovers the Mebro Index meter post-reveal, the
tooltip now points them at the Mebro panel (Platforms column)
as the defensive tool. Closes the loop between meter and
gameplay.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

### Task 7.2: Smoke-test the full path

- [ ] **Step 1: Reset save and play through to phase 3+ Mebro**

In the browser console on the deployed site:

```js
localStorage.clear(); location.reload();
```

Play to Blog phase. Check the phase milestone HUD appears under the topbar. Check phase transition modal fires when you cross 500K attention. Push to ~25% Mebro Index, watch the Mebro panel materialize. Click Cool on an asset — verify the platform shows the COOLING overlay. Hit 50% Mebro Index — Rotate and Counter-Narrative buttons should enable. Trigger Counter-Narrative, pick a variant, verify the active indicator appears in the panel. Watch detection scores actively rise and decay.

- [ ] **Step 2: Verify no layout overflow**

Resize browser window. Confirm no horizontal scroll and no page-level vertical scroll. If platforms list overflows its column, confirm it scrolls *inside* the column.

- [ ] **Step 3: Toggle feature flag**

In the browser console:

```js
document.body.classList.remove('mebro-enabled');
```

Verify Mebro panel and pill disappear with no other layout damage. Verify the game still plays normally without them.

- [ ] **Step 4: Hard-reset and verify migration**

Have an existing v9 save? Confirm it loads cleanly (no console errors, antagonist fields default to empty / 0).

- [ ] **Step 5: Run all tests**

Run: `pnpm vitest run`
Expected: all mebro tests pass.

- [ ] **Step 6: Final commit if any tuning changes were needed**

If playtesting revealed tuning issues (e.g., detection climbing too fast), adjust constants in `mebro.ts` and recommit. Otherwise skip.

```bash
git add -u
git commit -m "Tuning pass after first playtest (if applicable)

Adjusted accrual / decay / cost constants based on playthrough.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

---

## Self-Review Notes

- **Spec coverage:** All 6 spec sections map to phases — Foundation (Phase 1), pure logic (Phase 2), panel (Phase 3), verbs (Phase 4), intrusion polish (Phase 5), ticker (Phase 6), final integration (Phase 7).
- **Type consistency:** `GameState` field names match exactly across types.ts, defaults.ts, save.ts, mebro.ts, MebroPanel.svelte. The `cooldowns` field is reused for both platform cooldowns (key = platform id) and rotation timestamps (key = `'rotate:' + assetType`) — documented in Task 4.1 to avoid duplicating state.
- **Save migration:** v9 → v10 (acknowledgedPhase) → v11 (six antagonist fields). Saves at v8 or older are dropped (already existing behavior).
- **Feature flag:** `<body class="mebro-enabled">` is a single CSS-class revert path. The component renders nothing when the class is missing (via the `:global(body:not(.mebro-enabled))` rule).
- **Test coverage:** vitest covers all pure logic in mebro.ts. UI rendering verified via `pnpm build` + manual playtest after each commit.

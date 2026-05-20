# Mebro Antagonist Upgrade — Design Spec

**Date:** 2026-05-20
**Author:** brainstormed with Chris Klop
**Status:** approved, ready for implementation plan

## Problem

The Playbook currently stalls in the Blog phase. Players never reach Social, Influencer, or Cable phases because the Blog→Social transition requires 500K engagement on a 100K cap with slow cap-raisers. Even if they did progress, the gameplay loop is "wait for affordability, click." There is no antagonist, no rhythm of decision, no visible arc. The Mebro Index ticks up silently and reveals at 80%, but in between it's background noise.

This spec transforms the game in two layers:
1. **Foundation**: make the existing phase arc reachable and visible.
2. **Antagonist**: turn Mebro into a Living Dashboard opponent — a fake "Mebro app" panel that appears inside the player's UI, tracks per-asset detection scores, and forces real defensive decisions.

## Non-goals

- No new asset types, upgrade trees, synergies, patrons, or platforms.
- No mission/campaign system (file slot reserved in architecture, but not specified here).
- No prestige system changes beyond what's already shipped (doubled legacy multiplier).
- No rebalance of existing assets/upgrades beyond phase thresholds and Newsletter Stack cap value.

## Safety / Rollback

Before any implementation work begins:

1. `git tag pre-antagonist` on current `main`. One-line rollback target.
2. Each implementation commit is independent and revertible without unwinding the others.
3. The Mebro panel UI is gated behind a CSS class (`<body class="mebro-enabled">`, default ON). Setting it OFF disables the entire antagonist UI with no other code change.

## Section 1 · Foundation Fixes

### 1a. Re-tune phase thresholds + caps

Target run pacing (no-prestige player, fresh save):

| Phase | Current trigger | New trigger | Target time |
|---|---|---|---|
| Grassroots → Blog | 500K attention + editorialCalendar flag | unchanged | ~3 min |
| Blog → Social | 500K engagement | **150K engagement** | ~10 min |
| Social → Influencer | 100K followers | unchanged (already reachable) | ~25 min |
| Influencer → Cable | 1M credibility | **400K credibility** | ~50 min |
| Cable → AI Saturation | 10M narrative dominance | **3M narrative dominance** | ~90 min |

Newsletter Stack cap-raiser: +1500 engagement cap each → **+3000 engagement cap each**. Tested: 30 Newsletter Stacks now raises engagement cap by 90K (was 45K), so the 150K Blog→Social threshold is comfortably reachable.

### 1b. Phase milestone HUD

A new always-visible 32px row directly under the topbar:

```
PHASE: BLOG · 95K / 150K engagement → SOCIAL · unlocks TikTok + YouTube + Conspiracy ×1.7 amp
[████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 63%
```

- Left: current phase name in bold.
- Middle: current/target value of the gating resource (with abbreviation: "eng", "foll", "cred", "narr" — matches `resAbbr` helper).
- Right: short list of what the next phase unlocks (max 3 items).
- Progress bar below, fills as player approaches threshold.
- When in final phase (AI Saturation), reads `PHASE: AI SATURATION · endgame · push for prestige`.
- Fixed height. Always renders. Never causes reflow.

### 1c. Phase transition modals

Replace the current log-line phase transitions with a full-bleed modal that briefly takes over the screen.

Modal structure:

```
┌─────────────────────────────────────────┐
│  PHASE TRANSITION                       │
│                                         │
│         YOUR BLOG GOES VIRAL            │
│       CABLE NEWS RUNS WITH IT           │
│                                         │
│   ▸ TikTok unlocked                     │
│   ▸ YouTube unlocked                    │
│   ▸ Conspiracy tree gains ×1.7 amp      │
│                                         │
│              [ continue ]               │
└─────────────────────────────────────────┘
```

Each phase has its own headline copy (one component, five copy sets in a const). Modal auto-pauses the game until dismissed. Plays a subtle "phase-up" sound (if audio later). Persists 0.6s minimum before the continue button enables (so the player reads it).

### 1d. Patron + event gating by phase

Currently all 7 patrons and all events are visible from Blog phase onward. Move 3 patrons and 4 events to higher phase gates so each phase transition unlocks new content to discover:

- Social phase: unlocks 1 new patron, 2 new events.
- Influencer phase: unlocks 2 new patrons, 1 new event.
- Cable phase: unlocks 1 new event (the most dramatic).

Concrete assignments determined at implementation time from existing patron/event blurbs (which patron fits "social-era" thematically, etc).

**Estimated lift:** 30–60 min standalone. This is the floor.

## Section 2 · Mebro Living Dashboard

Mebro shows up *inside the player's UI* as a fake "Mebro app" panel that grows more intrusive as the Mebro Index climbs. The visual metaphor: Mebro is literally taking screen real estate from the player's operation.

### Anchor location

Bottom of the existing Platforms column (right-hand 380px column). NOT a new column.

```
┌──── PLATFORMS COLUMN (existing 380px) ────┐
│  [event headline + ticker — existing]      │
│                                            │
│  ─── PLATFORMS ───                         │
│  X                                         │
│  Facebook                                  │
│  TikTok                                    │
│  YouTube                                   │
│  Telegram (locked)                         │
│  ...                                       │
│  ──────────────────────────────────────    │
│  MEBRO.APP · 38% · 142 sigs                │
│  ⚠ Sock Puppet #41   87%  [Rotate]         │
│  ⚠ Newsletter Stack  71%  [Cool]           │
│  [⊘ Counter-narrative · 25K eng]           │
└────────────────────────────────────────────┘
```

### No-scroll guarantees

1. Platforms list becomes the flex section with `flex-shrink: 1` and `overflow-y: auto`. Platforms scroll *inside their own column* — page never scrolls.
2. Mebro panel is height-capped at 220px max. Never grows beyond that.
3. Per-asset detection chips (8px dots in asset tile corners) have zero layout impact.
4. At Mebro Index < 10%, panel is hidden entirely. Below 25%, only a topbar pill.

### Visual language

The Mebro panel is styled as a *third-party app the player doesn't control*:

- Slightly brighter background than rest of dashboard (`color-mix(in oklab, var(--paper) 90%, white)`).
- Different font weight/letterspacing on the `MEBRO.APP` header — feels like a logo, not a section heading.
- Faint horizontal scanline animation across the panel header (1px CSS-gradient repeating, slow translate). Just enough to feel "live."
- Border: dashed instead of solid, color `color-mix(in oklab, var(--bad) 40%, var(--line))`.
- The whole panel should feel bolted onto the player's interface, not part of it. Same reason hostile UIs in roguelike corruption HUDs or cyberpunk virus overlays feel threatening.

## Section 3 · Detection Mechanics

Per-asset detection score (0–100% per owned asset *type*, not per-instance). Tracked in `state.assetDetection: Record<string, number>`.

### Accrual (raises detection)

Per second tick:

```ts
const cureMultiplier = 0.5 + state.cure;  // 0.5× at game start, 1.5× at reveal
let delta = 0;

// Asset count contribution (saturates at high counts).
delta += Math.min(count, 50) * 0.002;

// Posting contribution: any post on a platform that this asset
// contributes to adds +0.5% per post, applied at post time, not
// here. (Handled in posting.ts.)

// Rotation penalty: a permanent baseline added to the asset's
// detection when rotated within 60s of a previous rotation. Stored
// in state.assetDetectionBaseline[type]. delta floors at baseline.

delta *= cureMultiplier;
state.assetDetection[type] = Math.min(100, state.assetDetection[type] + delta);
```

### Decay (lowers detection)

```ts
// Passive decay if not posted with for 10+ seconds.
if (now - state.lastPostUsing[type] > 10_000) {
  state.assetDetection[type] -= 0.5 * dt;
}

// Cool-down active on this asset's home platform.
if (state.cooldowns[homePlatform(type)] > now) {
  state.assetDetection[type] -= 2.0 * dt;
}

// Counter-narrative active globally.
if (state.counterNarrativeUntil > now) {
  // Halves all accrual (already applied above); no separate decay here.
}

state.assetDetection[type] = Math.max(baseline, state.assetDetection[type]);
```

### Threshold behavior

| Detection score | Visual state | Production effect |
|---|---|---|
| 0–50% | invisible / "clean" | normal |
| 50–80% | yellow ⚠ in panel | normal |
| 80–99% | red ⚠ in panel | 40% production |
| 100% | red ⚠, panel header pulses | 0% production (locked) |

All antagonist run state resets on prestige: `assetDetection`, `assetDetectionBaseline`, `lastPostUsing`, `cooldowns`, `counterNarrativeUntil`, `counterNarrativeCastCount`. Only the legacy multiplier (which already persists separately in localStorage) carries forward.

## Section 4 · Defense Verbs

### Rotate

- **Effect:** Burns 25% of count of that asset type (floor 1), resets that type's detection score to 0.
- **Cost:** the burned asset value. Free in currency.
- **Cooldown:** 30s per asset type.
- **Stacking penalty:** rotating the same type within 60s of last rotation adds +5% permanent baseline to that type. Tracked in `state.assetDetectionBaseline[type]`.
- **UI:** `[Rotate]` button next to each flagged asset row in the panel. Tooltip shows exact cost ("burn 10 of 41 Sock Puppets").

### Cool Down

- **Effect:** the asset's home platform stops accepting POST / PUSH IT for 45s. Detection decays 4× faster (-2%/sec).
- **Home platform mapping:** each asset type maps 1:1 to one "home platform" via a static lookup in `mebro.ts`. Mapping is based on which platform's amp the asset type most reinforces (Sock Puppet → X, Newsletter Stack → Substack, Audience Pod → Telegram, Doppelganger Cluster → Facebook, Pseudo-News Site → Facebook, Niche Substacker → Substack, Outlet → YouTube, Auto-Poster → no home platform (skip Cool Down for this type)). Exact mapping finalized in implementation.
- **Cost:** opportunity (no posting from that platform). Other platforms still operate normally.
- **Cooldown:** none. Re-trigger after 45s ends.
- **UI:** `[Cool]` button next to each flagged asset row. The platform card itself shows a `COOLING 23s` overlay while active.

### Counter-Narrative

- **Effect:** halves ALL detection accrual game-wide for 30s.
- **Cost:** 25K engagement first cast, +50% per cast in same run (37.5K, 56K, 84K, ...).
- **Cooldown:** 60s.
- **Variants:** player chooses from 4 narrative flavors each time (same mechanical effect, different flavor text):
  - "Mebro is biased"
  - "Mebro silences conservatives"
  - "Mebro is Big Tech censorship"
  - "Mebro is funded by [foreign actor]"
- **UI:** `[⊘ Counter-narrative · 25K eng]` button at bottom of panel. Click opens a small chooser modal with the 4 variants; selecting one fires the effect and posts a log line in the chosen flavor.

### Three-strategy support

- **Aggressive operator** → Rotates often. Burns through assets to keep scores low. Spends production efficiency for clean ops.
- **Patient operator** → Cools down platforms in rotation. Slower play, lower heat, more sustainable.
- **Cynical operator** → Spams Counter-Narrative. Accepts that detection will climb but pushes it back constantly. Most thematic.

## Section 5 · Intrusion Progression

`intrusionStage(cure: number): 0 | 1 | 2 | 3 | 4`

| Stage | Cure range | Mebro presence | Detection active? |
|---|---|---|---|
| 0 | 0.00–0.10 | nothing | no |
| 1 | 0.10–0.25 | topbar pill "MEBRO · scanning" | no |
| 2 | 0.25–0.50 | compact panel (~120px), 1–2 assets shown, Cool Down only | yes, 0.5× rate |
| 3 | 0.50–0.80 | full panel (~200px), all assets, all 3 verbs | yes, 1.0× rate |
| 4 | 0.80–1.00 | red pulsing panel, "MEBRO HAS GONE MAINSTREAM" header | yes, 1.5× rate |

**Behavior of disabled verbs at Stage 2:** Rotate and Counter-Narrative buttons render but are disabled with a tooltip: *"Available when Mebro Index reaches 50%."* Visual scaffolding so the player knows what's coming.

**Stage 1 pill:** clickable, shows tooltip *"Mebro is fingerprinting your assets. At 25%, you'll be able to see what it's seeing."* Sets up Stage 2 reveal.

**Stage 4 + existing reveal banner:** the existing reveal banner (at 80% Mebro Index) still triggers exactly as it does today. Stage 4 panel state runs concurrently with it. The existing prestige-encouraging UX is preserved.

**Prestige resets all detection state.** Player starts post-prestige at Stage 0 again, but with their legacy multiplier intact. They tear through early stages faster on later runs — the intrusion progression itself becomes part of the prestige loop.

## Section 6 · Architecture

### New files

- `src/game/core/mebro.ts` — pure logic. Exports:
  ```ts
  export function tickDetection(state: GameState, dtMs: number): void;
  export function applyRotate(state: GameState, assetType: string): boolean;
  export function applyCooldown(state: GameState, platformId: string): boolean;
  export function applyCounterNarrative(state: GameState, variantId: string): boolean;
  export function intrusionStage(cure: number): 0 | 1 | 2 | 3 | 4;
  export function homePlatform(assetType: string): string;
  ```
  No Svelte; pure functions; vitest-testable.
- `src/game/core/missions.ts` — *deferred*. File slot reserved for future plan. Empty/placeholder for now.
- `src/components/MebroPanel.svelte` — the panel UI. Receives `game` as prop. Renders nothing if `intrusionStage === 0`. Renders pill-only if Stage 1. Renders panel otherwise. Lives in the Platforms column.
- `src/components/PhaseTransitionModal.svelte` — full-bleed phase-up modal. Receives `phase: PhaseId` and `onClose: () => void`.
- `src/components/PhaseMilestoneHUD.svelte` — the 32px milestone bar below the topbar. Receives `game` as prop.
- `src/lib/counterNarratives.ts` — 4 narrative variants as a static list (text + flag id). Tiny file, isolated for easy editing.
- `src/lib/phaseTransitionCopy.ts` — 5 phase-up modal copy sets (one per phase). Static const.

### Modified files

- `src/game/types.ts` — add to `GameState`:
  ```ts
  assetDetection: Record<string, number>;        // 0–100 per asset type
  assetDetectionBaseline: Record<string, number>; // permanent floors from rotation penalty
  lastPostUsing: Record<string, number>;          // timestamp per asset type
  cooldowns: Record<string, number>;              // platform id → expiry timestamp
  counterNarrativeUntil: number;                  // 0 if inactive
  counterNarrativeCastCount: number;
  acknowledgedPhase: Phase;                       // for showing transition modal
  ```
- `src/game/save.ts` — version bump. Migration: default new fields to 0 / empty record. Old saves stay readable; detection starts fresh.
- `src/game/sim.ts` — call `tickDetection(state, dt)` once per tick.
- `src/game/core/actions.ts` — `checkPhaseTransitions` gets the lower thresholds. When phase changes, do NOT show transition modal directly; instead set `state.phase` and rely on App.svelte derived state (`game.phase !== game.acknowledgedPhase`) to show the modal.
- `src/game/core/posting.ts` — POST/PUSH IT contribute to per-asset detection. Each post adds +0.5% to the detection score of every asset type whose `produces` map matches the platform's amped resource. Also sets `state.lastPostUsing[type] = now` for each contributing type.
- `src/game/core/catalog.ts` — patron/event visibility predicates get phase gates (see Section 1d).
- `src/lib/facts.ts` — add 2 more Mebro ticker lines at `minCure: 0.50` and `0.75`.
- `src/App.svelte` — three additions:
  1. `<PhaseMilestoneHUD {game} />` slotted under the topbar.
  2. `<PhaseTransitionModal ... />` conditionally rendered when `game.phase !== game.acknowledgedPhase`.
  3. `<MebroPanel {game} />` slotted into the platforms column, below the platforms list.

### Untouched (the safe zone)

- All existing assets, upgrades, synergies, achievements. No rebalance work outside phase thresholds + Newsletter Stack cap value.
- Existing layout grid, no-scroll invariant, fixed-height rows, marquee banner. All preserved.
- Prestige system, legacy multiplier, reveal banner. All keep working as-is.
- Resource production formulas, heat/charge mechanics, post yield formulas.

### Commit shape (suggested)

1. `git tag pre-antagonist` on current `main`. One-line rollback target.
2. **Foundation only** (Section 1) — phase thresholds, milestone HUD, transition modals, patron/event re-gating. Standalone commit. Playable, fully revertible.
3. **Mebro pure logic** (`mebro.ts` + state additions + sim wiring + posting wiring). No UI yet. Detection accrues invisibly. Standalone commit.
4. **MebroPanel UI scaffold** behind feature flag (`<body class="mebro-enabled">`, default ON). Renders panel at Stages 2–4 with placeholder buttons. Single revert toggle.
5. **Defense verbs wired** (Rotate / Cool Down / Counter-Narrative). Each verb separately, in one commit. Includes the variant chooser modal.
6. **Intrusion progression gating** (Stages 0–1 pill, Stage 2 disabled verbs, Stage 4 red treatment). Standalone commit.
7. **Counter-Narrative variants + ticker lines** finalized. Standalone commit.

Each commit ends with `pnpm build` + push, so each layer ships to live GitHub Pages independently.

**Total estimated lift:** ~6–8 hours of focused work. Foundation (commit 2) alone is closer to 30–60 min and ships value immediately.

## Open Questions

None — all design questions resolved during brainstorming. Tuning numbers (accrual rates, thresholds, costs) flagged as placeholders; expect 1–2 playtest passes after first ship.

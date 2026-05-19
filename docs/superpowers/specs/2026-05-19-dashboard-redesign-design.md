# Dashboard Redesign — Design Spec

**Date:** 2026-05-19
**Project:** The Playbook (idle-incremental Svelte 5 game)
**Author:** Claude Code (Opus 4.7) with Chris Klopfenstein (user partner)
**Status:** Design approved; ready for implementation plan
**Predecessors:** `docs/dashboard-design.md` (an earlier, reverted attempt — that file's invariants and grid spec are partially retained here; the layout shape is new)

This spec describes a complete rebuild of the dashboard layout shell for The Playbook. Tile-level visual treatment ("Concept A" cost-resource fills, NEW badges, milestone slots, hex talent tree node visuals) is included where it's new; everything else inside the tiles is unchanged.

The driving constraint, which has been violated by every prior attempt: **the layout must never reflow when the user toggles a drawer, buys an asset, crosses a heat threshold, or any other in-game state change.** Buttons — especially POST and PUSH IT — must keep their pixel position so spam-clicking is safe.

---

## 1. Layout shell

The dashboard is a single CSS Grid arranged as one fixed top row (Next Moves) plus one fluid bottom row (the three working columns).

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOPBAR  ·  resources · prestige · achievements · saved · reset           │  fixed
├──────────────────────────────────────────────────────────────────────────┤
│ TICKER  (factoid · 26 px, click-to-pause)                                │  fixed
├──────────────────────────────────────────────────────────────────────────┤
│ EVENT BAND  (always reserved 56 px — never collapses, idle copy when no  │  fixed
│  event)                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ ⚡ NEXT MOVES  ·  top 3 ranked recommendations, color-tiered             │  60 px
├──────────────────────────────────────────┬───────────────────────────────┤
│                                          │                               │
│   DEPICT TREES                           │   ASSETS         │   PLATFORMS│
│   six hex trees in 2 cols × 3 rows       │   (fluid center) │   (fixed   │
│   per-tree collapse                      │                  │    380 px) │
│                                          │                  │            │
├──────────────────────────────────────────┴──────────────────┴────────────┤
│ LOG FOOTER  (fixed 120 px, internal scroll)                              │
└──────────────────────────────────────────────────────────────────────────┘
```

**CSS grid spec:**

```css
.grid {
  display: grid;
  grid-template-columns: 400px minmax(0, 1fr) 380px;
  grid-template-rows: auto auto;
  grid-template-areas:
    "next   next      next"
    "depict assets    platforms";
  gap: 0.6rem;
}
```

- `.col.trees-col   { grid-area: depict; }`
- `.col.left        { grid-area: assets; }`
- `.col.platforms-col { grid-area: platforms; }`
- `.next-moves      { grid-area: next; }`

**No `auto-fill` / `auto-fit` anywhere in the dashboard shell. No `:has()` reflow tricks. Toggles change content, not width.**

The single deliberate breakpoint is `max-width: 1100px`, at which the entire grid collapses to a single column stack (mobile / narrow desktop). The 1920 px+ target screen stays in the multi-column layout.

---

## 2. Next Moves strip

A 3-slot horizontal strip showing top-ranked recommendations.

### Recommendation type

```ts
type RecommendationType =
  | 'synergy'           // one-shot unlock
  | 'patron'            // one-shot patron activation
  | 'project'           // one-shot paradigm shift
  | 'prestige'          // Mebro escape valve
  | 'depict-unlock'     // node that completes a tier-2 or synergy prereq
  | 'asset-milestone'   // asset within X% of next ×2 milestone
  | 'depict-buy'        // affordable DEPICT level
  | 'asset-buy'         // affordable asset purchase
  | 'post-ready';       // POST charged on a platform with low heat

interface Recommendation {
  type: RecommendationType;
  id: string;              // target entity id (asset id, upgrade id, etc.)
  title: string;           // short user-facing label
  detail: string;          // longer description for hover/tooltip
  cost?: { resource: ResourceId; amount: number };
  action: () => void;      // single-click execute (buy / POST / prestige)
  scrollTarget?: string;   // selector to jump+highlight if user clicks chip body
  score: number;           // computed by heuristic, sort desc
}
```

### Ranking heuristic

```
score(rec) = base_impact[rec.type] × situational_modifier(rec)
```

| Type | Base impact | Notes |
|---|---:|---|
| `synergy` | 100 | Game-changing unlocks, can't repeat |
| `patron` | 100 | Same |
| `project` | 100 | Paradigm shifts |
| `prestige` | 95 | Only when cure ≥ 0.60 (time-sensitive) |
| `depict-unlock` | 80 | Multi-step compound unlock |
| `asset-milestone` | 60 | Within 25 % of next ×2 doubling |
| `depict-buy` | 50 | Within tier-2-unlock window for that tree |
| `asset-buy` | 30 | Routine income growth |
| `post-ready` | 20 | Active engagement, repeatable |

`situational_modifier` defaults to 1.0 and is boosted (×1.5 to ×2.0) when the recommendation is near a milestone or when its prereq lift would unlock a synergy.

Top 3 scored recommendations display. Ties broken by lowest cost as a fraction of current holding (cheapest wins). Refresh cadence: every 250 ms (same as the existing observed-rate tick). Idempotent.

### Visual

Three slots, each a "chip":
- **★ Gold** (top slot): bold border + soft glow, larger font, `★` prefix.
- **2 Silver** (middle): standard chip, `2` prefix.
- **3 Bronze** (third): muted chip, `3` prefix.

When the candidate pool is empty: the strip renders a single muted line "no available moves — keep earning attention" centered in the 60 px slot. **Strip height is fixed; layout invariant preserved.**

### Click behavior

- **Click chip body** → opens the relevant panel (jumps to + highlights the actual tile with a 1 s pulse). For one-shots this jumps to its location in Assets/DEPICT.
- **Click the small action button** (when present, e.g. `+50`, `POST`, `BUY`) → executes immediately, no panel jump.

### Stability

Fixed 60 px height. Recomputed each tick. Recommendations that no longer apply disappear next tick (no animation, just gone); new top-3 slides into place via CSS opacity transition (no layout movement).

---

## 3. DEPICT — hex talent tree

Each of the six DEPICT trees becomes a hex talent tree.

### Per-tree layout

```
┌──────────────────────────────────┐
│ ▼ EMOTIONAL    13/60 · → att     │  ← root header (▼ click to collapse)
│           ◯                      │
│         ╱   ╲                    │  ← SVG connecting lines
│        ╱     ╲                   │
│     ⬡ 11/30  ⬡ 2/30              │  ← tier-1 hex   tier-2 hex
│      Upworthy Plandemic           │
│      Bait     Framework           │
└──────────────────────────────────┘
```

- **Root header**: tree letter chip (in tree color), name, total levels, `→ target-resource`, collapse caret. Clickable to collapse just that tree.
- **Hex node**: ~52 × 52 px `clip-path` hexagon. Fills from base (low level) to bright/saturated by `level / maxLevel`. Level text displayed inside (`11/30`). Cost-resource colors the inner ring. Below: short label, truncated to one line.
- **Connecting lines**: thin SVG paths from root center down to each child. Lit (tint color) when path is active (parent prereqs satisfied); dim when child is locked.
- **Locked tier-2**: lock glyph overlay, opacity 0.4, tooltip explains the prereq.
- **Maxed node**: green saturated fill + brief glow.

### Six-tree grid

Fixed `repeat(2, minmax(0, 1fr)) / repeat(3, auto)` inside the 400 px DEPICT column:

```
┌──────────┬──────────┐
│ D        │ E        │  row 1
├──────────┼──────────┤
│ P        │ I        │  row 2
├──────────┼──────────┤
│ C        │ T        │  row 3
└──────────┴──────────┘
```

Each tree cell ≈ 195 × 110 px when expanded, ≈ 195 × 28 px when collapsed. Column count never changes; row heights are content-driven so a collapsed tree only shrinks its own row.

### Interaction model

- **Click hex** → `+1 level` if affordable. Silent and stable; no popup.
- **Shift-click hex** → `+10` (or as many as affordable up to 10).
- **Right-click hex** → `+max` affordable.
- **Hover hex** → browser-native `title=` tooltip: full node name, per-level effect, current effect (now +16.5 %), next-level cost.
- **Click root caret** → collapses or expands that tree's hex pair.

### Sparse-tree caveat

With only 2 child nodes per tree (current state), the hex tree visually carries identity but structurally is shallow (root + 2 leaves). After the layout ships, content work can add 1-2 more tier-1 siblings per tree to make each tree a genuine branching tree. This is explicitly **out of scope** for this redesign but flagged as a natural follow-up.

---

## 4. Assets and Platforms — what changes, what stays

### Assets column (fluid center)

**Stays:**
- Concept A tile fills (cost-resource gradient at width = affordability ratio)
- NEW badge + pulse on unbought items (`count == 0`)
- One-line milestone slot
- Per-tile bulk toggle chips (×1 / ×10 / ×100 / ×max)
- Section help button (`?`)
- Sub-sections (Assets, Projects, Synergies, Patrons) stacked vertically inside the column
- Section header bulk toggle ("select-all" — clears per-tile overrides)
- Title-attribute tooltips carrying blurb + precedent

**Changes:**
- Card grid hard-fixed to `repeat(2, minmax(0, 1fr))` — never re-wraps
- Section heads sticky-positioned to the top of the column (so the buy-mode chips stay reachable while you scroll inside)
- Column scrolls internally; outer dashboard never scrolls

### Platforms column (fixed 380 px right slot)

**Stays:**
- Concept B platform tile (POST button charge-fill from the left; vertical 8-segment heat LED column right side; rate slider; fixed-height heat status banner)
- Heat LED column fills bottom-up; top 3 segments flash red when lit
- Help modal (`?`)
- Platform tooltip (title attr) with audience + DEPICT amps + mechanics

**Changes:**
- Tile grid is **single column** inside the 380 px slot (was 2 cols — too cramped at this width). Each tile gets the full 380 px, ~110 px tall.
- No drawer-collapse on Platforms. It's a fixed column always. Removes a whole class of reflow bugs.
- Locked platforms render as a thin ~32 px "unlocks · cable era" strip.

### Log footer (unchanged)
Fixed 120 px height at the bottom, scrolls internally.

### Banners above the grid (unchanged)
- Topbar resource meters (Concept A fills, observed-rate display, cure tooltip)
- Ticker (click-to-pause, click-to-advance, double-click to resume)
- Event band (always-reserved 56 px slot)
- Reveal banner (only renders during Mebro reveal, above event band)
- Next Moves strip (new — see §2)

### Modals (unchanged)
Achievements, DEPICT help, Assets help, Platforms help, Prestige ceremony, Welcome-back, Multiplier breakdown popover.

### Mockup page (unchanged)
`?mockup=tiles` route stays for future visual exploration.

### Removed
- Old bottom DEPICT row (DEPICT moves to left column).
- Platforms drawer-collapse / status-rail mode.
- DEPICT bottom-collapse master toggle (replaced by per-tree collapse in §3).
- `auto-fill` / `auto-fit` grids throughout the dashboard shell.
- Old `.afford-fill` thin strip (already deleted in an earlier push; reaffirmed here).

---

## 5. Invariants

Listed explicitly so they can be regression-tested by eye on any future change.

| # | Invariant | Enforced by |
|---|---|---|
| I1 | Outer grid columns are fixed-pixel on the side columns; only the center is fluid | `grid-template-columns: 400px minmax(0, 1fr) 380px` |
| I2 | No toggle, no state change, no purchase, no heat transition reflows the outer grid | Side columns are hard pixel tracks; center responds only to viewport |
| I3 | POST and PUSH IT button pixel positions are stable during a session | Charge fills inside the button; fixed-height heat-status slot with `nowrap + ellipsis`; LED column is fixed width |
| I4 | Card grids never re-wrap on content change | `repeat(N, minmax(0, 1fr))` with fixed N; media queries change N only at hard breakpoints |
| I5 | The Next Moves strip is always rendered at fixed 60 px | Even with zero candidates, renders placeholder copy |
| I6 | The 56 px event band is always rendered | Idle copy when no event |
| I7 | Per-tree DEPICT collapse touches only that tree's row inside the DEPICT column | Inner grid is `repeat(2, 1fr) / repeat(3, auto)`; row height is content-driven, isolated to the row |
| I8 | Buying / teasing / revealing a tile never reorders or moves others | Catalog order + sticky reveal flags (already in place) |
| I9 | Blurb / precedent live only in `title=` tooltip — never inline | `.blurb, .node-blurb, .precedent { display: none !important; }` (already in place) |
| I10 | Layout assertion holds at any viewport ≥ 1100 px (the single deliberate breakpoint) | Outer grid template; assets-only stack below 1100 px is the only exception |

---

## 6. Implementation phases

Three phases, each its own commit + push, verified before moving to the next.

### Phase 1 — Layout shell (lowest risk, biggest visible change)
- Update `.grid` template-columns and template-areas to the new 3-col + Next-Moves-row structure
- Move DEPICT to the left column
- Move Platforms to fixed 380 px right column with single-column tiles
- Add Next Moves strip as an empty placeholder band (populated in Phase 3)
- Drop the old bottom DEPICT row, the Platforms drawer-collapse, and the DEPICT bottom-collapse toggle
- **Verify**: open at 1920 × 1080, note POST coordinates, spam-click POST through heat hot → danger → overheated → banned; coordinates unchanged. Buy assets through tease/reveal transitions; tile positions unchanged. `pnpm exec svelte-check` 0 errors. `pnpm test --run` 16/16.

### Phase 2 — Hex talent tree (medium risk, contained)
- Replace flat tree-node rendering with hex SVG inside each tree
- Add per-tree collapse caret on root header
- Wire shift-click and right-click bulk-buy modifiers
- Locked / available / leveled / maxed visual states
- Connecting lines (SVG paths) lit when prereqs met, dim when locked
- **Verify**: every tree at every state renders correctly; click increments level; tier-2 lock unlocks once tier-1 reaches 10; collapse caret toggles just that tree's row.

### Phase 3 — Next Moves recommendation engine (highest novelty)
- Implement `Recommendation` type + candidate-pool gatherer + ranking heuristic in a new `src/game/core/recommendations.ts`
- Render top 3 chips in the strip
- Wire click-to-action and click-to-open-and-highlight
- Highlight target tile with a 1 s pulse on chip-body click
- **Verify**: at multiple game states (empty pool, mid-game, with affordable synergy, at high cure), recommendations match the heuristic; click on chip executes the right action; strip never grows or shrinks.

---

## 7. Anti-completion-theater rule

Per the `superpowers:verification-before-completion` skill: no phase is claimed complete until the verification commands have been run **and their output pasted**. No "I bet svelte-check passes" — show the output. No "I'm confident POST stays put" — open the browser, click, confirm.

This applies to every phase commit, every PR, every push.

---

## 8. What this spec does not cover

- **Math rebalancing** (cap-vs-cost invariant, runaway affordability). Separate problem; user-acknowledged; deferred to its own design.
- **Content expansion** (more nodes per DEPICT tree, more events, more synergies). Separate; user-noted as a natural follow-up.
- **Mebro reveal third-act content** (defection feed, Trust bar, debrief screen). Existing stub; out of scope.
- **Mobile / sub-1100 px layout polish** beyond the single-column stack fallback. Out of scope.

These will get their own specs when prioritized.

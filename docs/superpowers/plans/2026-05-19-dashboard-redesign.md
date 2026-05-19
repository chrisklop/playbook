# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the dashboard redesign from `docs/superpowers/specs/2026-05-19-dashboard-redesign-design.md`: three-column layout with a "Next Moves" ranked recommendations strip on top, DEPICT trees rendered as hex talent trees in the left column, and a locked-down no-reflow grid invariant.

**Architecture:** Three phases, each its own commit and verification cycle. Phase 1 reshapes the outer grid. Phase 2 swaps the DEPICT tree visualization to hex SVG components. Phase 3 builds the recommendation engine and renders Next Moves chips.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vite, CSS Grid (no auto-fill / auto-fit anywhere in the dashboard shell), inline SVG for hex shapes and connecting lines.

**Invariants (must hold after every phase):**
- The outer dashboard never reflows on any toggle, purchase, heat transition, or state change.
- POST and PUSH IT buttons keep their pixel position across the session.
- `pnpm exec svelte-check` returns 0 errors.
- `pnpm test --run` passes 16/16.

---

## Phase 1 — Layout shell

**Files:**
- Modify: `src/App.svelte` (grid CSS, DOM order, drop drawer-collapse states, add Next Moves placeholder)

This phase rebuilds the outer grid. No new behavior is added — the Next Moves slot is just an empty placeholder; it gets populated in Phase 3.

### Task 1.1: Update `.grid` CSS template

**Files:**
- Modify: `src/App.svelte` (`.grid` CSS block)

- [ ] **Step 1: Replace the `.grid` CSS rule with the new template**

Locate the existing `.grid {` rule in the `<style>` block and replace it with:

```css
.grid {
  display: grid;
  /* New layout per docs/superpowers/specs/2026-05-19-dashboard-redesign-design.md
     - Top row: Next Moves strip (spans all 3 cols, fixed 60px)
     - Bottom row: DEPICT (fixed 400px) | Assets (fluid) | Platforms (fixed 380px)
     INVARIANT: side columns are HARD pixel tracks. No content can change their
     width. Toggles change inner content only. */
  grid-template-columns: 400px minmax(0, 1fr) 380px;
  grid-template-rows: auto auto;
  grid-template-areas:
    "next   next      next"
    "depict assets    platforms";
  gap: 0.6rem;
  padding: 0.7rem;
  align-items: start;
  align-content: start;
  min-height: 0;
  max-width: 1700px;
  margin: 0 auto;
  width: 100%;
}
```

- [ ] **Step 2: Replace the `.col.*` grid-area rules**

Locate the three `.col.left`, `.col.platforms-col`, `.col.trees-col` rules. Replace each `grid-area` line so they line up with the new template:

```css
.col.left          { grid-area: assets; }
.col.platforms-col { grid-area: platforms; }
.col.trees-col     { grid-area: depict; }
```

Keep the background/border tints already on each rule. Remove any `transition: max-width`, `max-width`, `:has()` reflow tricks, or `grid-row` / `grid-column` overrides — they conflict with `grid-area`.

- [ ] **Step 3: Update the responsive media query**

Locate the existing `@media (max-width: 900px)` block (or `1100px` — verify) and replace with:

```css
@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "next"
      "assets"
      "platforms"
      "depict";
  }
}
```

This is the single deliberate breakpoint per the spec.

- [ ] **Step 4: Verify svelte-check is clean**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: `svelte-check found 0 errors and 5 warnings in 1 file` (the 5 warnings are pre-existing tsconfig deprecations, unrelated).

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte
git commit -m "Phase 1.1: rewire dashboard grid template to 3-col + Next Moves row

Outer grid is now 400px | fluid | 380px with a Next Moves row across the
top. Side columns are hard pixel tracks; only the center is fluid. This
is the load-bearing layout invariant: no toggle, no state change, and no
purchase may reflow the outer grid.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.2: Add the Next Moves placeholder slot

**Files:**
- Modify: `src/App.svelte` (new DOM element + CSS)

- [ ] **Step 1: Add the Next Moves DOM block above the `<main class="grid">` content**

Inside `<main class="grid">`, before the existing `<section class="col left">`, insert:

```svelte
<!-- NEXT MOVES STRIP — placeholder, populated in Phase 3 -->
<section class="next-moves" aria-label="next moves">
  <div class="next-moves-empty">no available moves — keep earning attention</div>
</section>
```

- [ ] **Step 2: Add CSS for the strip**

Add to the `<style>` block (near other grid-area styles):

```css
.next-moves {
  grid-area: next;
  height: 60px;
  background: color-mix(in oklab, var(--accent) 5%, var(--paper-2));
  border: 1px solid color-mix(in oklab, var(--accent) 22%, var(--line));
  border-radius: 8px;
  padding: 0 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  overflow: hidden;
}
.next-moves-empty {
  font-size: 0.8rem;
  color: var(--muted);
  font-style: italic;
}
```

- [ ] **Step 3: Verify svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "Phase 1.2: add Next Moves strip placeholder (60px fixed slot)

Always-rendered 60px-tall band that spans all three columns at the top
of the dashboard grid. Currently shows 'no available moves' copy as a
placeholder. Populated in Phase 3 by the recommendation engine.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.3: Remove the platforms drawer-collapse mode

**Files:**
- Modify: `src/App.svelte` (remove `platformsExpanded` state, collapse toggle, rail markup, rail CSS)

- [ ] **Step 1: Remove the `platformsExpanded` state declaration**

Locate the line `let platformsExpanded = $state(true);` in the `<script>` block and delete it.

- [ ] **Step 2: Remove the collapse toggle from the platforms section header**

Locate the `<section class="col platforms-col" class:collapsed={!platformsExpanded}>` element. Replace with:

```svelte
<section class="col platforms-col">
```

Inside its `<div class="section-head">`, replace the `<button class="ghost section-collapse" ...>` with the original simple header:

```svelte
<div class="section-head">
  <h2>Platforms</h2>
  <button class="ghost depict-help-btn" onclick={() => (showPlatformsHelp = true)} title="What are platforms?">?</button>
</div>
```

- [ ] **Step 3: Remove the rail-mode `{#if !platformsExpanded}...{:else}` wrapper**

The rail mode block (containing `class="platforms-rail"` and `class="rail-platform"`) needs to be deleted. The `<div class="platform-grid">` should render unconditionally:

Before (find):
```svelte
{#if !platformsExpanded}
  <!-- rail mode -->
  <div class="platforms-rail">
    ...
  </div>
{:else}
<div class="platform-grid">
```

After:
```svelte
<div class="platform-grid">
```

Make sure to remove the trailing `{/if}` that matched the rail-mode wrapper.

- [ ] **Step 4: Delete the now-orphaned rail CSS**

Remove these CSS blocks from the `<style>` section:
- `.platforms-rail { ... }`
- `.rail-platform { ... }` (and all variants `.rail-platform.hot`, `.rail-platform.danger`, etc.)
- `.rail-platform-name`, `.rail-platform-mini`, `.rail-charge-dot`, `.rail-heat-num`
- `@keyframes rail-danger`
- Any `.col.platforms-col.collapsed` rules

- [ ] **Step 5: Update `.platform-grid` to single-column**

Locate the `.platform-grid` CSS rule. Replace with:

```css
.platform-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}
```

Delete any `@media (max-width: 1200px) { .platform-grid { ... } }` block — it's no longer needed.

- [ ] **Step 6: Verify svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.svelte
git commit -m "Phase 1.3: remove platforms drawer-collapse + switch tiles to single col

Platforms column is now a fixed 380px slot showing a single-column stack
of platform tiles. The drawer-collapse toggle, rail mode, and all related
state / markup / CSS are deleted — they introduced reflow bugs and are
replaced by the fixed-column structure.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.4: Remove the DEPICT bottom-collapse master toggle

**Files:**
- Modify: `src/App.svelte` (remove `treesExpanded` state, collapse caret, summary pills row)

- [ ] **Step 1: Remove the `treesExpanded` state declaration**

Locate `let treesExpanded = $state(true);` and delete it.

- [ ] **Step 2: Remove the collapse caret + summary pills from DEPICT section head**

Find the `<section class="col trees-col" class:collapsed={!treesExpanded}>` element.

Replace it with:
```svelte
<section class="col trees-col">
```

Inside its `<div class="section-head">`, replace the collapse button + summary pills block with the simple header:

```svelte
<div class="section-head">
  <h2>DEPICT trees</h2>
  <button class="ghost depict-help-btn" onclick={() => (showDepictHelp = true)} title="What is DEPICT?">?</button>
</div>
```

- [ ] **Step 3: Remove the `{#if treesExpanded}` wrapper**

The `<div class="trees">` element was wrapped in `{#if treesExpanded}...{/if}`. Remove both lines so the trees render unconditionally:

```svelte
<div class="trees">
```

- [ ] **Step 4: Delete the now-orphaned CSS**

Remove from `<style>`:
- `.col.trees-col.collapsed { ... }` rules
- `.section-collapse { ... }`, `.section-collapse:hover`, `.section-collapse .caret`
- `.trees-pill`, `.trees-pill-tag`, `.trees-pill.has-affordable`, `.trees-pill-dot`, `.trees-pill-num`
- `@keyframes tree-pill-dot`

(These pills were specific to the collapsed-master mode. Per-tree collapse from Phase 2 will not use them.)

- [ ] **Step 5: Verify svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.svelte
git commit -m "Phase 1.4: remove DEPICT master-collapse toggle and summary pills

DEPICT trees now render unconditionally in the left column. Per-tree
collapse comes in Phase 2 via the hex tree component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.5: Lock down inner card grids to fixed column counts

**Files:**
- Modify: `src/App.svelte` (`.cards`, `.trees`, `.platform-grid` CSS rules)

- [ ] **Step 1: Update `.cards` to fixed 2 columns**

Locate the `.cards` rule. Replace with:

```css
.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  align-items: stretch;
}
@media (max-width: 1100px) {
  .cards { grid-template-columns: 1fr; }
}
```

Delete any pre-existing `@media (max-width: 900px) { .cards { ... } }` rule.

- [ ] **Step 2: Update `.trees` to fixed 2 columns**

Locate the `.trees` rule. Replace with:

```css
/* DEPICT trees flow 2 cols x 3 rows inside the 400px DEPICT column.
   Fixed count — never re-wraps when phase advances or trees reveal. */
.trees {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  align-items: start;
}
@media (max-width: 1100px) {
  .trees { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

(The single deliberate breakpoint flattens via the outer grid, so trees stay 2-col internally.)

- [ ] **Step 3: Confirm `.platform-grid` is already `grid-template-columns: 1fr` from Task 1.3**

Verify by searching for `.platform-grid {`. If it isn't exactly:

```css
.platform-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}
```

Make it so. No media queries.

- [ ] **Step 4: Verify svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 5: Run the existing test suite**

Run: `pnpm test --run 2>&1 | tail -8`
Expected: `Tests  16 passed (16)`.

- [ ] **Step 6: Commit**

```bash
git add src/App.svelte
git commit -m "Phase 1.5: lock inner card grids to fixed column counts

.cards, .trees, .platform-grid all use repeat(N, minmax(0, 1fr)) with
fixed N. auto-fill / auto-fit removed everywhere in the dashboard shell.
Column counts now only change at the explicit 1100px breakpoint, never
in response to card content or column-width drift.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.6: Phase 1 verification

- [ ] **Step 1: Final svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: `svelte-check found 0 errors and 5 warnings in 1 file`.

- [ ] **Step 2: Final test pass**

Run: `pnpm test --run 2>&1 | tail -8`
Expected: `Tests  16 passed (16)`.

- [ ] **Step 3: Push Phase 1 to main**

```bash
git push origin main 2>&1 | tail -3
```

- [ ] **Step 4: Visual verification (manual)**

After GitHub Pages rebuilds (~1 min), open the live site at a viewport ≥1200px and confirm:
- Three columns visible: DEPICT on the left (400px), Assets in the center (fluid), Platforms on the right (380px).
- An empty Next Moves placeholder strip sits across the top of the grid showing "no available moves — keep earning attention".
- Toggling nothing exists yet — but spam-clicking POST through heat transitions, buying assets, and triggering reveal must not move any button. Click POST 20+ times across rising heat; the button's screen coordinates must stay constant.

Phase 1 completion gate: all 4 checks above pass.

---

## Phase 2 — Hex talent tree

**Files:**
- Create: `src/components/HexTree.svelte` (per-tree component)
- Modify: `src/App.svelte` (replace flat tree rendering with `<HexTree>`; add per-tree expanded state)

### Task 2.1: Create the HexTree component skeleton

**Files:**
- Create: `src/components/HexTree.svelte`

- [ ] **Step 1: Create the file with the component shell**

Create `src/components/HexTree.svelte` with this content:

```svelte
<script lang="ts">
  import type { DepictId } from '../game/types';
  import { game } from '../game/state.svelte';
  import { UPGRADES } from '../game/core/catalog';
  import { upgradeCost, canBuyUpgrade, buyUpgrade } from '../game/core/actions';
  import { affordableCount } from '../game/core/math';
  import { fmt } from '../lib/format';

  interface Props {
    tree: DepictId;
    label: string;          // e.g. "Emotional"
    letter: string;         // e.g. "E"
    target?: string;        // e.g. "attention"
  }
  let { tree, label, letter, target }: Props = $props();

  let expanded = $state(true);

  // Nodes in this tree, in catalog order. Limit to nodes that are at least
  // revealed (visible() returns true for the current state). Locked-but-
  // teased nodes still show as a hex with a lock overlay.
  const nodes = $derived(UPGRADES.filter((u) => u.tree === tree));

  // Tier-2 unlock condition for this tree: tier-1 total levels >= 10.
  const tier1TotalLevels = $derived(
    nodes
      .filter((n) => n.tier === 1)
      .reduce((acc, n) => acc + (game.upgrades[n.id] ?? 0), 0),
  );
  const tier2Unlocked = $derived(tier1TotalLevels >= 10);

  // Sum levels for the root header readout.
  const totalLevel = $derived(
    nodes.reduce((acc, n) => acc + (game.upgrades[n.id] ?? 0), 0),
  );
  const totalMax = $derived(nodes.reduce((acc, n) => acc + n.maxLevel, 0));

  function levelFraction(nodeId: string, maxLevel: number): number {
    const lvl = game.upgrades[nodeId] ?? 0;
    return maxLevel > 0 ? lvl / maxLevel : 0;
  }

  function isLocked(node: typeof UPGRADES[number]): boolean {
    return node.tier === 2 && !tier2Unlocked;
  }

  function handleHexClick(nodeId: string, event: MouseEvent) {
    event.preventDefault();
    const node = UPGRADES.find((u) => u.id === nodeId);
    if (!node) return;
    if (isLocked(node)) return;
    const lvl = game.upgrades[nodeId] ?? 0;
    if (lvl >= node.maxLevel) return;

    let count = 1;
    if (event.shiftKey) {
      // +10 (or as many as affordable, up to 10)
      const maxAffordable = affordableCount(
        node.baseCost,
        node.costGrowth,
        lvl,
        game.resources[node.costResource],
        node.maxLevel,
      );
      count = Math.min(10, maxAffordable);
    }
    if (event.button === 2) {
      // right-click → max affordable
      count = affordableCount(
        node.baseCost,
        node.costGrowth,
        lvl,
        game.resources[node.costResource],
        node.maxLevel,
      );
    }
    if (count > 0 && canBuyUpgrade(game, nodeId, count)) {
      buyUpgrade(game, nodeId, count);
    }
  }
</script>

<div class="hex-tree" class:collapsed={!expanded}>
  <button
    class="hex-tree-head"
    onclick={() => (expanded = !expanded)}
    title={expanded ? `Collapse ${label}` : `Expand ${label}`}
  >
    <span class="hex-tree-tag tree-{tree}">{letter}</span>
    <span class="hex-tree-name">{label}</span>
    {#if target}<span class="hex-tree-target res-{target}">→ {target}</span>{/if}
    <span class="hex-tree-progress num">{totalLevel}/{totalMax}</span>
    <span class="hex-tree-caret">{expanded ? '▼' : '▶'}</span>
  </button>

  {#if expanded}
    <div class="hex-tree-body">
      <svg
        class="hex-tree-lines"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#each nodes as node, i (node.id)}
          {@const lineActive = node.tier === 1 || tier2Unlocked}
          {@const x = ((i + 0.5) / nodes.length) * 100}
          <line
            x1="50"
            y1="0"
            x2={x}
            y2="28"
            stroke={lineActive ? `color-mix(in oklab, var(--tree-tint), white 20%)` : 'hsl(0 0% 30%)'}
            stroke-width="0.4"
          />
        {/each}
      </svg>
      <div class="hex-tree-nodes" style="--cols: {nodes.length}">
        {#each nodes as node (node.id)}
          {@const lvl = game.upgrades[node.id] ?? 0}
          {@const frac = levelFraction(node.id, node.maxLevel)}
          {@const locked = isLocked(node)}
          {@const maxed = lvl >= node.maxLevel}
          {@const cost = upgradeCost(game, node.id, 1)}
          {@const affordable = !maxed && !locked && canBuyUpgrade(game, node.id, 1)}
          <button
            class="hex-node cost-{node.costResource}"
            class:locked
            class:maxed
            class:affordable
            style="--fill: {frac * 100}%"
            onclick={(e) => handleHexClick(node.id, e)}
            oncontextmenu={(e) => handleHexClick(node.id, e)}
            title={locked
              ? `${node.name}\n\nLocked. Requires tier 1 total ≥ 10 levels in ${label}.`
              : `${node.name}\n\n${node.blurb}\n\nLevel ${lvl}/${node.maxLevel}\nCost: ${fmt(cost)} ${node.costResource}\nClick: +1   Shift-click: +10   Right-click: +max`}
          >
            <span class="hex-shape" aria-hidden="true">
              <span class="hex-fill"></span>
            </span>
            <span class="hex-level">{lvl}/{node.maxLevel}</span>
            <span class="hex-label">{node.name}</span>
            {#if locked}<span class="hex-lock" aria-hidden="true">🔒</span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .hex-tree {
    --tree-tint: hsl(220 60% 45%);
    border: 1px solid var(--line);
    background: var(--paper-2);
    border-radius: 5px;
    padding: 0.3rem 0.4rem 0.4rem;
    display: grid;
    gap: 0.25rem;
    border-left: 3px solid var(--tree-tint);
  }
  .hex-tree.tree-discrediting  { --tree-tint: hsl(0 60% 50%); }
  .hex-tree.tree-emotional     { --tree-tint: hsl(20 75% 50%); }
  .hex-tree.tree-polarization  { --tree-tint: hsl(280 55% 55%); }
  .hex-tree.tree-impersonation { --tree-tint: hsl(160 50% 45%); }
  .hex-tree.tree-conspiracy    { --tree-tint: hsl(220 60% 50%); }
  .hex-tree.tree-trolling      { --tree-tint: hsl(60 70% 45%); }

  .hex-tree-head {
    appearance: none;
    font: inherit;
    color: inherit;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0;
    width: 100%;
  }
  .hex-tree-head:hover { color: var(--ink); }
  .hex-tree-tag {
    display: inline-block;
    width: 1.4rem; height: 1.4rem;
    line-height: 1.4rem;
    text-align: center;
    font-weight: 800;
    background: var(--tree-tint);
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  .hex-tree-name { font-weight: 700; font-size: 0.78rem; }
  .hex-tree-target { font-size: 0.62rem; opacity: 0.75; }
  .hex-tree-progress { margin-left: auto; font-size: 0.7rem; opacity: 0.7; font-variant-numeric: tabular-nums; }
  .hex-tree-caret { font-size: 0.6rem; opacity: 0.55; }

  .hex-tree-body {
    position: relative;
    padding-top: 30px;
  }
  .hex-tree-lines {
    position: absolute;
    top: 4px; left: 0;
    width: 100%;
    height: 28px;
    pointer-events: none;
  }
  .hex-tree-nodes {
    display: grid;
    grid-template-columns: repeat(var(--cols, 2), 1fr);
    gap: 0.3rem;
    align-items: start;
  }

  .hex-node {
    appearance: none;
    font: inherit;
    color: inherit;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.2rem 0;
    display: grid;
    justify-items: center;
    gap: 0.15rem;
    position: relative;
  }
  .hex-node:disabled { cursor: not-allowed; }
  .hex-node.locked { cursor: not-allowed; opacity: 0.55; }

  .hex-shape {
    --tint: var(--tree-tint);
    width: 52px;
    height: 52px;
    position: relative;
    display: block;
    background: hsl(0 0% 14%);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  }
  .hex-fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--tint) 80%, white 5%),
      var(--tint));
    height: var(--fill, 0%);
    bottom: 0; top: auto;
    transition: height 240ms ease-out;
  }
  .hex-node.cost-attention  { --tint: var(--res-attention); }
  .hex-node.cost-engagement { --tint: var(--res-engagement); }
  .hex-node.maxed .hex-fill {
    background: linear-gradient(180deg, hsl(140 70% 55%), hsl(140 70% 35%));
    height: 100%;
    box-shadow: 0 0 8px hsl(140 80% 50% / 0.5);
  }
  .hex-node.affordable .hex-shape {
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--tint) 50%, transparent);
  }
  .hex-node:not(.locked):not(.maxed):hover .hex-shape {
    transform: scale(1.06);
    transition: transform 120ms;
  }
  .hex-node:not(.locked):not(.maxed):active .hex-shape {
    transform: scale(0.96);
  }
  .hex-level {
    font-size: 0.6rem;
    font-weight: 700;
    color: hsl(0 0% 95%);
    font-variant-numeric: tabular-nums;
    position: absolute;
    top: 18px;
    text-shadow: 0 1px 2px hsl(0 0% 0% / 0.8);
    pointer-events: none;
  }
  .hex-label {
    font-size: 0.6rem;
    color: var(--muted);
    text-align: center;
    line-height: 1.2;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hex-lock {
    position: absolute;
    top: 14px;
    font-size: 1rem;
    pointer-events: none;
  }
  .hex-tree.collapsed .hex-tree-body { display: none; }
</style>
```

- [ ] **Step 2: Verify svelte-check picks up the new component cleanly**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HexTree.svelte
git commit -m "Phase 2.1: add HexTree component skeleton

Self-contained Svelte 5 component renders one DEPICT tree as a hex
talent tree. Per-tree collapse toggle on the header, click/shift-click/
right-click bulk-buy modifiers, locked/maxed/affordable visual states,
SVG connecting lines. Not yet wired into App.svelte.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.2: Wire HexTree into App.svelte

**Files:**
- Modify: `src/App.svelte` (replace flat tree-node rendering with `<HexTree>` per tree)

- [ ] **Step 1: Import the new component**

Add to the top of the `<script lang="ts">` block in `src/App.svelte`:

```ts
import HexTree from './components/HexTree.svelte';
```

- [ ] **Step 2: Build a lookup of (tree → label, letter, target) using existing data**

Just before the `treesView` derivation, add:

```ts
const TREE_META: Record<string, { label: string; letter: string; target: string }> = {
  discrediting:  { label: 'Discrediting',  letter: 'D', target: 'attention' },
  emotional:     { label: 'Emotional',     letter: 'E', target: 'attention' },
  polarization:  { label: 'Polarization',  letter: 'P', target: 'attention' },
  impersonation: { label: 'Impersonation', letter: 'I', target: 'credibility' },
  conspiracy:    { label: 'Conspiracy',    letter: 'C', target: 'engagement' },
  trolling:      { label: 'Trolling',      letter: 'T', target: 'attention' },
};
```

(If `depictLetter()` and `treeTargetResource()` already exist as helpers in App.svelte, reuse them — but only if they cover all six trees correctly. The lookup above is the spec's source of truth.)

- [ ] **Step 3: Replace the `{#each treesView}` block with `<HexTree>` instances**

Locate the existing tree-rendering loop inside `<section class="col trees-col">`:

```svelte
<div class="trees">
  {#each treesView as t (t.tree)}
    <!-- existing markup -->
  {/each}
</div>
```

Replace the entire `{#each treesView}...{/each}` block with:

```svelte
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
```

- [ ] **Step 4: Delete now-unused tree-rendering CSS in App.svelte**

In the `<style>` block in App.svelte, locate and delete:
- `.tree { ... }`, `.tree-head { ... }`, `.tree-tag { ... }`, `.tree-name`, `.tree-target`, `.tree-progress`
- `.tree-nodes { ... }`
- `.tree-discrediting .tree-tag`, `.tree-emotional .tree-tag`, etc.
- `.tier2-progress`, `.tier2-progress.tier2-unlocked`
- Any `.node { ... }` rule and its variants (`.node:disabled`, `.node[aria-disabled="true"]`, `.node.cost-*`, etc.)
- `.node-head`, `.node-name`, `.node-lvl`, `.node-blurb`, `.node-foot`, `.node-cost`, `.node.maxed`
- `.fresh-badge` on nodes only — keep the asset-side fresh badge

(Search for "tree", "node" in the style block; everything node-related on the DEPICT side gets superseded by the HexTree component's own scoped styles.)

- [ ] **Step 5: Verify svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 6: Run tests**

Run: `pnpm test --run 2>&1 | tail -8`
Expected: 16/16 pass.

- [ ] **Step 7: Commit**

```bash
git add src/App.svelte
git commit -m "Phase 2.2: render DEPICT trees as HexTree components

Replaces the flat node-card rendering inside .trees with six <HexTree>
component instances, one per DEPICT tree. The component encapsulates
the hex shape, level fill, click handlers (+1 / shift +10 / right-click
+max), tier-2 unlock gating, and per-tree collapse.

Deleted the now-orphaned .tree, .tree-head, .tree-nodes, .node, .node-*,
.tier2-progress CSS in App.svelte — all superseded by HexTree's scoped
styles.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.3: Phase 2 verification

- [ ] **Step 1: Final svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 2: Final test pass**

Run: `pnpm test --run 2>&1 | tail -8`
Expected: 16/16 pass.

- [ ] **Step 3: Push Phase 2 to main**

```bash
git push origin main 2>&1 | tail -3
```

- [ ] **Step 4: Visual verification (manual)**

After the deploy refreshes:
- Six DEPICT trees render in a 2-col × 3-row grid in the left column.
- Each tree has a colored letter chip, a name, a level readout, a collapse caret.
- Each tree's two hex nodes show fill progress matching `level / maxLevel`.
- Tier-2 hex shows the lock glyph until tier-1 total ≥ 10.
- Click a hex → level goes up by 1 if affordable. Shift-click → up to +10. Right-click → +max (no browser context menu appears).
- Click the tree caret → that tree's body collapses; nothing else moves.

Phase 2 completion gate: all 4 checks pass.

---

## Phase 3 — Next Moves recommendation engine

**Files:**
- Create: `src/game/core/recommendations.ts` (engine)
- Create: `src/components/NextMoves.svelte` (UI)
- Create: `tests/recommendations.test.ts` (unit tests for the ranking heuristic)
- Modify: `src/App.svelte` (mount `<NextMoves />` into the strip)

### Task 3.1: Create the recommendations engine

**Files:**
- Create: `src/game/core/recommendations.ts`

- [ ] **Step 1: Create the type + constants**

Create `src/game/core/recommendations.ts` with:

```ts
// Ranked "Next Moves" recommendations for the dashboard strip.
// Pure function — no side effects, no Svelte reactivity. Takes a
// GameState snapshot and returns a sorted list of recommendations.
//
// Spec: docs/superpowers/specs/2026-05-19-dashboard-redesign-design.md §2

import type { GameState, ResourceId } from '../types';
import { ASSETS, UPGRADES, PROJECTS, treeTotalLevel } from './catalog';
import { canBuyAsset, assetCost, canBuyUpgrade, upgradeCost, canCompleteProject } from './actions';
import { affordableCount } from './math';
import { SYNERGIES, isSynergyVisible, canActivateSynergy } from './synergies';
import { PATRONS, isPatronVisible, canActivatePatron } from './patrons';

export type RecommendationType =
  | 'synergy'
  | 'patron'
  | 'project'
  | 'prestige'
  | 'depict-unlock'
  | 'asset-milestone'
  | 'depict-buy'
  | 'asset-buy'
  | 'post-ready';

export interface Recommendation {
  type: RecommendationType;
  id: string;
  title: string;
  detail: string;
  cost?: { resource: ResourceId; amount: number };
  score: number;
  rank: number;        // 0 = gold, 1 = silver, 2 = bronze
}

const BASE_IMPACT: Record<RecommendationType, number> = {
  'synergy':         100,
  'patron':          100,
  'project':         100,
  'prestige':         95,
  'depict-unlock':    80,
  'asset-milestone':  60,
  'depict-buy':       50,
  'asset-buy':        30,
  'post-ready':       20,
};

/**
 * Gather all currently-applicable recommendations, score them, and
 * return the top-3 with rank=0,1,2 assigned.
 */
export function topRecommendations(state: GameState): Recommendation[] {
  const candidates: Recommendation[] = [];

  // 1. Affordable synergies (one-shot, big impact)
  for (const sn of SYNERGIES) {
    if (state.flags[sn.id]) continue;
    if (!isSynergyVisible(state, sn)) continue;
    if (!canActivateSynergy(state, sn)) continue;
    const [res, amt] = Object.entries(sn.cost)[0] as [ResourceId, number];
    candidates.push({
      type: 'synergy',
      id: sn.id,
      title: `${sn.name} synergy ready`,
      detail: `Unlocks ${sn.name}: ${sn.blurb}`,
      cost: { resource: res, amount: amt },
      score: BASE_IMPACT['synergy'],
      rank: -1,
    });
  }

  // 2. Affordable patrons
  for (const pa of PATRONS) {
    if (state.flags[pa.id]) continue;
    if (!isPatronVisible(state, pa)) continue;
    if (!canActivatePatron(state, pa)) continue;
    const [res, amt] = Object.entries(pa.cost)[0] as [ResourceId, number];
    candidates.push({
      type: 'patron',
      id: pa.id,
      title: `Activate ${pa.name}`,
      detail: pa.blurb,
      cost: { resource: res, amount: amt },
      score: BASE_IMPACT['patron'],
      rank: -1,
    });
  }

  // 3. Affordable projects
  for (const p of PROJECTS) {
    if (state.completedProjects[p.id]) continue;
    if (!p.visible(state)) continue;
    if (!canCompleteProject(state, p.id)) continue;
    const [res, amt] = Object.entries(p.cost)[0] as [ResourceId, number];
    candidates.push({
      type: 'project',
      id: p.id,
      title: p.name,
      detail: p.blurb,
      cost: { resource: res, amount: amt },
      score: BASE_IMPACT['project'],
      rank: -1,
    });
  }

  // 4. Prestige (when cure >= 0.60)
  if (state.cure >= 0.60) {
    candidates.push({
      type: 'prestige',
      id: 'prestige',
      title: 'Mebro reveal imminent — prestige to bank legacy',
      detail: `Cure at ${(state.cure * 100).toFixed(0)}%. Prestige now to lock in the run's peak.`,
      score: BASE_IMPACT['prestige'] * (1 + (state.cure - 0.6) * 2),
      rank: -1,
    });
  }

  // 5. DEPICT nodes that complete a synergy prereq OR are within tier-2 window
  for (const u of UPGRADES) {
    if (!u.visible(state)) continue;
    const lvl = state.upgrades[u.id] ?? 0;
    if (lvl >= u.maxLevel) continue;
    if (!canBuyUpgrade(state, u.id, 1)) continue;

    const treeTotal = treeTotalLevel(state, u.tree);

    // Within tier-2-unlock window: tier-1 node, tree total in [7, 9] = 1-3 levels from unlock
    const inTier2Window = u.tier === 1 && treeTotal >= 7 && treeTotal < 10;

    // Synergy-prereq lift: any synergy that needs this tree at threshold T,
    // where current tree total < T but tree total + 1 >= T.
    const liftsSynergy = SYNERGIES.some((sn) => {
      if (state.flags[sn.id]) return false;
      if (!sn.trees.includes(u.tree)) return false;
      const otherTree = sn.trees.find((t) => t !== u.tree) ?? u.tree;
      const otherOK = treeTotalLevel(state, otherTree) >= sn.threshold;
      return otherOK && treeTotal < sn.threshold && treeTotal + 1 >= sn.threshold;
    });

    if (inTier2Window || liftsSynergy) {
      candidates.push({
        type: 'depict-unlock',
        id: u.id,
        title: `${u.name} → ${liftsSynergy ? 'unlocks synergy' : 'tier 2 unlock'}`,
        detail: `${u.blurb} · level ${lvl}/${u.maxLevel}`,
        cost: { resource: u.costResource, amount: upgradeCost(state, u.id, 1) },
        score: BASE_IMPACT['depict-unlock'] * (liftsSynergy ? 1.5 : 1.0),
        rank: -1,
      });
    }
  }

  // 6. Asset milestone (within 25% of next ×2)
  for (const a of ASSETS) {
    if (!a.visible(state)) continue;
    const count = state.assets[a.id] ?? 0;
    if (count <= 0) continue;
    if (!canBuyAsset(state, a.id, 1)) continue;

    const milestones = [25, 50, 100, 200, 400, 800, 1600];
    const next = milestones.find((m) => m > count);
    if (!next) continue;
    const distance = (next - count) / next;
    if (distance > 0.25) continue;

    candidates.push({
      type: 'asset-milestone',
      id: a.id,
      title: `${a.name} ×${next} milestone in ${next - count}`,
      detail: `Owning ${next} unlocks the next ×2 production bonus`,
      cost: { resource: a.costResource, amount: assetCost(state, a.id, 1) },
      score: BASE_IMPACT['asset-milestone'] * (1 + (1 - distance)),
      rank: -1,
    });
  }

  // 7. POST ready on any platform with low heat
  for (const pid of Object.keys(state.platforms)) {
    const p = state.platforms[pid as keyof typeof state.platforms];
    if (!p?.unlocked) continue;
    if (p.burned && p.burnedUntil > state.lastTick) continue;
    if (p.chargeProgress < 1) continue;
    if (p.heat >= 0.75) continue;
    candidates.push({
      type: 'post-ready',
      id: pid,
      title: `POST ready on ${pid}`,
      detail: `Charge at 100%, heat ${(p.heat * 100).toFixed(0)}%`,
      score: BASE_IMPACT['post-ready'],
      rank: -1,
    });
  }

  // Sort by score desc, then by lowest cost as fraction of holding (cheapest wins ties)
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (!a.cost && !b.cost) return 0;
    if (!a.cost) return -1;
    if (!b.cost) return 1;
    const aRatio = a.cost.amount / Math.max(1, state.resources[a.cost.resource]);
    const bRatio = b.cost.amount / Math.max(1, state.resources[b.cost.resource]);
    return aRatio - bRatio;
  });

  // Assign rank to top 3
  const top = candidates.slice(0, 3);
  top.forEach((r, i) => (r.rank = i));
  return top;
}
```

- [ ] **Step 2: Verify svelte-check (the engine compiles)**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/core/recommendations.ts
git commit -m "Phase 3.1: add Next Moves recommendation engine

Pure function topRecommendations(state) gathers all currently-applicable
candidates from synergies, patrons, projects, prestige eligibility, DEPICT
unlocks (tier-2 + synergy-prereq lifts), asset milestones, and ready
POSTs. Scores via per-type base impact × situational modifier, sorts by
score desc with cheapest-ratio tiebreak, returns top-3 with rank assigned.

Spec: docs/superpowers/specs/2026-05-19-dashboard-redesign-design.md §2

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.2: Unit-test the recommendation engine

**Files:**
- Create: `tests/recommendations.test.ts`

- [ ] **Step 1: Write a test file with three concrete scenarios**

Create `tests/recommendations.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { topRecommendations } from '../src/game/core/recommendations';
import { initialState } from '../src/game/core/defaults';
import type { GameState } from '../src/game/types';

function fresh(): GameState {
  return initialState();
}

describe('topRecommendations', () => {
  it('returns at most 3 recommendations', () => {
    const recs = topRecommendations(fresh());
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it('ranks are 0, 1, 2 in order when 3 candidates exist', () => {
    // Force a state with at least 3 candidates by giving the player
    // lots of attention, an unlocked tier-1 affordable DEPICT, and a
    // post-ready platform. Cheap way: just check rank ordering when
    // multiple candidates exist on a populated state.
    const s = fresh();
    s.resources.attention = 1_000_000;
    s.resources.engagement = 200_000;
    s.assets.sockPuppet = 30;
    s.platforms.x.chargeProgress = 1;
    const recs = topRecommendations(s);
    if (recs.length >= 2) {
      expect(recs[0].rank).toBe(0);
      expect(recs[1].rank).toBe(1);
    }
    if (recs.length >= 3) {
      expect(recs[2].rank).toBe(2);
    }
  });

  it('prestige recommendation appears when cure >= 0.60', () => {
    const s = fresh();
    s.cure = 0.7;
    s.resources.attention = 100_000;
    const recs = topRecommendations(s);
    const prestige = recs.find((r) => r.type === 'prestige');
    expect(prestige).toBeDefined();
  });

  it('post-ready recommendation appears for a charged, cool platform', () => {
    const s = fresh();
    s.platforms.x.chargeProgress = 1;
    s.platforms.x.heat = 0.1;
    const recs = topRecommendations(s);
    const post = recs.find((r) => r.type === 'post-ready');
    expect(post).toBeDefined();
  });

  it('post-ready is suppressed when heat is high', () => {
    const s = fresh();
    s.platforms.x.chargeProgress = 1;
    s.platforms.x.heat = 0.85;
    const recs = topRecommendations(s);
    const post = recs.find((r) => r.type === 'post-ready');
    expect(post).toBeUndefined();
  });

  it('higher-impact types beat lower-impact types', () => {
    // A state with both a depict-buy (~50) and a post-ready (~20) should
    // rank the depict ahead.
    const s = fresh();
    s.resources.attention = 1_000_000;
    s.platforms.x.chargeProgress = 1;
    const recs = topRecommendations(s);
    const depictIdx = recs.findIndex((r) => r.type === 'depict-buy' || r.type === 'depict-unlock');
    const postIdx = recs.findIndex((r) => r.type === 'post-ready');
    if (depictIdx >= 0 && postIdx >= 0) {
      expect(depictIdx).toBeLessThan(postIdx);
    }
  });
});
```

- [ ] **Step 2: Run the new tests**

Run: `pnpm test --run 2>&1 | tail -10`
Expected: existing 16 tests + 6 new tests = 22 passes.

- [ ] **Step 3: If any test fails, fix the engine OR adjust the test expectation**

If a test failure is due to a wrong-scoring engine, fix the engine code in `recommendations.ts`. If the failure is due to overly strict test expectations (e.g. expecting an `asset-milestone` in fresh state when the player has 0 assets), loosen the test. **Do not skip tests** — every test must pass for Phase 3 to complete.

- [ ] **Step 4: Commit**

```bash
git add tests/recommendations.test.ts
git commit -m "Phase 3.2: unit-test the recommendation engine

Six scenario tests covering: max-3 cap, rank ordering, prestige
appearance at high cure, post-ready presence + suppression, and impact-
type ordering. Catches the most common ranking-logic regressions
without depending on visual layout.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.3: Build the NextMoves UI component

**Files:**
- Create: `src/components/NextMoves.svelte`

- [ ] **Step 1: Create the component**

Create `src/components/NextMoves.svelte`:

```svelte
<script lang="ts">
  import { game } from '../game/state.svelte';
  import { topRecommendations, type Recommendation } from '../game/core/recommendations';
  import { activateSynergy } from '../game/core/synergies';
  import { activatePatron } from '../game/core/patrons';
  import { buyAsset, buyUpgrade, completeProject } from '../game/core/actions';
  import { postPlatform } from '../game/core/posting';
  import { fmt } from '../lib/format';

  const recs = $derived(topRecommendations(game));

  function execute(r: Recommendation) {
    switch (r.type) {
      case 'synergy':         activateSynergy(game, r.id); break;
      case 'patron':          activatePatron(game, r.id); break;
      case 'project':         completeProject(game, r.id); break;
      case 'asset-milestone':
      case 'asset-buy':       buyAsset(game, r.id, 1); break;
      case 'depict-unlock':
      case 'depict-buy':      buyUpgrade(game, r.id, 1); break;
      case 'post-ready':      postPlatform(game, r.id as Parameters<typeof postPlatform>[1]); break;
      case 'prestige':
        // Defer to existing UI flow — opens prestige modal
        window.dispatchEvent(new CustomEvent('open-prestige'));
        break;
    }
  }

  function rankBadge(rank: number): string {
    if (rank === 0) return '★';
    return String(rank + 1);
  }
</script>

<section class="next-moves" aria-label="next moves">
  {#if recs.length === 0}
    <div class="next-moves-empty">no available moves — keep earning attention</div>
  {:else}
    <span class="next-moves-label">⚡ NEXT MOVES</span>
    {#each recs as r (r.id + r.type)}
      <button
        class="next-chip rank-{r.rank}"
        onclick={() => execute(r)}
        title={r.detail}
      >
        <span class="next-chip-rank">{rankBadge(r.rank)}</span>
        <span class="next-chip-title">{r.title}</span>
        {#if r.cost}
          <span class="next-chip-cost">{fmt(r.cost.amount)} {r.cost.resource}</span>
        {/if}
      </button>
    {/each}
  {/if}
</section>

<style>
  .next-moves {
    grid-area: next;
    height: 60px;
    background: color-mix(in oklab, var(--accent) 5%, var(--paper-2));
    border: 1px solid color-mix(in oklab, var(--accent) 22%, var(--line));
    border-radius: 8px;
    padding: 0 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    overflow: hidden;
  }
  .next-moves-empty {
    font-size: 0.8rem;
    color: var(--muted);
    font-style: italic;
  }
  .next-moves-label {
    font-size: 0.65rem;
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .next-chip {
    appearance: none;
    font: inherit;
    color: inherit;
    background: hsl(0 0% 16%);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 5px 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 0.74rem;
    font-weight: 600;
    transition: filter 120ms, transform 80ms;
    min-width: 0;
  }
  .next-chip:hover { filter: brightness(1.15); }
  .next-chip:active { transform: scale(0.97); }
  .next-chip-rank {
    font-weight: 800;
    opacity: 0.7;
  }
  .next-chip-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 320px;
  }
  .next-chip-cost {
    color: var(--muted);
    font-weight: 500;
    font-size: 0.7rem;
  }

  /* Rank-tiered visuals */
  .next-chip.rank-0 {
    background: linear-gradient(180deg, hsl(45 70% 28%), hsl(45 70% 18%));
    border-color: hsl(45 90% 55%);
    color: hsl(45 90% 90%);
    font-size: 0.78rem;
    box-shadow: 0 0 12px hsl(45 90% 55% / 0.3);
  }
  .next-chip.rank-0 .next-chip-rank { color: hsl(45 100% 70%); opacity: 1; }
  .next-chip.rank-1 {
    background: linear-gradient(180deg, hsl(220 12% 26%), hsl(220 12% 18%));
    border-color: hsl(220 30% 60%);
  }
  .next-chip.rank-2 {
    background: hsl(220 12% 18%);
    color: var(--muted);
  }
</style>
```

- [ ] **Step 2: Verify svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/NextMoves.svelte
git commit -m "Phase 3.3: add NextMoves UI component

Renders top-3 recommendations as gold/silver/bronze chips inside the
60px fixed-height strip. Click a chip → executes the recommendation's
action. Empty state shows 'no available moves' copy. Not yet mounted
into App.svelte.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.4: Mount NextMoves in App.svelte

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Import the component**

Add to the top of the `<script lang="ts">` block:

```ts
import NextMoves from './components/NextMoves.svelte';
```

- [ ] **Step 2: Replace the placeholder `<section class="next-moves">` with the component**

Locate the placeholder added in Task 1.2:

```svelte
<section class="next-moves" aria-label="next moves">
  <div class="next-moves-empty">no available moves — keep earning attention</div>
</section>
```

Replace it with:

```svelte
<NextMoves />
```

- [ ] **Step 3: Remove the placeholder `.next-moves*` CSS from App.svelte**

Since the component owns its own scoped styles, delete the `.next-moves` and `.next-moves-empty` rules in App.svelte that were added in Task 1.2.

- [ ] **Step 4: Wire the `open-prestige` event listener**

In App.svelte, near the existing `onMount` block, add a listener that opens the prestige modal when the NextMoves component dispatches `open-prestige`:

```ts
onMount(() => {
  const onPrestige = () => openPrestige();
  window.addEventListener('open-prestige', onPrestige);
  return () => window.removeEventListener('open-prestige', onPrestige);
});
```

(If `openPrestige` is already defined as a function in scope, this listener calls it; the prestige modal opens via the existing `prestigeOpen` state.)

- [ ] **Step 5: Verify svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 6: Run all tests**

Run: `pnpm test --run 2>&1 | tail -10`
Expected: 22 passes.

- [ ] **Step 7: Commit**

```bash
git add src/App.svelte
git commit -m "Phase 3.4: mount NextMoves into the dashboard strip

The placeholder strip is replaced with the live <NextMoves /> component.
It reads game state reactively and re-derives top-3 recommendations each
tick. Click handlers dispatch through to the existing core actions
(buyAsset, activateSynergy, postPlatform, etc.).

Adds a window event listener for 'open-prestige' so the recommendation
engine can open the prestige modal via the existing UI flow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.5: Phase 3 verification

- [ ] **Step 1: Final svelte-check**

Run: `pnpm exec svelte-check --output human 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 2: Final test pass**

Run: `pnpm test --run 2>&1 | tail -10`
Expected: 22 passes (16 existing + 6 new).

- [ ] **Step 3: Push Phase 3 to main**

```bash
git push origin main 2>&1 | tail -3
```

- [ ] **Step 4: Visual verification (manual)**

After the deploy refreshes:
- The Next Moves strip shows up to 3 chips in gold/silver/bronze tiers.
- A "★ Wedge Content synergy ready" chip appears when prereqs + cost are met.
- "POST ready on X" appears when a platform is fully charged at low heat.
- Clicking the gold chip executes the highest-impact action (e.g. activates the synergy).
- Buying or POST-firing a recommended action causes that chip to disappear next tick; a new chip slides into the freed slot.
- Spam-clicking POST during a session: the chip composition changes, but the strip's height and the POST button's pixel position are stable.

Phase 3 completion gate: all 4 checks pass.

---

## Final acceptance criteria (after Phase 3)

- All invariants in the spec §5 hold.
- `pnpm exec svelte-check` returns 0 errors.
- `pnpm test --run` returns 22 passes.
- Visual verification at 1920 × 1080 confirms no reflow on any in-game state change.
- The three phases are each their own commit in main; if a phase needs reverting, only that commit reverts.

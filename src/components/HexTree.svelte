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

  // Nodes in this tree, in catalog order.
  const nodes = $derived(UPGRADES.filter((u) => u.tree === tree));

  // Tier-2 unlock condition: tier-1 total levels >= 10.
  const tier1TotalLevels = $derived(
    nodes
      .filter((n) => n.tier === 1)
      .reduce((acc, n) => acc + (game.upgrades[n.id] ?? 0), 0),
  );
  const tier2Unlocked = $derived(tier1TotalLevels >= 10);

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

  // Compact per-level effect text shown under each hex.
  // e.g. "+1.5% att/lvl · now +9%"  for a leveled node
  //      "+1.5% att/lvl"            for an unlearned one
  function effectText(node: typeof UPGRADES[number], lvl: number): string {
    const RES_ABBR: Record<string, string> = {
      attention: 'att',
      engagement: 'eng',
      followers: 'fol',
      credibility: 'cred',
      narrativeDominance: 'nar',
      syntheticReality: 'syn',
    };
    return Object.entries(node.multiplier).map(([res, per]) => {
      const perPct = ((per as number) * 100).toFixed(1);
      const abbr = RES_ABBR[res] ?? res;
      if (lvl > 0) {
        const totalPct = ((per as number) * lvl * 100).toFixed(1);
        return `+${perPct}% ${abbr}/lvl · now +${totalPct}%`;
      }
      return `+${perPct}% ${abbr}/lvl`;
    }).join(' · ');
  }

  // Tree-level affordability cue: true if any non-locked, non-maxed node
  // in this tree is currently affordable. Drives a pulse on the tree
  // header and on each affordable hex.
  const hasAffordable = $derived(
    nodes.some((n) => {
      if (isLocked(n)) return false;
      const lvl = game.upgrades[n.id] ?? 0;
      if (lvl >= n.maxLevel) return false;
      return canBuyUpgrade(game, n.id, 1);
    }),
  );

  function handleHexClick(nodeId: string, event: MouseEvent) {
    event.preventDefault();
    const node = UPGRADES.find((u) => u.id === nodeId);
    if (!node) return;
    if (isLocked(node)) return;
    const lvl = game.upgrades[nodeId] ?? 0;
    if (lvl >= node.maxLevel) return;

    let count = 1;
    if (event.shiftKey) {
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

<div class="hex-tree tree-{tree}" class:has-affordable={hasAffordable}>
  <div class="hex-tree-head">
    <span class="hex-tree-tag">
      {letter}
      {#if hasAffordable}<span class="hex-tree-affordable-dot" aria-label="affordable upgrade available"></span>{/if}
    </span>
    <span class="hex-tree-name">{label}</span>
    {#if target}<span class="hex-tree-target res-{target}">→ {target}</span>{/if}
    <span class="hex-tree-progress num">{totalLevel}/{totalMax}</span>
  </div>

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
            stroke={lineActive ? 'var(--tree-tint)' : 'hsl(0 0% 30%)'}
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
            <span class="hex-effect">{effectText(node, lvl)}</span>
            {#if locked}<span class="hex-lock" aria-hidden="true">🔒</span>{/if}
          </button>
        {/each}
      </div>
    </div>
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
    /* Stop labels from overflowing into sibling tree cells. */
    overflow: hidden;
    min-width: 0;
  }
  .hex-tree.tree-discrediting  { --tree-tint: hsl(0 60% 50%); }
  .hex-tree.tree-emotional     { --tree-tint: hsl(20 75% 50%); }
  .hex-tree.tree-polarization  { --tree-tint: hsl(280 55% 55%); }
  .hex-tree.tree-impersonation { --tree-tint: hsl(160 50% 45%); }
  .hex-tree.tree-conspiracy    { --tree-tint: hsl(220 60% 50%); }
  .hex-tree.tree-trolling      { --tree-tint: hsl(60 70% 45%); }

  .hex-tree-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
  }
  .hex-tree-tag {
    position: relative;
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
  /* Affordable dot on the tree-letter chip — small pulsing accent so the
     eye picks up "this tree has something you can buy right now". */
  .hex-tree-affordable-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ok);
    box-shadow: 0 0 6px var(--ok);
    animation: hex-tree-dot-pulse 1.4s ease-in-out infinite;
  }
  @keyframes hex-tree-dot-pulse {
    0%, 100% { transform: scale(1);    opacity: 1; }
    50%      { transform: scale(0.7);  opacity: 0.6; }
  }
  /* When the tree has at least one affordable node, give the whole card
     a subtle accent border so it stands out against the others. */
  .hex-tree.has-affordable {
    border-color: color-mix(in oklab, var(--ok) 35%, var(--line));
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--ok) 15%, transparent);
  }
  .hex-tree-name { font-weight: 700; font-size: 0.78rem; }
  .hex-tree-target { font-size: 0.62rem; opacity: 0.75; }
  .hex-tree-progress { margin-left: auto; font-size: 0.7rem; opacity: 0.7; font-variant-numeric: tabular-nums; }

  .hex-tree-body {
    position: relative;
    padding-top: 22px;
  }
  .hex-tree-lines {
    position: absolute;
    top: 2px; left: 0;
    width: 100%;
    height: 20px;
    pointer-events: none;
  }
  .hex-tree-nodes {
    display: grid;
    grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
    gap: 0.4rem;
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
    gap: 0.1rem;
    position: relative;
    min-width: 0;
    overflow: hidden;
  }
  .hex-node:disabled { cursor: not-allowed; }
  .hex-node.locked { cursor: not-allowed; opacity: 0.55; }

  .hex-shape {
    --tint: var(--tree-tint);
    width: 44px;
    height: 44px;
    position: relative;
    display: block;
    background: hsl(0 0% 14%);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    flex-shrink: 0;
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
  /* Strong affordable cue: hex shape gets a glowing ring + pulse so
     the eye picks it out even at small sizes. */
  .hex-node.affordable .hex-shape {
    box-shadow:
      0 0 0 2px color-mix(in oklab, var(--tint) 70%, transparent),
      0 0 10px color-mix(in oklab, var(--tint) 60%, transparent);
    animation: hex-affordable-pulse 1.8s ease-in-out infinite;
  }
  @keyframes hex-affordable-pulse {
    0%, 100% { filter: brightness(1); }
    50%      { filter: brightness(1.25); }
  }
  .hex-node:not(.locked):not(.maxed):hover .hex-shape {
    transform: scale(1.06);
    transition: transform 120ms;
  }
  .hex-node:not(.locked):not(.maxed):active .hex-shape {
    transform: scale(0.96);
  }
  .hex-level {
    font-size: 0.58rem;
    font-weight: 700;
    color: hsl(0 0% 95%);
    font-variant-numeric: tabular-nums;
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    text-shadow: 0 1px 2px hsl(0 0% 0% / 0.8);
    pointer-events: none;
  }
  .hex-label {
    font-size: 0.58rem;
    color: var(--muted);
    text-align: center;
    line-height: 1.15;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 2px;
    box-sizing: border-box;
    font-weight: 600;
  }
  /* Per-level effect, e.g. "+1.5% att/lvl · now +9%". Sits under the
     name label so the player can see what a hex actually does without
     hovering. Truncates at narrow widths. */
  .hex-effect {
    font-size: 0.52rem;
    color: var(--ok);
    text-align: center;
    line-height: 1.15;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 2px;
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
  }
  .hex-node.locked .hex-effect { opacity: 0.5; }
  .hex-node.maxed .hex-effect { color: hsl(140 70% 60%); }
  .hex-lock {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.85rem;
    pointer-events: none;
  }
</style>

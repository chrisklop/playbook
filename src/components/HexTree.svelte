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

<div class="hex-tree tree-{tree}" class:collapsed={!expanded}>
  <button
    class="hex-tree-head"
    onclick={() => (expanded = !expanded)}
    title={expanded ? `Collapse ${label}` : `Expand ${label}`}
  >
    <span class="hex-tree-tag">{letter}</span>
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
  }
  .hex-lock {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.85rem;
    pointer-events: none;
  }
  .hex-tree.collapsed .hex-tree-body { display: none; }
</style>

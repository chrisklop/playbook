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

<!--
  Single-line phase HUD. Progress bar is the BACKGROUND FILL of the row
  itself (left-anchored color stripe) so we don't burn a second row on a
  separate bar. "Unlocks" text moved to a tooltip on the next-phase
  label. Total height ~22px (was 32px+).
-->
<div class="phase-hud">
  {#if milestone}
    {@const pct = Math.min(100, (milestone.current / milestone.target) * 100)}
    <div class="phase-fill" style="--fill: {pct}%"></div>
    <div class="phase-row">
      <span class="phase-tag">{milestone.label}</span>
      <span class="phase-progress-text">
        {fmt(milestone.current)}/{fmt(milestone.target)} {resourceWord(game.phase)}
      </span>
      <span class="phase-arrow">→</span>
      <strong class="phase-next" title={milestone.unlocks}>{milestone.nextLabel}</strong>
      <span class="phase-pct">{pct.toFixed(0)}%</span>
    </div>
  {:else}
    <div class="phase-fill complete" style="--fill: 100%"></div>
    <div class="phase-row">
      <span class="phase-tag">AI SATURATION</span>
      <span class="phase-progress-text endgame">endgame — push for prestige</span>
    </div>
  {/if}
</div>

<style>
  .phase-hud {
    position: relative;
    display: flex;
    align-items: center;
    padding: 2px 12px;
    background: color-mix(in oklab, var(--ink) 4%, var(--paper-2));
    border-bottom: 1px solid var(--line);
    font-size: 0.72rem;
    height: 22px;
    overflow: hidden;
  }
  .phase-fill {
    position: absolute;
    inset: 0;
    width: var(--fill, 0%);
    background: linear-gradient(
      90deg,
      color-mix(in oklab, var(--accent) 16%, transparent),
      color-mix(in oklab, var(--ok) 14%, transparent)
    );
    transition: width 280ms ease-out;
    pointer-events: none;
  }
  .phase-fill.complete {
    background: color-mix(in oklab, var(--ok) 18%, transparent);
  }
  .phase-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    z-index: 1;
  }
  .phase-tag {
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--accent);
    flex-shrink: 0;
  }
  .phase-progress-text {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }
  .phase-progress-text.endgame { color: var(--muted); font-style: italic; }
  .phase-arrow { color: var(--muted); }
  .phase-next {
    color: var(--ok);
    cursor: help;
    letter-spacing: 0.04em;
  }
  .phase-pct {
    margin-left: auto;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    font-size: 0.68rem;
    flex-shrink: 0;
  }
</style>

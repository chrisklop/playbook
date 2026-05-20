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

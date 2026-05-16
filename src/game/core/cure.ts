// Cure milestone events. Each fires ONCE when its condition is met, applying a
// discrete cure jump and a logged headline rooted in a real fact-checking case.
//
// Design (PLAN.md §6.2): cure is not background drift — it's the counter-pressure
// network responding to your scale. Each milestone names what flipped on you.

import type { GameState } from '../types';

export interface CureEvent {
  id: string;
  trigger: (s: GameState) => boolean;
  cureJump: number;        // 0..1, added to state.cure (capped at 1)
  headline: string;
  precedent: string;
}

export const CURE_EVENTS: CureEvent[] = [
  {
    id: 'snopes-first-flag',
    // First time you enter Blog era (Facebook unlocked), fact-checkers notice.
    trigger: (s) => s.phase !== 'grassroots' && !s.flags['cure:snopes-first-flag'],
    cureJump: 0.01,
    headline: 'Snopes flags your top post. "Rating: False." A small dent in the dam.',
    precedent: 'Snopes was founded in 1994; by 2016 it was processing 50+ election-related claims/week. Their fact-checks rarely "win" but compound.',
  },
  {
    id: 'media-matters-investigation',
    // Heavy bot operation triggers a coordinated-inauthentic investigation.
    trigger: (s) => {
      if (s.flags['cure:media-matters-investigation']) return false;
      const bots = (s.assets.sockPuppet ?? 0) + (s.assets.doppelganger ?? 0);
      return bots >= 50 && s.phase !== 'grassroots';
    },
    cureJump: 0.03,
    headline: 'A watchdog publishes a thread mapping your fake-account network.',
    precedent: 'Media Matters, Bellingcat, DFRLab, Graphika routinely publish OSINT exposés of coordinated inauthentic networks. Spamouflage Dragon, Doppelganger, IRA all surfaced this way.',
  },
  {
    id: 'platform-policy-change',
    // Mass-Report or trolling at scale triggers a Trust-and-Safety response.
    trigger: (s) => {
      if (s.flags['cure:platform-policy-change']) return false;
      const trolling = (s.upgrades['trolling-1'] ?? 0) + (s.upgrades['trolling-2'] ?? 0);
      return trolling >= 20;
    },
    cureJump: 0.04,
    headline: 'X updates its mass-reporting policy. Some of your accounts go quiet.',
    precedent: 'Twitter\'s 2018 "Healthy Conversations" change, Meta\'s 2021 "coordinated inauthentic behavior" framework, TikTok\'s 2023 election-integrity policy — all platform responses to scale problems.',
  },
  {
    id: 'investigative-piece',
    // Crossing meaningful engagement scale gets a long-form investigation.
    trigger: (s) => !s.flags['cure:investigative-piece'] && s.resources.engagement >= 500_000,
    cureJump: 0.05,
    headline: 'NYT/WaPo runs a 6,000-word investigation naming your operation.',
    precedent: 'NYT Magazine\'s 2018 "Russian Trolls Are Still Active" piece, ProPublica\'s ongoing IRA work, BuzzFeed\'s 2016 Macedonian Veles exposé. Long-form investigations land hard on operations they name.',
  },
  {
    id: 'criminal-referral',
    // Large-scale crisis-actor or impersonation work triggers a lawsuit.
    trigger: (s) => {
      if (s.flags['cure:criminal-referral']) return false;
      const conspiracy = s.upgrades['conspiracy-2'] ?? 0;
      const impersonation = s.upgrades['impersonation-2'] ?? 0;
      return conspiracy >= 10 || impersonation >= 10;
    },
    cureJump: 0.06,
    headline: 'A defamation suit lands. Settle or fight; either way, discovery is brutal.',
    precedent: 'Alex Jones / Sandy Hook families: $1.5B judgment (2022). Dominion v Fox News: $787M settlement (2023). E. Jean Carroll v Trump: $83.3M (2024). Defamation suits are slow but devastating when they hit.',
  },
  {
    id: 'isd-graphika-report',
    trigger: (s) => !s.flags['cure:isd-graphika-report'] && (s.assets.spamouflage ?? 0) >= 3,
    cureJump: 0.04,
    headline: 'Graphika publishes an OSINT thread mapping your AI-generated personas across TikTok and X.',
    precedent: 'Graphika "Spamouflage Dragon" reporting (2019–2024); Mandiant "Dragonbridge"; Meta\'s Q1 2023 takedown of ~5,000 accounts. State-network attribution is a real ongoing process.',
  },
  {
    id: 'platform-collective-action',
    trigger: (s) => !s.flags['cure:platform-collective-action'] && s.phase === 'social',
    cureJump: 0.05,
    headline: 'EU DSA enforcement: TikTok, YT, X formalize "election integrity" cooperation. Your rate limits tighten.',
    precedent: 'EU Digital Services Act (in force Feb 2024) requires "Very Large Online Platforms" to mitigate systemic risk from election disinfo. Real cross-platform enforcement floor.',
  },
  {
    id: 'whistleblower-leak',
    trigger: (s) => {
      if (s.flags['cure:whistleblower-leak']) return false;
      const totalBots = (s.assets.sockPuppet ?? 0) +
        (s.assets.doppelganger ?? 0) +
        (s.assets.spamouflage ?? 0);
      return totalBots >= 500;
    },
    cureJump: 0.07,
    headline: 'A former operator leaks 4,000 internal pages to a major outlet. Photos and all.',
    precedent: 'Frances Haugen (Facebook Papers, 2021); Sophie Zhang (Facebook coordinated-inauthentic-behavior whistleblower); Daniel Motaung (Sama/Facebook moderator suit, 2022). Insiders defect.',
  },
];

export function tickCureEvents(state: GameState): void {
  for (const ev of CURE_EVENTS) {
    if (ev.trigger(state)) {
      state.flags[`cure:${ev.id}`] = true;
      state.cure = Math.min(1, state.cure + ev.cureJump);
      state.log.unshift(`⚠ ${ev.headline}`);
    }
  }
}

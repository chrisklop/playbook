// Display + balance metadata for platform cards.
// Each platform carries an audience profile, a DEPICT amplification matrix
// (per PLAN.md §5.1), and a real-world precedent tag for future codex links.

import type { PhaseId, PlatformId, DepictId } from '../game/types';

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  unlocksAt: PhaseId;
  audience: string;
  moderation: number;                    // 0..1 — higher = heat decays faster
  amp: Record<DepictId, number>;         // DEPICT amplification matrix
  tint: string;
  // Cited real-world ops/research that map onto this platform's role.
  precedent: string;
}

// Amplification rows from PLAN.md §5.1 — order is D, E, P, I, C, T.
function amp(d: number, e: number, p: number, i: number, c: number, t: number): Record<DepictId, number> {
  return { discrediting: d, emotional: e, polarization: p, impersonation: i, conspiracy: c, trolling: t };
}

export const PLATFORM_META: PlatformMeta[] = [
  {
    id: 'x',
    name: 'X',
    unlocksAt: 'grassroots',
    audience: 'news-junkie · polarized',
    moderation: 0.3,
    amp: amp(1.3, 1.3, 1.6, 1.1, 1.2, 1.7),
    tint: 'hsl(220 5% 25%)',
    precedent: 'Pizzagate\'s 2016 jump from 4chan to mainstream; Russian Doppelganger network (Meta 2022); Spamouflage Dragon (Graphika 2019+).',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    unlocksAt: 'blog',
    audience: 'older · family-network',
    moderation: 0.5,
    amp: amp(1.0, 1.4, 1.5, 1.2, 1.3, 0.9),
    tint: 'hsl(220 60% 50%)',
    precedent: 'Macedonian content farms 2016; IRA — 66% race-focused content, 11.2M engagements on Blacktivist alone (Senate Intel Vol. II, 2019); Facebook Papers 2021.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    unlocksAt: 'social',
    audience: 'youngest · low-context · algorithmic',
    moderation: 0.6,
    amp: amp(0.8, 1.7, 1.2, 1.4, 1.0, 1.5),
    tint: 'hsl(330 80% 55%)',
    precedent: 'Mozilla Foundation 2022 algorithm study; Spamouflage Dragon TikTok pivot 2023; eating-disorder content within minutes of new-account onboarding (NewsGuard).',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    unlocksAt: 'social',
    audience: 'broad · long-form tolerant',
    moderation: 0.7,
    amp: amp(1.5, 1.1, 1.0, 1.3, 1.6, 0.8),
    tint: 'hsl(0 75% 50%)',
    precedent: 'Ribeiro et al. 2020 radicalization pathways; Guillaume Chaslot rabbit-hole documentation; algorithm modified post-2019 but pattern persists.',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    unlocksAt: 'influencer',
    audience: 'self-selected · post-deplatform',
    moderation: 0.1,
    amp: amp(1.2, 1.2, 1.4, 1.5, 1.8, 1.3),
    tint: 'hsl(200 70% 50%)',
    precedent: 'Stop the Steal coordination Jan 6 2021; Alex Jones deplatform refuge; Russian/Iranian state-channel propagation; QAnon migration post-Reddit ban.',
  },
  {
    id: 'substack',
    name: 'Substack',
    unlocksAt: 'influencer',
    audience: 'educated · paywall-trusted',
    moderation: 0.2,
    amp: amp(1.6, 0.9, 1.0, 1.7, 1.6, 0.6),
    tint: 'hsl(20 90% 55%)',
    precedent: 'Paywall legitimacy laundering — Greenwald/Weiss/Taibbi 2020+; RFK Jr. anti-vax Substack; the "I\'m just asking questions" pose at scale.',
  },
  {
    id: 'podcast',
    name: 'Podcast',
    unlocksAt: 'cable',
    audience: 'trust-laden · low fact-check',
    moderation: 0.3,
    amp: amp(1.4, 1.0, 1.2, 1.5, 1.5, 0.7),
    tint: 'hsl(280 50% 50%)',
    precedent: 'Joe Rogan amplification effects (Spotify, 11M+ avg listeners); long-form audio trust premium; Carlson post-Fox podcast migration.',
  },
];

export function platformMetaById(id: PlatformId): PlatformMeta | undefined {
  return PLATFORM_META.find((p) => p.id === id);
}

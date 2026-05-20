// Achievements — milestone flags with small permanent buffs and real-disinfo
// names (the inoculation lens: each name teaches a concept).
// Per CORPUS.md §5 the naming itself is part of the educational payload.

import type { GameState, ResourceId } from '../types';

export interface AchievementDef {
  id: string;
  name: string;
  hint: string;
  precedent?: string;
  trigger: (s: GameState) => boolean;
  buff: { resource: ResourceId; amount: number }; // additive multiplier, e.g. 0.02 = +2%
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach-first-post',
    name: 'Patient Zero',
    hint: 'Buy your first sock puppet.',
    trigger: (s) => (s.assets.sockPuppet ?? 0) >= 2,
    buff: { resource: 'attention', amount: 0.01 },
  },
  {
    id: 'ach-useful-idiot',
    name: 'Useful Idiot',
    hint: 'Field 100 sock puppets.',
    precedent: 'Lenin-attributed term for a politically naive amplifier; documented in active-measures literature for decades. (Rid, 2020.)',
    trigger: (s) => (s.assets.sockPuppet ?? 0) >= 100,
    buff: { resource: 'attention', amount: 0.02 },
  },
  {
    id: 'ach-pseudo-news',
    name: 'Veles Boys',
    hint: 'Own 25 pseudo-news sites.',
    precedent: 'Veles, North Macedonia: ~100 fake-news domains ran out of one small town, 2016. (BuzzFeed, 2016.)',
    trigger: (s) => (s.assets.outlet ?? 0) >= 25,
    buff: { resource: 'attention', amount: 0.02 },
  },
  {
    id: 'ach-anonymous-blogger',
    name: 'Operation Mockingbird',
    hint: 'Own your first Anonymous Blogger.',
    precedent: 'Church Committee Final Report (1976) documented CIA-funded relationships with hundreds of American journalists.',
    trigger: (s) => (s.assets.anonymousBlogger ?? 0) >= 1,
    buff: { resource: 'attention', amount: 0.01 },
  },
  {
    id: 'ach-edcal',
    name: 'Plausible Deniability',
    hint: 'Complete Editorial Calendar.',
    precedent: 'CIA tradecraft term; routine in disinformation operations for maintaining cover when the operation is exposed.',
    trigger: (s) => !!s.completedProjects['editorial-calendar'],
    buff: { resource: 'attention', amount: 0.05 },
  },
  {
    id: 'ach-outrage-10',
    name: 'Daily Outrage',
    hint: 'Outrage Headlines tier 10.',
    trigger: (s) => (s.upgrades['emotional-1'] ?? 0) >= 10,
    buff: { resource: 'attention', amount: 0.03 },
  },
  {
    id: 'ach-wedge-10',
    name: 'Heart of Texas',
    hint: 'Wedge Issue Generator tier 10.',
    precedent: 'IRA "Heart of Texas" + "United Muslims of America" — engineered both-sides confrontation. (Senate Intel Vol. II, 2019.)',
    trigger: (s) => (s.upgrades['polarization-1'] ?? 0) >= 10,
    buff: { resource: 'attention', amount: 0.03 },
  },
  {
    id: 'ach-firehose-10',
    name: 'Firehose Operator',
    hint: 'Firehose of Falsehood tier 10.',
    precedent: 'RAND PE-198 documented the Russian propaganda model — sheer volume + contradiction.',
    trigger: (s) => (s.upgrades['trolling-1'] ?? 0) >= 10,
    buff: { resource: 'attention', amount: 0.03 },
  },
  {
    id: 'ach-q-10',
    name: 'Drops at Midnight',
    hint: 'Q-Style Drop Schedule tier 10.',
    precedent: 'QAnon ARG structure — followers decode ambiguous "drops." (CRS report, 2021.)',
    trigger: (s) => (s.upgrades['conspiracy-1'] ?? 0) >= 10,
    buff: { resource: 'attention', amount: 0.03 },
  },
  {
    id: 'ach-whatabout-10',
    name: 'Active Measures',
    hint: 'Whataboutism Kit tier 10.',
    precedent: 'Soviet active-measures doctrine, formalized 1960s. (Rid, 2020.)',
    trigger: (s) => (s.upgrades['discrediting-1'] ?? 0) >= 10,
    buff: { resource: 'attention', amount: 0.03 },
  },
  {
    id: 'ach-photo-10',
    name: 'Doppelganger',
    hint: 'Stolen Photo Bank tier 10.',
    precedent: 'Russian Doppelganger network: cloned outlets with stolen branding. (Meta 2022 threat report.)',
    trigger: (s) => (s.upgrades['impersonation-1'] ?? 0) >= 10,
    buff: { resource: 'attention', amount: 0.03 },
  },
  {
    id: 'ach-first-event',
    name: 'Headline Hog',
    hint: 'Live through your first event.',
    trigger: (s) => !!s.flags['__eventFired'],
    buff: { resource: 'attention', amount: 0.01 },
  },
  {
    id: 'ach-doppelganger',
    name: 'Coordinated Inauthentic',
    hint: 'Own your first Doppelganger Cluster.',
    precedent: 'Meta\'s 2018 "Coordinated Inauthentic Behavior" enforcement framework; the technical term-of-art for state-scale fake-account ops.',
    trigger: (s) => (s.assets.doppelganger ?? 0) >= 1,
    buff: { resource: 'engagement', amount: 0.02 },
  },
  {
    id: 'ach-substacker',
    name: 'Paywall Credibility',
    hint: 'Own your first Niche Substacker.',
    trigger: (s) => (s.assets.substacker ?? 0) >= 1,
    buff: { resource: 'engagement', amount: 0.02 },
  },
  {
    id: 'ach-cpc',
    name: 'Concern-Coded',
    hint: 'Complete Crisis Pregnancy Center Network.',
    precedent: '2,750+ CPCs in the US; FTC-cited deceptive practices since the 1980s. (Guttmacher, 2024.)',
    trigger: (s) => !!s.completedProjects['cpc-network'],
    buff: { resource: 'engagement', amount: 0.05 },
  },
  {
    id: 'ach-first-synergy',
    name: 'Force Multiplier',
    hint: 'Activate any Playbook synergy.',
    trigger: (s) =>
      !!s.flags['syn:wedge-content'] ||
      !!s.flags['syn:fake-whistleblower'] ||
      !!s.flags['syn:flood-the-zone'] ||
      !!s.flags['syn:mob-surge'] ||
      !!s.flags['syn:moral-panic'] ||
      !!s.flags['syn:reverse-smear'] ||
      !!s.flags['syn:false-document-leak'] ||
      !!s.flags['syn:tribal-trojan'],
    buff: { resource: 'engagement', amount: 0.05 },
  },
  {
    id: 'ach-all-six',
    name: 'Full Playbook',
    hint: 'Have at least one upgrade in every tree.',
    trigger: (s) =>
      ['emotional','polarization','trolling','conspiracy','discrediting','impersonation']
        .every((t) => (s.upgrades[`${t}-1`] ?? 0) >= 1),
    buff: { resource: 'attention', amount: 0.10 },
  },
  {
    id: 'ach-blog',
    name: 'Going Pro',
    hint: 'Enter Blog era.',
    trigger: (s) => s.phase !== 'grassroots',
    buff: { resource: 'engagement', amount: 0.05 },
  },
  {
    id: 'ach-wellness-mom',
    name: 'The Disinformation Dozen',
    hint: 'Wellness Mom Network tier 5.',
    precedent: 'CCDH 2021: 12 actors drove ~65% of anti-vax content (RFK Jr., Mercola, Northrup, Bollinger, Tenpenny, et al.).',
    trigger: (s) => (s.upgrades['impersonation-2'] ?? 0) >= 5,
    buff: { resource: 'engagement', amount: 0.03 },
  },
  {
    id: 'ach-operation-denver',
    name: 'AIDS, 1983',
    hint: 'Operation Denver Smear tier 10.',
    precedent: 'KGB Operation Denver planted "U.S. engineered HIV at Fort Detrick" in 1983; the claim outlived the USSR.',
    trigger: (s) => (s.upgrades['discrediting-2'] ?? 0) >= 10,
    buff: { resource: 'attention', amount: 0.03 },
  },

  // ── Asset-count milestones (Cookie-Clicker "milk" pattern) ───────────
  // Each gives a permanent percentage boost to the relevant resource.
  // Visible progress targets at every step of Grassroots/Blog/Social.
  {
    id: 'ach-puppets-100',
    name: 'Hundred Hands',
    hint: 'Field 100 sock puppets.',
    trigger: (s) => (s.assets.sockPuppet ?? 0) >= 100,
    buff: { resource: 'attention', amount: 0.05 },
  },
  {
    id: 'ach-puppets-250',
    name: 'A Whole Movement',
    hint: 'Field 250 sock puppets.',
    trigger: (s) => (s.assets.sockPuppet ?? 0) >= 250,
    buff: { resource: 'attention', amount: 0.10 },
  },
  {
    id: 'ach-puppets-500',
    name: 'Coordinated Inauthentic Behavior',
    hint: 'Field 500 sock puppets.',
    precedent: 'Meta\'s 2018 "Coordinated Inauthentic Behavior" enforcement framework, the technical term-of-art for state-scale fake-account ops.',
    trigger: (s) => (s.assets.sockPuppet ?? 0) >= 500,
    buff: { resource: 'attention', amount: 0.15 },
  },
  {
    id: 'ach-puppets-1000',
    name: 'IRA-Scale',
    hint: 'Field 1,000 sock puppets.',
    precedent: 'The Russian Internet Research Agency operated ~80 staff but ran thousands of personas across platforms (Senate Intel Vol. II, 2019).',
    trigger: (s) => (s.assets.sockPuppet ?? 0) >= 1000,
    buff: { resource: 'attention', amount: 0.25 },
  },
  {
    id: 'ach-outlets-50',
    name: 'Veles Veterans',
    hint: 'Own 50 pseudo-news sites.',
    trigger: (s) => (s.assets.outlet ?? 0) >= 50,
    buff: { resource: 'attention', amount: 0.05 },
  },
  {
    id: 'ach-outlets-150',
    name: 'Pink Slime',
    hint: 'Own 150 pseudo-news sites.',
    precedent: '"Pink slime" outlets — algorithmically-generated local "news" sites with hyper-partisan content. NewsGuard tracks 1,200+ of them (2024).',
    trigger: (s) => (s.assets.outlet ?? 0) >= 150,
    buff: { resource: 'attention', amount: 0.12 },
  },
  {
    id: 'ach-bloggers-50',
    name: 'Substack Salon',
    hint: 'Own 50 anonymous bloggers.',
    trigger: (s) => (s.assets.anonymousBlogger ?? 0) >= 50,
    buff: { resource: 'attention', amount: 0.05 },
  },
  {
    id: 'ach-bloggers-200',
    name: 'Pundit Pipeline',
    hint: 'Own 200 anonymous bloggers.',
    trigger: (s) => (s.assets.anonymousBlogger ?? 0) >= 200,
    buff: { resource: 'attention', amount: 0.15 },
  },
  {
    id: 'ach-doppelganger-50',
    name: 'Mirror Sites',
    hint: 'Own 50 Doppelganger Clusters.',
    precedent: 'Meta\'s 2022–2024 Adversarial Threat Reports document quarterly takedowns of Russian Doppelganger network — 5,000+ accounts.',
    trigger: (s) => (s.assets.doppelganger ?? 0) >= 50,
    buff: { resource: 'engagement', amount: 0.10 },
  },
  {
    id: 'ach-newsletter-100',
    name: 'Inbox Saturation',
    hint: 'Own 100 Newsletter Stacks.',
    trigger: (s) => (s.assets.newsletter ?? 0) >= 100,
    buff: { resource: 'engagement', amount: 0.08 },
  },
];

export function tickAchievements(state: GameState): void {
  for (const a of ACHIEVEMENTS) {
    if (state.flags[a.id]) continue;
    if (a.trigger(state)) {
      state.flags[a.id] = true;
      state.log.unshift(`★ Achievement: ${a.name}`);
    }
  }
}

export function totalAchievementBuffs(state: GameState): Record<ResourceId, number> {
  const out: Record<string, number> = {};
  for (const a of ACHIEVEMENTS) {
    if (!state.flags[a.id]) continue;
    out[a.buff.resource] = (out[a.buff.resource] ?? 0) + a.buff.amount;
  }
  return out as Record<ResourceId, number>;
}

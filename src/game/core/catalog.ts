// Declarative catalogs for assets, DEPICT upgrades, and one-shot projects.
// Pure data + small predicates. No state mutation lives here.
//
// Naming convention: where a real disinfo operation maps cleanly onto a tier
// or technique, we use its researcher-documented name (Doppelganger,
// Spamouflage Dragon, Project Alamo, Operation Denver, etc.). The villain is
// the playbook, not a tribe — examples span the political spectrum.

import type { GameState, ResourceId, DepictId, PhaseId } from '../types';

export interface AssetDef {
  id: string;
  name: string;
  era: PhaseId;
  kind: 'human' | 'bot';
  baseCost: number;
  costGrowth: number;
  costResource: ResourceId;
  produces: Partial<Record<ResourceId, number>>;
  multipliers?: Partial<Record<ResourceId, number>>;
  blurb: string;
  precedent?: string; // optional real-world citation (codex hook)
  visible: (s: GameState) => boolean;
}

export interface UpgradeDef {
  id: string;
  tree: DepictId;
  tier: number;
  name: string;
  baseCost: number;
  costGrowth: number;
  costResource: ResourceId;
  maxLevel: number;
  multiplier: Partial<Record<ResourceId, number>>;
  blurb: string;
  precedent?: string;
  visible: (s: GameState) => boolean;
}

export interface ProjectDef {
  id: string;
  name: string;
  cost: Partial<Record<ResourceId, number>>;
  era: PhaseId;
  blurb: string;
  precedent?: string;
  effect: (s: GameState) => void;
  visible: (s: GameState) => boolean;
}

// ─── Assets ────────────────────────────────────────────────────────────────

export const ASSETS: AssetDef[] = [
  {
    id: 'sockPuppet',
    name: 'Sock Puppet',
    era: 'grassroots',
    kind: 'bot',
    baseCost: 3,
    costGrowth: 1.12,
    costResource: 'attention',
    produces: { attention: 0.4 },
    blurb: 'A fake account dressed for the part. Cheap, fast, low credibility.',
    precedent: 'The Russian IRA ran ~80 staff full-time posing as Americans, $1.25M/month budget. (Senate Intel Vol. II, 2019)',
    visible: () => true,
  },
  {
    id: 'anonymousBlogger',
    name: 'Anonymous Blogger',
    era: 'grassroots',
    kind: 'human',
    baseCost: 20,
    costGrowth: 1.14,
    costResource: 'attention',
    produces: { attention: 1.2 },
    blurb: 'A real person posting under a pseudonym. Slower but credible.',
    precedent: 'Bari Weiss left the NYT for Substack in 2020 citing "unlawful discrimination" — paywalled credibility for hot takes. (Resignation letter, NYT, 2020)',
    visible: (s) => s.resources.attention >= 10 || (s.assets.anonymousBlogger ?? 0) > 0,
  },
  {
    id: 'outlet',
    name: 'Pseudo-News Site',
    era: 'grassroots',
    kind: 'bot',
    baseCost: 8,
    costGrowth: 1.10,
    costResource: 'attention',
    produces: {},
    blurb: 'A WordPress install with a serious-looking masthead. Each adds attention storage.',
    precedent: 'Macedonian teenagers in Veles ran 100+ pro-Trump fake news sites for ad revenue. They tested both sides; pro-Trump fabrications drove 4–5× engagement. (BuzzFeed/Wired, 2016)',
    visible: (s) => s.resources.attention >= 12 || (s.assets.outlet ?? 0) > 0,
  },
];

export function assetById(id: string): AssetDef | undefined {
  return ASSETS.find((a) => a.id === id);
}

// ─── DEPICT upgrades ───────────────────────────────────────────────────────

export const UPGRADES: UpgradeDef[] = [
  // DISCREDITING — defensive, attacks the messenger
  {
    id: 'discrediting-1',
    tree: 'discrediting',
    tier: 1,
    name: 'Whataboutism Kit',
    baseCost: 60,
    costGrowth: 1.12,
    costResource: 'attention',
    maxLevel: 30,
    multiplier: { attention: 0.04 },
    blurb: '"What about [their thing]?" Deflects accountability by inventing an exchange rate.',
    precedent: 'Soviet active-measures doctrine, formalized in the 1960s. Adopted globally by post-Soviet info-ops. (Rid, "Active Measures," 2020)',
    visible: (s) => s.resources.attention >= 40,
  },
  // EMOTIONAL — high-output, low-credibility
  {
    id: 'emotional-1',
    tree: 'emotional',
    tier: 1,
    name: 'Outrage Headlines',
    baseCost: 30,
    costGrowth: 1.12,
    costResource: 'attention',
    maxLevel: 30,
    multiplier: { attention: 0.06 },
    blurb: '"You won\'t believe what happened next." Compels the click before the brain registers.',
    precedent: 'Reuters Institute (2019) analysis: fake-news headlines were 5× more likely to use emotional or alarming language than verified news.',
    visible: (s) => s.resources.attention >= 20,
  },
  // POLARIZATION
  {
    id: 'polarization-1',
    tree: 'polarization',
    tier: 1,
    name: 'Wedge Issue Generator',
    baseCost: 45,
    costGrowth: 1.12,
    costResource: 'attention',
    maxLevel: 30,
    multiplier: { attention: 0.05 },
    blurb: 'Split your audience into "us" and "them." Both halves come back angry.',
    precedent: 'IRA ran "Heart of Texas" (250K followers) AND "United Muslims of America" simultaneously, then organized rallies at the same Houston address, same day. (Senate Intel Vol. II, 2019)',
    visible: (s) => s.resources.attention >= 30,
  },
  // IMPERSONATION
  {
    id: 'impersonation-1',
    tree: 'impersonation',
    tier: 1,
    name: 'Stolen Photo Bank',
    baseCost: 80,
    costGrowth: 1.12,
    costResource: 'attention',
    maxLevel: 30,
    multiplier: { attention: 0.04 },
    blurb: 'Steal a face. Build a profile. Reuse across networks.',
    precedent: 'Russian Doppelganger operation cloned real Western outlets (Bild, Le Monde, Fox News) with near-identical URLs and stolen branding. (Meta threat report, 2022)',
    visible: (s) => s.resources.attention >= 60,
  },
  // CONSPIRACY
  {
    id: 'conspiracy-1',
    tree: 'conspiracy',
    tier: 1,
    name: 'Q-Style Drop Schedule',
    baseCost: 55,
    costGrowth: 1.12,
    costResource: 'attention',
    maxLevel: 30,
    multiplier: { attention: 0.04 },
    blurb: 'Numbered hints, "do your own research," gamified pattern-matching for the loyal.',
    precedent: 'QAnon adapted alternate-reality-game structure: cryptic "drops" interpreted by followers. Followers tied to Jan 6, multiple homicides. (CRS report 2021, Bellingcat)',
    visible: (s) => s.resources.attention >= 50,
  },
  // TROLLING
  {
    id: 'trolling-1',
    tree: 'trolling',
    tier: 1,
    name: 'Firehose of Falsehood',
    baseCost: 70,
    costGrowth: 1.12,
    costResource: 'attention',
    maxLevel: 30,
    multiplier: { attention: 0.05 },
    blurb: 'Many channels, high volume, rapid, repetitive, no commitment to consistency. Overwhelm fact-checking.',
    precedent: 'RAND PE-198 (Paul & Matthews, 2016) documented the Russian propaganda model — distinguished by sheer volume and contradictions intentional.',
    visible: (s) => s.resources.attention >= 45,
  },
];

export function upgradeById(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}

// ─── Projects (one-shot paradigm shifts) ───────────────────────────────────

export const PROJECTS: ProjectDef[] = [
  {
    id: 'editorial-calendar',
    name: 'Editorial Calendar',
    cost: { attention: 150 },
    era: 'grassroots',
    blurb: 'A schedule. Daily posting. Stop winging it. Unlocks Engagement; outlets now compound (each one adds 12% more storage than the last).',
    precedent: 'The Macedonian Veles operations ran on daily-post schedules generating $5K–$10K/month in Facebook ad revenue per operator. (BuzzFeed, 2016)',
    visible: (s) => s.resources.attention >= 80 && !s.completedProjects['editorial-calendar'],
    effect: (s) => {
      s.flags['editorialCalendar'] = true;
      s.caps.engagement = 50;
      s.log.unshift('You ship an editorial calendar. The chaos starts to feel intentional.');
    },
  },
];

export function projectById(id: string): ProjectDef | undefined {
  return PROJECTS.find((p) => p.id === id);
}

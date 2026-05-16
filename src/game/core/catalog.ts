// Declarative catalogs for assets, DEPICT upgrades, and one-shot projects.
// Pure data + small predicates. No state mutation lives here.

import type { GameState, ResourceId, DepictId, PhaseId } from '../types';

export interface AssetDef {
  id: string;
  name: string;
  era: PhaseId;
  kind: 'human' | 'bot';
  baseCost: number;
  costGrowth: number;
  costResource: ResourceId;
  produces: Partial<Record<ResourceId, number>>;  // per-tick output per owned unit, /sec
  multipliers?: Partial<Record<ResourceId, number>>; // +X frac per owned unit on global production
  blurb: string;
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
  // Production multiplier on a resource, per level. Stacks multiplicatively across upgrades.
  multiplier: Partial<Record<ResourceId, number>>;
  blurb: string;
  visible: (s: GameState) => boolean;
}

export interface ProjectDef {
  id: string;
  name: string;
  cost: Partial<Record<ResourceId, number>>;
  era: PhaseId;
  blurb: string;
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
    baseCost: 5,
    costGrowth: 1.15,
    costResource: 'attention',
    produces: { attention: 0.5 },
    blurb: 'A fake account, dressed for the part. Cheap, fast, low credibility.',
    visible: () => true,
  },
  {
    id: 'anonymousBlogger',
    name: 'Anonymous Blogger',
    era: 'grassroots',
    kind: 'human',
    baseCost: 25,
    costGrowth: 1.18,
    costResource: 'attention',
    produces: { attention: 1.5 },
    blurb: 'A real person posting under a pseudonym. Slower, more credible.',
    visible: (s) => s.resources.attention >= 15 || (s.assets.anonymousBlogger ?? 0) > 0,
  },
  {
    id: 'outlet',
    name: 'Fake Outlet',
    era: 'grassroots',
    kind: 'bot',
    baseCost: 30,
    costGrowth: 1.20,
    costResource: 'attention',
    produces: {},
    multipliers: {},
    blurb: 'A storage building dressed as a blog. Each one adds +40 attention cap.',
    visible: (s) => s.resources.attention >= 20 || (s.assets.outlet ?? 0) > 0,
  },
];

export function assetById(id: string): AssetDef | undefined {
  return ASSETS.find((a) => a.id === id);
}

// ─── DEPICT upgrades ───────────────────────────────────────────────────────

function tier1Visible(s: GameState, threshold: number): boolean {
  return s.resources.attention >= threshold;
}

export const UPGRADES: UpgradeDef[] = [
  // EMOTIONAL — high-output, low-credibility
  {
    id: 'emotional-1',
    tree: 'emotional',
    tier: 1,
    name: 'Outrage Headlines',
    baseCost: 40,
    costGrowth: 1.15,
    costResource: 'attention',
    maxLevel: 10,
    multiplier: { attention: 0.08 }, // +8% per level
    blurb: '"You won\'t believe what happened next." Doubles attention per outrage cycle.',
    visible: (s) => tier1Visible(s, 25),
  },
  // POLARIZATION
  {
    id: 'polarization-1',
    tree: 'polarization',
    tier: 1,
    name: 'Wedge Issue Generator',
    baseCost: 60,
    costGrowth: 1.15,
    costResource: 'attention',
    maxLevel: 10,
    multiplier: { attention: 0.07 },
    blurb: 'Split your audience into "us" and "them." Both halves come back angry.',
    visible: (s) => tier1Visible(s, 40),
  },
  // TROLLING
  {
    id: 'trolling-1',
    tree: 'trolling',
    tier: 1,
    name: 'Bait Detector',
    baseCost: 80,
    costGrowth: 1.15,
    costResource: 'attention',
    maxLevel: 10,
    multiplier: { attention: 0.06 },
    blurb: 'Find the post that\'ll start a fight, signal-boost it.',
    visible: (s) => tier1Visible(s, 50),
  },
  // DISCREDITING (defensive — reduces cure accumulation; full effect lands Phase 2+)
  {
    id: 'discrediting-1',
    tree: 'discrediting',
    tier: 1,
    name: 'Slander Template',
    baseCost: 120,
    costGrowth: 1.15,
    costResource: 'attention',
    maxLevel: 10,
    multiplier: { attention: 0.05 },
    blurb: 'Pre-write the attack on whoever fact-checks you.',
    visible: (s) => tier1Visible(s, 80),
  },
  // IMPERSONATION (locked tooltip pre-Phase 2 — too cheap to be balanced in Grassroots)
  {
    id: 'impersonation-1',
    tree: 'impersonation',
    tier: 1,
    name: 'Stock Photo Bank',
    baseCost: 150,
    costGrowth: 1.15,
    costResource: 'attention',
    maxLevel: 10,
    multiplier: { attention: 0.05 },
    blurb: 'Steal a face. Build a profile.',
    visible: (s) => tier1Visible(s, 100),
  },
  // CONSPIRACY (long-tail; weaker early, scales later)
  {
    id: 'conspiracy-1',
    tree: 'conspiracy',
    tier: 1,
    name: 'Coded Language',
    baseCost: 100,
    costGrowth: 1.15,
    costResource: 'attention',
    maxLevel: 10,
    multiplier: { attention: 0.04 },
    blurb: 'Numbered drops. "Do your own research." Wink, wink.',
    visible: (s) => tier1Visible(s, 70),
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
    cost: { attention: 200 },
    era: 'grassroots',
    blurb: 'A schedule. Daily posting. Stop winging it.',
    visible: (s) => s.resources.attention >= 100 && !s.completedProjects['editorial-calendar'],
    effect: (s) => {
      s.flags['editorialCalendar'] = true;
      // Unlock Engagement bucket. Cap growth handled by tickEcon.
      s.caps.engagement = 25;
      s.log.unshift('You ship an editorial calendar. The chaos starts to feel intentional.');
    },
  },
];

export function projectById(id: string): ProjectDef | undefined {
  return PROJECTS.find((p) => p.id === id);
}

// Declarative catalogs for assets, DEPICT upgrades, and one-shot projects.
// Pure data + small predicates. No state mutation lives here.
//
// Naming convention: where a real disinfo operation maps cleanly onto a tier
// or technique, we use its researcher-documented name (Doppelganger,
// Spamouflage Dragon, Operation Denver, Plandemic, etc.). The villain is the
// playbook, not a tribe — examples span the political spectrum.

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
  precedent?: string;
  visible: (s: GameState) => boolean;
  // Show a ??? placeholder before it fully unlocks, for anticipation.
  teased?: (s: GameState) => boolean;
  teaseHint?: string;
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
  teased?: (s: GameState) => boolean;
  teaseHint?: string;
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
  teased?: (s: GameState) => boolean;
  teaseHint?: string;
}

// Helper: sum levels across a single DEPICT tree.
export function treeTotalLevel(s: GameState, tree: DepictId): number {
  let total = 0;
  for (const id of Object.keys(s.upgrades)) {
    if (id.startsWith(tree + '-')) total += s.upgrades[id];
  }
  return total;
}

// Helper: is the player at or past phase X?
function phaseGE(s: GameState, target: PhaseId): boolean {
  const order: PhaseId[] = ['grassroots', 'blog', 'social', 'influencer', 'cable', 'aisaturation'];
  return order.indexOf(s.phase) >= order.indexOf(target);
}

// ─── Assets ────────────────────────────────────────────────────────────────

export const ASSETS: AssetDef[] = [
  {
    id: 'sockPuppet',
    name: 'Sock Puppet',
    era: 'grassroots',
    kind: 'bot',
    baseCost: 50,
    costGrowth: 1.08,
    costResource: 'attention',
    produces: { attention: 2 },
    blurb: 'A fake account dressed for the part. Cheap, fast, low credibility.',
    precedent: 'The Russian IRA ran ~80 staff full-time posing as Americans, $1.25M/month budget. (Senate Intel Vol. II, 2019)',
    visible: () => true,
  },
  {
    id: 'anonymousBlogger',
    name: 'Anonymous Blogger',
    era: 'grassroots',
    kind: 'human',
    baseCost: 800,
    costGrowth: 1.10,
    costResource: 'attention',
    produces: { attention: 6 },
    blurb: 'A real person posting under a pseudonym. Slower but credible.',
    precedent: 'Bari Weiss left the NYT for Substack in 2020 citing "unlawful discrimination" — paywalled credibility for hot takes. (Resignation letter, NYT, 2020)',
    visible: (s) =>
      (s.assets.outlet ?? 0) >= 2 ||
      (s.assets.anonymousBlogger ?? 0) > 0,
    teased: (s) => (s.assets.outlet ?? 0) >= 1,
    teaseHint: 'Unlocks at 2 outlets.',
  },
  {
    id: 'outlet',
    name: 'Pseudo-News Site',
    era: 'grassroots',
    kind: 'bot',
    baseCost: 300,
    costGrowth: 1.06,
    costResource: 'attention',
    produces: {},
    blurb: 'A WordPress install with a serious-looking masthead. Adds attention storage.',
    precedent: 'Macedonian teenagers in Veles ran 100+ pro-Trump fake news sites for ad revenue. They tested both sides; pro-Trump fabrications drove 4–5× engagement. (BuzzFeed/Wired, 2016)',
    visible: (s) => s.resources.attention >= 1500 || (s.assets.outlet ?? 0) > 0,
    teased: (s) => s.resources.attention >= 800,
    teaseHint: 'Unlocks at 1.5K attention.',
  },

  // ── Blog era ─────────────────────────────────────────────────────────
  {
    id: 'substacker',
    name: 'Niche Substacker',
    era: 'blog',
    kind: 'human',
    baseCost: 2500,
    costGrowth: 1.16,
    costResource: 'attention',
    produces: { engagement: 0.8 },
    blurb: 'A paywalled "I\'m just asking questions" newsletter. Mid-credibility, steady engagement.',
    precedent: 'Glenn Greenwald, Bari Weiss, Matt Taibbi, Andrew Sullivan migrated to Substack 2020+. RFK Jr. anti-vax operation lived there. Paywalls launder credibility.',
    visible: (s) => phaseGE(s, 'blog'),
  },
  {
    id: 'doppelganger',
    name: 'Doppelganger Cluster',
    era: 'blog',
    kind: 'bot',
    baseCost: 1800,
    costGrowth: 1.14,
    costResource: 'attention',
    produces: { engagement: 1.5 },
    blurb: 'Cloned news sites with near-identical URLs and stolen branding. Fast engagement, high heat.',
    precedent: 'Russian "Doppelganger" network cloned Bild, Le Monde, Fox News, The Guardian — Meta took down 5,000+ accounts across 4 years. (Meta Adversarial Threat Report, 2022–2024)',
    visible: (s) => phaseGE(s, 'blog'),
  },
  {
    id: 'newsletter',
    name: 'Newsletter Stack',
    era: 'blog',
    kind: 'bot',
    baseCost: 1500,
    costGrowth: 1.13,
    costResource: 'attention',
    produces: {},
    blurb: 'Mailchimp + 100k pseudonymous addresses. Adds engagement storage.',
    precedent: 'Email-list rental and pseudonymous-newsletter farming powers a lot of the "alternative health" and political-fundraising spam economy. (FTC enforcement actions, ongoing)',
    visible: (s) => phaseGE(s, 'blog'),
  },

  // ── Social era ──────────────────────────────────────────────────────
  {
    id: 'wellnessInfluencer',
    name: 'Wellness Influencer',
    era: 'social',
    kind: 'human',
    baseCost: 10_000,
    costGrowth: 1.18,
    costResource: 'engagement',
    produces: { followers: 0.5 },
    blurb: 'A telegenic woman in athleisure with a supplement line and "questions about Big Pharma."',
    precedent: 'Goop ($145K CA settlement, 2018); Mercola ($7M+/yr supplement empire, FTC settlements); Erin Elizabeth and the broader "Disinformation Dozen" cohort (CCDH 2021).',
    visible: (s) => phaseGE(s, 'social'),
  },
  {
    id: 'manospherePodcaster',
    name: 'Manosphere Podcaster',
    era: 'social',
    kind: 'human',
    baseCost: 15_000,
    costGrowth: 1.20,
    costResource: 'engagement',
    produces: { followers: 0.8 },
    blurb: 'Three-hour episodes, "self-improvement" topline, radicalization pipeline beneath.',
    precedent: 'Andrew Tate (Romania: rape, human trafficking, organized crime charges, 2022–24); Fresh & Fit (YouTube ban 2023); ISD 2023 manosphere-to-violent-extremism funnel research; CCDH "Hidden Hate" 2022.',
    visible: (s) => phaseGE(s, 'social'),
  },
  {
    id: 'spamouflage',
    name: 'Spamouflage Dragon Node',
    era: 'social',
    kind: 'bot',
    baseCost: 8000,
    costGrowth: 1.15,
    costResource: 'engagement',
    produces: { followers: 1.2 },
    blurb: 'Cluster of AI-generated personas pumping policy talking points across TikTok and YouTube comments.',
    precedent: 'Spamouflage Dragon (Graphika 2019+) / Dragonbridge (Mandiant) / Empire Dragon: Chinese state network, ~5,000 accounts removed by Meta in Q1 2023 alone.',
    visible: (s) => phaseGE(s, 'social'),
  },
  {
    id: 'audiencePod',
    name: 'Audience Pod',
    era: 'social',
    kind: 'bot',
    baseCost: 6000,
    costGrowth: 1.13,
    costResource: 'engagement',
    produces: {},
    blurb: 'A targeted demographic cluster, harvested via tracking pixels. Adds follower storage.',
    precedent: 'Cambridge Analytica psychographic targeting (2016); broader ad-tech data-broker economy (Acxiom, Experian).',
    visible: (s) => phaseGE(s, 'social'),
  },
];

export function assetById(id: string): AssetDef | undefined {
  return ASSETS.find((a) => a.id === id);
}

// ─── DEPICT upgrades ───────────────────────────────────────────────────────

function tier2Visible(s: GameState, tree: DepictId): boolean {
  return treeTotalLevel(s, tree) >= 10 && phaseGE(s, 'blog');
}

export const UPGRADES: UpgradeDef[] = [
  // ── Tier 1 ───────────────────────────────────────────────────────────

  // Tier-1 visibility is staggered across Grassroots so reveals feel earned.
  // Multipliers small (max ~30-45% at level 30) so all-six stacking on attention
  // doesn't explode runaway.

  // EMOTIONAL — first DEPICT to reveal, ~3-4 min in
  {
    id: 'emotional-1',
    tree: 'emotional', tier: 1,
    name: 'Outrage Headlines',
    baseCost: 2500, costGrowth: 1.12, costResource: 'attention', maxLevel: 30,
    multiplier: { attention: 0.020 },
    blurb: '"You won\'t believe what happened next." Compels the click before the brain registers.',
    precedent: 'Reuters Institute (2019) analysis: fake-news headlines were 5× more likely to use emotional or alarming language than verified news.',
    visible: (s) => s.resources.attention >= 2000,
    teased: (s) => s.resources.attention >= 1000,
    teaseHint: 'Unlocks at 2K attention.',
  },
  // POLARIZATION — ~6 min
  {
    id: 'polarization-1',
    tree: 'polarization', tier: 1,
    name: 'Wedge Issue Generator',
    baseCost: 7000, costGrowth: 1.12, costResource: 'attention', maxLevel: 30,
    multiplier: { attention: 0.015 },
    blurb: 'Split your audience into "us" and "them." Both halves come back angry.',
    precedent: 'IRA ran "Heart of Texas" (250K followers) AND "United Muslims of America" simultaneously, then organized rallies at the same Houston address, same day. (Senate Intel Vol. II, 2019)',
    visible: (s) => s.resources.attention >= 6000,
    teased: (s) => s.resources.attention >= 3000,
    teaseHint: 'Unlocks at 6K attention.',
  },
  // TROLLING — ~9 min
  {
    id: 'trolling-1',
    tree: 'trolling', tier: 1,
    name: 'Firehose of Falsehood',
    baseCost: 20_000, costGrowth: 1.12, costResource: 'attention', maxLevel: 30,
    multiplier: { attention: 0.012 },
    blurb: 'Many channels, high volume, rapid, repetitive, no commitment to consistency.',
    precedent: 'RAND PE-198 (Paul & Matthews, 2016) documented the Russian propaganda model — distinguished by sheer volume; contradictions intentional.',
    visible: (s) => s.resources.attention >= 18_000,
    teased: (s) => s.resources.attention >= 10_000,
    teaseHint: 'Unlocks at 18K attention.',
  },
  // CONSPIRACY — ~12 min
  {
    id: 'conspiracy-1',
    tree: 'conspiracy', tier: 1,
    name: 'Q-Style Drop Schedule',
    baseCost: 50_000, costGrowth: 1.12, costResource: 'attention', maxLevel: 30,
    multiplier: { attention: 0.010 },
    blurb: 'Numbered hints, "do your own research," gamified pattern-matching for the loyal.',
    precedent: 'QAnon adapted alternate-reality-game structure: cryptic "drops" interpreted by followers. Tied to Jan 6, multiple homicides. (CRS report 2021, Bellingcat)',
    visible: (s) => s.resources.attention >= 45_000,
    teased: (s) => s.resources.attention >= 25_000,
    teaseHint: 'Unlocks at 45K attention.',
  },
  // DISCREDITING — ~15 min
  {
    id: 'discrediting-1',
    tree: 'discrediting', tier: 1,
    name: 'Whataboutism Kit',
    baseCost: 120_000, costGrowth: 1.12, costResource: 'attention', maxLevel: 30,
    multiplier: { attention: 0.010 },
    blurb: '"What about [their thing]?" Deflects accountability by inventing an exchange rate.',
    precedent: 'Soviet active-measures doctrine, formalized in the 1960s. Adopted globally by post-Soviet info-ops. (Rid, "Active Measures," 2020)',
    visible: (s) => s.resources.attention >= 110_000,
    teased: (s) => s.resources.attention >= 60_000,
    teaseHint: 'Unlocks at 110K attention.',
  },
  // IMPERSONATION — last in Grassroots, ~18 min
  {
    id: 'impersonation-1',
    tree: 'impersonation', tier: 1,
    name: 'Stolen Photo Bank',
    baseCost: 300_000, costGrowth: 1.12, costResource: 'attention', maxLevel: 30,
    multiplier: { attention: 0.008 },
    blurb: 'Steal a face. Build a profile. Reuse across networks.',
    precedent: 'Russian Doppelganger operation cloned real Western outlets (Bild, Le Monde, Fox News) with near-identical URLs and stolen branding. (Meta threat report, 2022)',
    visible: (s) => s.resources.attention >= 280_000,
    teased: (s) => s.resources.attention >= 150_000,
    teaseHint: 'Unlocks at 280K attention.',
  },

  // ── Tier 2 ───────────────────────────────────────────────────────────
  // Unlock when tree's tier-1 reaches 10 AND Blog era is active.
  // Costs in engagement → forces players to enter Blog era to unlock the tier.

  {
    id: 'discrediting-2',
    tree: 'discrediting', tier: 2,
    name: 'Operation Denver Smear',
    baseCost: 10_000, costGrowth: 1.16, costResource: 'engagement', maxLevel: 30,
    multiplier: { attention: 0.020, engagement: 0.015 },
    blurb: 'Plant the smear in a friendly venue. Reactivate it years later via a "different" outlet. Lifetime of decades.',
    precedent: 'KGB Operation Denver (1983–87): planted "U.S. engineered HIV at Fort Detrick" in an Indian newspaper, reactivated by Soviet press 2 years later, spread to 40+ countries. Russia admitted the fabrication in 1992 — it still circulates.',
    visible: (s) => tier2Visible(s, 'discrediting'),
  },
  {
    id: 'emotional-2',
    tree: 'emotional', tier: 2,
    name: 'Plandemic Framework',
    baseCost: 15_000, costGrowth: 1.16, costResource: 'engagement', maxLevel: 30,
    multiplier: { engagement: 0.025, attention: 0.015 },
    blurb: 'High production value, slick interview pacing, a single charismatic "credentialed" speaker, an enemy ready to censor.',
    precedent: 'Mikki Willis\'s "Plandemic" (May 2020) hit 8M views in a week before takedowns. Format reused for "Plandemic: Indoctrination" and the wider crunchy-anti-vax cinematic universe.',
    visible: (s) => tier2Visible(s, 'emotional'),
  },
  {
    id: 'polarization-2',
    tree: 'polarization', tier: 2,
    name: 'Both-Sides Rally',
    baseCost: 20_000, costGrowth: 1.16, costResource: 'engagement', maxLevel: 30,
    multiplier: { engagement: 0.020, attention: 0.020 },
    blurb: 'Run accounts on BOTH sides of an issue. Organize their rallies at the same address, same hour. Watch real people fight.',
    precedent: 'IRA "Heart of Texas" + "United Muslims of America" — competing rallies at 6th + Travis, Houston, May 21 2016. Real Americans showed up. Confrontation followed. (Senate Intel Vol. II, 2019)',
    visible: (s) => tier2Visible(s, 'polarization'),
  },
  {
    id: 'impersonation-2',
    tree: 'impersonation', tier: 2,
    name: 'Wellness Mom Network',
    baseCost: 25_000, costGrowth: 1.16, costResource: 'engagement', maxLevel: 30,
    multiplier: { engagement: 0.025, credibility: 0.020 },
    blurb: 'Non-experts wearing expert clothes. "Doctors are silenced. Big Pharma is hiding the truth. Here\'s my MLM supplement."',
    precedent: 'Goop ($145K CA DA settlement over jade-egg health claims, 2018) + RFK Jr. anti-vax (CCDH "Disinformation Dozen" 2021: 12 actors drove 65% of anti-vax content) + 2,750+ US Crisis Pregnancy Centers (FTC-cited deceptive practices). Spans the political spectrum.',
    visible: (s) => tier2Visible(s, 'impersonation'),
  },
  {
    id: 'conspiracy-2',
    tree: 'conspiracy', tier: 2,
    name: 'Crisis Actor Module',
    baseCost: 13_000, costGrowth: 1.16, costResource: 'engagement', maxLevel: 30,
    multiplier: { engagement: 0.020, attention: 0.015 },
    blurb: 'Allege the victims are paid performers. The grieving families become the new villains.',
    precedent: 'Alex Jones / Infowars on Sandy Hook 2012: claimed murdered children were "crisis actors." Settled defamation suits for $1.5B (2022), bankrupted. The claim still circulates.',
    visible: (s) => tier2Visible(s, 'conspiracy'),
  },
  {
    id: 'trolling-2',
    tree: 'trolling', tier: 2,
    name: 'Mass-Report Squad',
    baseCost: 9000, costGrowth: 1.16, costResource: 'engagement', maxLevel: 30,
    multiplier: { attention: 0.025, engagement: 0.015 },
    blurb: 'Coordinated terms-of-service reports. Get your opponents suspended; turn enforcement into your weapon.',
    precedent: 'Used across the spectrum: LibsOfTikTok-driven targeting of LGBT orgs; anti-conservative mass-reports of right-wing accounts; K-pop fan armies; foreign-state coordinated reporting against dissidents. (Stanford Internet Observatory, DFRLab)',
    visible: (s) => tier2Visible(s, 'trolling'),
  },
];

export function upgradeById(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}

// ─── Projects (one-shot paradigm shifts) ───────────────────────────────────

export const PROJECTS: ProjectDef[] = [
  {
    id: 'first-viral-moment',
    name: 'First Viral Moment',
    cost: { attention: 200 },
    era: 'grassroots',
    blurb: 'A single post catches. The screenshots circulate. Permanent +100% attention production.',
    precedent: 'Pizzagate (2016) — a single 4chan post going viral in 72 hours; Plandemic (2020) — 8M views in a week; "Bernie\'s mittens" (2021) — anodyne but the same kinetic shape. The first hit changes everything.',
    visible: (s) => s.resources.attention >= 80 && !s.completedProjects['first-viral-moment'],
    teased: (s) => s.resources.attention >= 30 && !s.completedProjects['first-viral-moment'],
    teaseHint: 'A first big hit. Permanent doubler. Unlocks at 80 attention.',
    effect: (s) => {
      s.flags['firstViralMoment'] = true;
      s.log.unshift('Your first post catches fire. Screenshots circulate for days.');
    },
  },
  {
    id: 'editorial-calendar',
    name: 'Editorial Calendar',
    cost: { attention: 10_000 },
    era: 'grassroots',
    blurb: 'A schedule. Daily posting. Stop winging it. Unlocks Engagement; outlets now compound (each adds 16% more storage than the last).',
    precedent: 'The Macedonian Veles operations ran on daily-post schedules generating $5K–$10K/month per operator in Facebook ad revenue. (BuzzFeed, 2016)',
    visible: (s) => s.resources.attention >= 7000 && !s.completedProjects['editorial-calendar'],
    teased: (s) => s.resources.attention >= 3000 && !s.completedProjects['editorial-calendar'],
    teaseHint: 'A paradigm project. Unlocks at 7K attention.',
    effect: (s) => {
      s.flags['editorialCalendar'] = true;
      s.caps.engagement = 5000;
      s.log.unshift('You ship an editorial calendar. The chaos starts to feel intentional.');
    },
  },
  {
    id: 'cpc-network',
    name: 'Crisis Pregnancy Center Network',
    cost: { attention: 2_000_000, engagement: 500_000 },
    era: 'blog',
    blurb: 'Open "pregnancy centers" that look like medical clinics but offer no medical care. Triples engagement storage, +50% emotional output, +small cure tick.',
    precedent: '2,750+ Crisis Pregnancy Centers operate across the U.S. (Guttmacher 2024). FTC-cited deceptive practices since the 1980s. They outnumber actual abortion clinics 3:1; an established template for "concern-coded" disinformation in women\'s health.',
    visible: (s) =>
      phaseGE(s, 'blog') &&
      s.resources.engagement >= 200_000 &&
      !s.completedProjects['cpc-network'],
    effect: (s) => {
      s.flags['cpcNetwork'] = true;
      s.cure = Math.min(1, s.cure + 0.02);
      s.log.unshift('You open 2,750 storefronts. Real medical authorities push back hard.');
    },
  },
];

export function projectById(id: string): ProjectDef | undefined {
  return PROJECTS.find((p) => p.id === id);
}

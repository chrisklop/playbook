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
  // Multiple real-world precedents that rotate on click.
  precedents?: string[];
  visible: (s: GameState) => boolean;
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
  precedents?: string[];
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
  precedents?: string[];
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
    costGrowth: 1.04,
    costResource: 'attention',
    produces: { attention: 2 },
    blurb: 'A fake account dressed for the part. Cheap, fast, low credibility.',
    precedents: [
      'The Russian IRA ran ~80 staff full-time posing as Americans, $1.25M/month budget. (Senate Intel Vol. II, 2019)',
      'Spamouflage Dragon (China): Meta removed ~5,000 sock-puppet accounts in Q1 2023 alone. (Graphika, Meta Adversarial Threat Report)',
      'Iranian "Liberty Front Press" — Facebook removed 652 inauthentic pages and accounts in Aug 2018. (FB security update)',
      'China\'s "50 Cent Army" (Wumao) — estimated 488 million pro-government posts per year by paid commenters. (Harvard / King, Pan, Roberts 2017)',
      'The Clemson/NBC Russian Trolls dataset: 5.4M tweets from ~3,800 IRA accounts published in full, 2018.',
      'Indian state-aligned IT cells, documented by DFRLab (2022): coordinated networks pushing communal narratives.',
      '"Team Jorge" — exposed by Forbidden Stories / The Guardian 2023: Israeli-run sock-puppet-for-hire targeting 33 elections worldwide.',
      'Saudi state "Project Eskimo" (allegedly) — 2019–2020 takedowns of Saudi-aligned Twitter accounts pushing pro-MBS narratives.',
      'Stanford Internet Observatory routinely identifies sock-puppet networks via stylometry + activity patterns in disclosed Twitter/Meta datasets.',
      'K-pop "fan armies" mass-create accounts to brigade trending hashtags — sometimes for activism (BLM hashtags 2020), sometimes to harass critics.',
    ],
    visible: () => true,
  },
  {
    id: 'anonymousBlogger',
    name: 'Anonymous Blogger',
    era: 'grassroots',
    kind: 'human',
    baseCost: 800,
    costGrowth: 1.06,
    costResource: 'attention',
    produces: { attention: 6 },
    blurb: 'A real person posting under a pseudonym. Slower but credible.',
    precedents: [
      'Bari Weiss left the NYT for Substack in 2020 citing "unlawful discrimination" — paywalled credibility for hot takes. (Resignation letter, NYT, 2020)',
      'Glenn Greenwald migrated from The Intercept to Substack in 2020 over a Biden-Burisma editing dispute, taking a large audience with him.',
      'Matt Taibbi left Rolling Stone for Substack in 2020; later released the "Twitter Files" 2022, mixed editorial reception.',
      'Andrew Sullivan left New York Magazine for Substack in 2020 after an essay-editorial dispute. (NYMag statement)',
      'RFK Jr. ran his "Defender" anti-vax operation as a hybrid email newsletter + Substack pre-2024 campaign.',
      'Joseph Mercola earned $7M+/yr promoting supplements via blogs and newsletters before multiple FTC settlements (2016, 2017).',
      'Belle Gibson (Australia, 2014) — built a multimillion-dollar wellness brand on a fabricated cancer-cure story; later fined A$410K.',
      'The "Goop" content engine: Gwyneth Paltrow\'s site settled $145K with the CA AG over jade-egg health claims (2018).',
      'Birds Aren\'t Real — pseudonymous Gen-Z performance art mimicking Q-style anonymous influence. Now a documented satire movement.',
      'Heather Cox Richardson — pseudonymous-fronted academic newsletter, ~1M Substack subs by 2023. Same template, different politics.',
    ],
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
    costGrowth: 1.035,
    costResource: 'attention',
    produces: {},
    blurb: 'A WordPress install with a serious-looking masthead. Adds attention storage.',
    precedents: [
      'Macedonian teenagers in Veles ran 100+ pro-Trump fake news sites for ad revenue. They tested both sides; pro-Trump fabrications drove 4–5× engagement. (BuzzFeed/Wired, 2016)',
      'NewsGuard tracks 1,200+ "pink slime" sites — algorithmically-generated local "news" sites with hyper-partisan content. (NewsGuard Report 2024)',
      'Local Government Information Services (LGIS / Metric Media): network of ~1,300 right-aligned "local news" outlets identified by Tow Center 2020.',
      'The Russian Doppelganger network cloned Bild, Le Monde, Fox News, The Guardian with near-identical URLs. (Meta Adversarial Threat Report, 2022)',
      'Iran-backed "Liberty Front Press" — operated 70+ sites pushing pro-Iran content. (Reuters / FireEye 2018)',
      '"Real Raw News" — fictional accounts of military tribunals for celebrities; widely shared as "real" by older audiences.',
      'Chinese state CGTN America: shut down by FCC 2020 over registration; pivoted to digital-only after.',
      'Disinformation-as-a-service: 2020 NATO StratCom report identified buying 30,000 fake comments + 5,000 fake likes for <€500.',
      'India\'s ANI news agency accused by EU DisinfoLab (2020) of laundering content from 750+ fake outlets across 116 countries.',
      'The "Liberty Daily" and similar drudge-style aggregators: traffic-driven outrage cycle, $$ from ad-network impressions.',
    ],
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
    costGrowth: 1.07,
    costResource: 'attention',
    produces: { engagement: 0.8 },
    blurb: 'A paywalled "I\'m just asking questions" newsletter. Mid-credibility, steady engagement.',
    precedents: [
      'Glenn Greenwald, Bari Weiss, Matt Taibbi, Andrew Sullivan migrated to Substack 2020+. RFK Jr. anti-vax operation lived there. Paywalls launder credibility.',
      'Substack defended hosting Nazi-aligned newsletters in 2023 before partial reversal under writer pressure. (The Atlantic, Dec 2023)',
      'Curtis Yarvin (a.k.a. Mencius Moldbug) — Thiel-funded "Dark Enlightenment" / NRX intellectual lineage; built audience on Substack era.',
      'The "Free Press" by Bari Weiss raised reported $15M+ at $100M valuation in 2024 — paywalled-news-as-startup model.',
      'Glenn Loury, John McWhorter, Coleman Hughes — heterodox-academic Substack pipeline.',
      'Kremlin-aligned outlets (Strategic Culture Foundation, NewsFront) — sanctioned as foreign agents by Treasury 2021.',
      'Joseph Mercola\'s "Take Control of Your Health" newsletter — 3.6M social following, key node in CCDH "Disinformation Dozen" 2021.',
      'Children\'s Health Defense (RFK Jr.) hybrid newsletter + Substack — 350K+ subscribers by 2023 (CCDH).',
      'The Federalist / The Daily Wire content network — ad-revenue + subscriber pipelines for political-content factories.',
      'Bari Weiss / "The Free Press" hosted the 2024 "Twitter Files" follow-on documentary, raising authorial-platform-as-narrative-launderer questions.',
    ],
    visible: (s) => phaseGE(s, 'blog'),
  },
  {
    id: 'doppelganger',
    name: 'Doppelganger Cluster',
    era: 'blog',
    kind: 'bot',
    baseCost: 1800,
    costGrowth: 1.06,
    costResource: 'attention',
    produces: { engagement: 1.5 },
    blurb: 'Cloned news sites with near-identical URLs and stolen branding. Fast engagement, high heat.',
    precedents: [
      'Russian "Doppelganger" network cloned Bild, Le Monde, Fox News, The Guardian — Meta took down 5,000+ accounts across 4 years. (Meta Adversarial Threat Report, 2022–2024)',
      'Spamouflage Dragon (China) ran ~7,700 inauthentic accounts across 50+ platforms — Meta\'s biggest single takedown ever, Q3 2023.',
      'EU DisinfoLab "Indian Chronicles" (2020): 750+ fake media outlets, fake think tanks, ~10 fake EU NGOs run by Indian operatives over 15 years.',
      'Iran\'s "International Union of Virtual Media" pushed copies of Reuters/AP content on fake mirror sites. (Citizen Lab, FireEye 2018)',
      'Romanian "Trolly George" network exposed 2024 — ad-buying fake-outlet operation funding pro-Russian content via TikTok.',
      'Anti-vax mirror outlets — "Children\'s Health Defense" syndicates content across hundreds of "alt-health" partner sites.',
      'Climate-denial mirror network — Heartland Institute / Cooler Heads Coalition documented by InsideClimateNews 2015.',
      'Iranian "Endless Mayfly" disinfo network — published forged screenshots impersonating real journalists. (Citizen Lab 2019)',
      'Sea of Galilee / EuroNews-Brussels-clones — Russian Doppelganger 2022–24 specifically targeted Western Europe via news-shaped fakes.',
      'The Daily Caller / Federalist "syndicated content" pipeline — legitimate-looking aggregation of partisan claims via cross-posting.',
    ],
    visible: (s) => phaseGE(s, 'blog'),
  },
  {
    id: 'newsletter',
    name: 'Newsletter Stack',
    era: 'blog',
    kind: 'bot',
    baseCost: 1500,
    costGrowth: 1.05,
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
    costGrowth: 1.07,
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
    costGrowth: 1.08,
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
    costGrowth: 1.06,
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
    costGrowth: 1.05,
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
    precedents: [
      'Reuters Institute (2019) analysis: fake-news headlines were 5× more likely to use emotional or alarming language than verified news.',
      'Vosoughi/Roy/Aral MIT 2018: false news on Twitter was 70% more likely to be retweeted than true news — driven by novelty and emotional surprise.',
      'Facebook MSI 2018 algorithm change (Frances Haugen / Facebook Papers 2021) measurably increased anger, division, and misinformation engagement.',
      'Upworthy / ViralNova era (2013–2015) industrialized the "you won\'t believe" headline pattern; bait-engagement metrics jumped 4×.',
      'New York Post tabloid tradition of provocative front-page headlines — "Headless Body in Topless Bar" (1983) is taught as case study.',
      'BuzzFeed\'s 2014 hate-engagement research: posts triggering anger or fear got 1.7× more shares than ones triggering positive emotions.',
      'Sky News Australia anger-cycle research (Lewis et al. 2022): outrage segments held viewer attention 2.3× longer than informational ones.',
      'TikTok 2022 Mozilla study: new accounts served alarmist content within minutes of related views, amplifying eating-disorder + conspiracy claims.',
      'Drudge Report headline psychology (1995+): all-caps, single emotional adjective, no qualifier — became template for early "alternative" news sites.',
      'Pew Research 2018: news content using "high arousal" emotion (anger, anxiety, surprise) was shared 2.8× more on social than neutral coverage.',
    ],
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
    precedents: [
      'IRA ran "Heart of Texas" (250K followers) AND "United Muslims of America" simultaneously, then organized rallies at the same Houston address, same day. (Senate Intel Vol. II, 2019)',
      'Russian IRA Facebook content was 66% race-focused — the "Blacktivist" fake page alone generated 11.2M engagements. (Senate Intel Vol. II)',
      'Cambridge Analytica claimed psychographic targeting via Big Five traits — 300 likes could predict personality as accurately as a spouse. (2015 Stanford study)',
      'Trans bathroom-bill weaponization: Pew 2017–2020 — issue salience went 12% → 38% in 3 years via coordinated content pipelines, both flanks.',
      '"Antifa" framing: a small decentralized network blown up into a national bogeyman + counter-narrative; documented by DFRLab (2020).',
      'India\'s IT Cell — communal wedge campaigns documented by The Wire / DFRLab (2018+): WhatsApp message-floods preceding actual riots.',
      'Iran-Saudi rivalry: each side\'s state media + sock-puppet networks amplify wedge issues against the other. (Reuters Institute 2020)',
      'China\'s Taiwan election interference 2018, 2020: amplified DPP vs KMT antagonism; 86 Taiwanese government agencies hit, MJIB study.',
      'Brazil 2022 election: WhatsApp-driven wedge content + viral audio + cross-platform memes; DFRLab + Inst. Vladimir Herzog tracking.',
      '"Stop the Steal" coordination: documented in J6 Cmte report — Twitter mass-coordination among Trump-allied accounts post-election.',
    ],
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
    precedents: [
      'RAND PE-198 (Paul & Matthews, 2016) documented the Russian propaganda model — distinguished by sheer volume; contradictions intentional.',
      'Soviet "active measures" doctrine, formalized 1960s. (Thomas Rid, "Active Measures," 2020 — definitive history.)',
      'Iranian "Liberty Front Press" content flood — 70+ sites + Twitter accounts pumping anti-Israel narratives simultaneously. (Reuters/FireEye 2018)',
      'COVID misinformation flood Feb 2020 onward: WHO declared an "infodemic" on Feb 13 2020 — first time the term was officially used.',
      'QAnon "drops" cadence: ~5000 posts on 4chan/8kun between Oct 2017 and Dec 2020 forced followers to constantly catch up.',
      'Pizzagate (Dec 2016): thousands of tweets in 72 hours overwhelmed normal fact-check cycle; man with AR-15 entered restaurant before debunking caught up.',
      'CCDH "Disinformation Dozen" (2021): 12 actors produced ~65% of anti-vax content despite repeated platform takedowns.',
      'ISIS Twitter campaign 2013–2015: 90,000+ pro-ISIS accounts at peak before coordinated takedowns. (Berger & Morgan, Brookings 2015)',
      'Bannon: "The Democrats don\'t matter. The real opposition is the media. The way to deal with them is to flood the zone with shit." (Frontline 2018)',
      'India\'s 2019 election WhatsApp flood: 30,000+ rumor pieces tracked, multiple confirmed lynching deaths from spread. (BBC, Reuters)',
    ],
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
    precedents: [
      'QAnon adapted alternate-reality-game structure: cryptic "drops" interpreted by followers. Tied to Jan 6, multiple homicides. (CRS report 2021, Bellingcat)',
      'Pizzagate (2016): originated from John Podesta email leak; "cheese pizza" reinterpreted as code; man with AR-15 entered DC pizzeria Dec 2016.',
      'Sandy Hook "crisis actor" claims (Alex Jones / Infowars, 2012+): $1.5B in defamation judgments, 2022.',
      'Plandemic doc series (Mikki Willis, 2020+): 8M views in first week before takedowns; format reused for multiple sequels.',
      '"The Storm" / "Where We Go One We Go All" (WWG1WGA) — Q-derived terminology, became Trump-rally regular by 2018.',
      'Ron Watkins (8kun admin) — identified by HBO\'s "Q: Into the Storm" (2021) as likely Q poster via stylometry + timing.',
      'Mike Lindell\'s "Cyber Symposiums" (2021–2023) — cryptic "PCAP data" promised, never materialized; same drip-feed pattern.',
      'Italian "PizzaVirgin" copycat: tried to replicate Q-style drops in 2018–2019, never caught on. Pattern needs cultural soil.',
      'Birds Aren\'t Real (2017+): explicitly satirical mirror of Q-style; founder Peter McIndoe revealed in NYT 2021.',
      '"COVID hoax" + "vaccine shedding" framework: each unfalsifiable, builds on conspiracy literacy from prior cycles. (Mercola, RFK Jr. ecosystems)',
    ],
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
    precedents: [
      'Soviet active-measures doctrine, formalized in the 1960s. Adopted globally by post-Soviet info-ops. (Rid, "Active Measures," 2020)',
      'Putin\'s "what about American police?" framing — used routinely to deflect Russian state-violence questions in foreign press.',
      'Tobacco industry "Doubt is Our Product" memo (1969) — established the manufactured-doubt template later adopted for climate denial.',
      'Climate-denial whataboutism: "what about China?" used to deflect domestic-emissions discussions despite per-capita math.',
      'Tucker Carlson Fox era: ~400 airings of "great replacement" framing + "but what about [Dem grievance]?" segments. (Media Matters tally)',
      'Russia-Ukraine war (2022+): Kremlin response to invasion atrocities consistently pivots to "but Bucha was staged" / "what about Iraq?"',
      'Trump\'s "very fine people on both sides" (Charlottesville 2017) — wholewataboutist deflection that became case study.',
      'China response to Uyghur detention reports: "what about US prisons / Black Lives Matter?" — talking points in CCP English-language media.',
      'Israeli/Palestinian discourse: each side\'s defenders deploy whataboutism on civilian deaths; B\'Tselem / IDF data both contested.',
      'Sandy Hook trial defendants (Jones): pivoted to "what about media coverage of Newtown\'s tax base?" — failed in court.',
    ],
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
    precedents: [
      'Russian Doppelganger operation cloned real Western outlets (Bild, Le Monde, Fox News) with near-identical URLs and stolen branding. (Meta threat report, 2022)',
      'AI deepfake of UK CEO\'s voice used to authorize $243K fraudulent transfer. (Wall Street Journal, 2019)',
      'GAN-generated headshots ("thispersondoesnotexist.com" tech) — used by Spamouflage, Russia, Iran for fake-profile authenticity since 2019.',
      'Hong Kong CEO deepfake video-call: company defrauded of $25.6M after attackers impersonated CFO + colleagues. (CNN Feb 2024)',
      'Israeli "Team Jorge" (exposed by Forbidden Stories/Guardian 2023): rent-a-disinfo operation, targeted 33 elections.',
      'Iran "Charming Kitten" APT — impersonated journalists, academics, family members of dissidents to phish credentials.',
      '"Catfishing" research (Hancock et al. Stanford, 2007–2020): 27% of online dating profiles had measurably deceptive photos.',
      'Endless Mayfly (Iran) — published forged screenshots of fake tweets impersonating real journalists. (Citizen Lab 2019)',
      '"This Person Does Not Exist" (StyleGAN, 2019) — single-click photorealistic fake faces; now used at scale by every state operator.',
      'Vietnam-based catfishing rings: documented in DOJ crypto-romance scam indictments 2022–2024. Stolen photos + deepfake voice memos.',
    ],
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
    precedents: [
      'Pizzagate (2016): a single 4chan post going viral in 72 hours took the conspiracy from message-board fringe to mainstream news cycle.',
      'Plandemic (2020): Mikki Willis\'s 26-minute video hit 8M views in one week before takedowns.',
      '"Bernie\'s mittens" (2021): anodyne content, but the same shape — single image, mass remixing, 24-hour saturation.',
      'Andrew Tate\'s viral 2022 breakout: TikTok clips remixed across thousands of accounts before YouTube/Meta bans (CCDH "Hidden Hate" 2022).',
      'The "Couch" rumor about JD Vance (2024) — a single anonymous tweet metastasized into a national meme in 48 hours.',
      '"Defund the police" 2020 — phrase coined in protest, weaponized within weeks by both flanks for opposing campaigns.',
      'Q\'s first drop (Oct 28 2017): "Hillary Clinton will be arrested between 7:45 AM - 8:30 AM EST on Monday." Wrong but seeded a movement.',
    ],
    visible: (s) => s.resources.attention >= 80 && !s.completedProjects['first-viral-moment'],
    teased: (s) => s.resources.attention >= 30 && !s.completedProjects['first-viral-moment'],
    teaseHint: 'A first big hit. Permanent doubler. Unlocks at 80 attention.',
    effect: (s) => {
      s.flags['firstViralMoment'] = true;
      s.log.unshift('Your first post catches fire. Screenshots circulate for days.');
    },
  },
  {
    id: 'viral-cascade',
    name: 'Viral Cascade',
    cost: { attention: 50_000 },
    era: 'grassroots',
    blurb: 'Drop a manufactured moment. ×5 attention production for 5 minutes — the cascade does the work.',
    precedents: [
      '"Ice Bucket Challenge" (2014): 17 million videos in 6 weeks, $115M raised — non-political but template-defining.',
      'BLM hashtag spike post-George Floyd (2020): 47.8M tweets in 10 days. (Pew analysis 2020)',
      'Macedonian Veles 2016: a single fabricated story could drive $5K–$10K of ad revenue in a single day at peak.',
      '"Stop the Steal" hashtag accelerator (Nov 2020 – Jan 6 2021): J6 Cmte traced the coordinated tag-cluster across 11 platforms.',
      '"Plandemic" 8M-views-in-a-week phenomenon (May 2020) — same cascade shape.',
    ],
    visible: (s) => s.resources.attention >= 50_000 && !s.completedProjects['viral-cascade'],
    teased: (s) => s.resources.attention >= 20_000 && !s.completedProjects['viral-cascade'],
    teaseHint: 'A one-shot ×5 burst. Unlocks at 50K attention.',
    effect: (s) => {
      s.event = {
        id: 'viral-cascade',
        until: s.lastTick + 5 * 60 * 1000,
        mult: 5,
        resourceId: 'attention',
      };
      s.log.unshift('▶ Viral Cascade ignites. Five minutes of ×5 attention. Ride it.');
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

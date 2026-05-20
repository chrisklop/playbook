// PATRONS — major recurring benefactors with permanent buffs and cure costs.
// Each is a one-shot activation (like a project) that sets a flag. Flags
// drive production multipliers + cure jumps on activation.
//
// Design (Phase 3D, per user direction): right-coded weighted because
// empirically that's the documented record; two cross-spectrum patrons
// (foreign state + foundation + tankie) provide dimensional balance per
// CONTENT.md §7.4 — not partisan-50/50, but *dimensionally diverse*.

import type { GameState, ResourceId, PhaseId } from '../types';

const PHASE_ORDER: PhaseId[] = [
  'grassroots', 'blog', 'social', 'influencer', 'cable', 'aisaturation',
];

function phaseAtLeast(s: GameState, target: PhaseId): boolean {
  return PHASE_ORDER.indexOf(s.phase) >= PHASE_ORDER.indexOf(target);
}
function phaseGap(s: GameState, target: PhaseId): number {
  return PHASE_ORDER.indexOf(target) - PHASE_ORDER.indexOf(s.phase);
}

export interface PatronDef {
  id: string;
  name: string;
  archetype: string;          // short tag, e.g. "presidential candidate"
  era: PhaseId;               // when patron becomes activatable
  cost: Partial<Record<ResourceId, number>>;
  cureJump: number;           // applied once on activation
  buffs: Partial<Record<ResourceId, number>>; // additive % buff per resource
  blurb: string;
  precedents: string[];
  // Optional extra unlock requirement beyond era.
  requires?: (s: GameState) => boolean;
  requiresHint?: string;
}

export const PATRONS: PatronDef[] = [
  // ── INFLUENCER ERA ───────────────────────────────────────────────────
  {
    id: 'patron:mar-a-lago',
    name: 'The Mar-a-Lago Faction',
    archetype: 'presidential candidate',
    era: 'influencer',
    cost: { engagement: 500_000 },
    cureJump: 0.05,
    buffs: { followers: 0.30, engagement: 0.20 },
    blurb: 'A real-estate-developer-turned-candidate offers backing. His rallies move millions; his lawyers move slower.',
    precedents: [
      'WaPo Fact Checker logged 30,573 false or misleading claims across Trump\'s 4-year presidency. (Updated database, 2021)',
      'Project Alamo (2016): Brad Parscale\'s Trump-campaign data operation, $94M ad spend, dark-posted to demographically-segmented audiences.',
      'J6 Cmte Final Report (Dec 2022): 845-page documentation of coordinated post-election effort to overturn 2020 results across multiple states.',
      'Dominion Voting Systems v Fox News: $787.5M settlement (April 2023) over claims aired about voting machines.',
      'NY State civil-fraud judgment v Trump (Feb 2024): $354.8M plus interest, finding decade-plus fraud across the Trump Organization.',
      'E. Jean Carroll defamation suits: $5M (May 2023) + $83.3M (Jan 2024). Carroll had testified Trump raped her in the 1990s.',
      'Stop the Steal coordination (Nov 2020 – Jan 6 2021): tracked across 11 platforms in J6 Cmte report.',
      'Steve Bannon "war room" podcast cadence — multiple hours/day, 2.4M+ avg listeners as of 2022. (Slate analysis)',
      'OAN / Newsmax pivot post-2020: replaced Fox as preferred outlet for election denialism. Both faced Dominion / Smartmatic suits.',
      'Truth Social launched Feb 2022 — Trump\'s own platform after Twitter ban; SPAC merger raised $300M with significant insider trading.',
    ],
    requires: (s) => (s.upgrades['discrediting-1'] ?? 0) >= 10 || (s.upgrades['conspiracy-1'] ?? 0) >= 10,
    requiresHint: 'Requires Whataboutism or Q-Drop schedule at tier 10.',
  },
  {
    id: 'patron:elron-musket',
    name: 'Elron Musket',
    archetype: 'platform-owning billionaire',
    era: 'influencer',
    cost: { engagement: 600_000 },
    cureJump: 0.04,
    buffs: { engagement: 0.40, attention: 0.20 },
    blurb: 'A tech billionaire buys the platform and adjusts the rules in real time. Your reach spikes; your visibility metric does too.',
    precedents: [
      'Elon Musk closed the $44B Twitter acquisition in October 2022. Within weeks: laid off ~75% of staff; restored ~62K previously-banned accounts. (FTC consent decree filings)',
      'Musk personally amplified replacement-theory and "great-reset" content via @elonmusk replies in 2023–24, per CCDH and ISD tracking.',
      'Peter Thiel funded both JD Vance and Blake Masters 2022 Senate campaigns with $15M each — same year backing Yarvin/NRx-adjacent intellectual network.',
      'Robert Mercer / Cambridge Analytica (2016): Mercer funded both Cambridge Analytica ($15M) and Bannon-era Breitbart ($10M).',
      'Marc Andreessen + Ben Horowitz: a16z\'s 2024 "Little Tech Agenda" + public Trump endorsement signaled major Silicon Valley right-shift.',
      'Curtis Yarvin ("Mencius Moldbug"): Thiel-network-funded "Dark Enlightenment" / NRx intellectual; cited by Vance in interviews.',
      'X "Creator Revenue Share" program (July 2023): pays accounts based on engagement, structurally rewards viral / inflammatory content.',
      'Twitter Files (Dec 2022 – Mar 2023): Musk-coordinated release via Taibbi/Weiss/Shellenberger, mixed evidentiary value, big audience.',
      'X paid content moderation cuts: trust & safety staff went from ~230 to ~20 by end of 2023. (CCDH, ISD reporting)',
      'Linda Yaccarino tenure (Jun 2023 – Jul 2025): CEO appointed to manage advertiser bleed; resigned after Grok/Hitler incident.',
    ],
    requires: (s) =>
      (s.upgrades['impersonation-1'] ?? 0) >= 8 ||
      (s.upgrades['trolling-1'] ?? 0) >= 10,
    requiresHint: 'Requires Stolen Photo Bank at 8+ or Firehose at 10+.',
  },
  {
    id: 'patron:embassy-cutout',
    name: 'The Project Lakhta Account',
    archetype: 'foreign state actor',
    era: 'cable',
    cost: { engagement: 400_000 },
    cureJump: 0.10,
    buffs: { attention: 0.15, engagement: 0.15, followers: 0.10 },
    blurb: 'A Project-Lakhta-style umbrella appears: shell companies, wire transfers, "media holdings" billing for 80 full-time staff posing as Americans. Real money; Mebro climbs faster.',
    precedents: [
      'Russian IRA: $1.25M/month operating budget, ~80 full-time staff posing as Americans, 2014–2018. (Senate Intel Vol. II, 2019)',
      'Chinese Spamouflage Dragon (Graphika 2019+): single largest covert influence op Meta has tracked — ~7,700 accounts Q3 2023.',
      'Iranian "Liberty Front Press": 70+ websites + 600+ Facebook accounts, taken down by FB Aug 2018. Pushed pro-Iran / anti-Israel narratives.',
      'Iranian APT42 (Charming Kitten): credential-phishing campaigns targeting US/UK journalists, academics, dissidents (Mandiant 2023+).',
      'EU DisinfoLab "Indian Chronicles" (2020): 750+ fake outlets, fake think tanks, 10+ fake EU NGOs over 15 years.',
      'Saudi-aligned Twitter takedowns (2019–2020): tens of thousands of accounts pushing pro-MBS narratives.',
      'Russian Doppelganger network: Bild/Le Monde/Fox News/Guardian clones, ~5,000 accounts removed across 2022–2024 (Meta).',
      'Iran "Endless Mayfly": forged screenshots impersonating real journalists, 2016–2020. (Citizen Lab)',
      'North Korean Lazarus Group: hybrid hacking + disinfo via stolen identities — Sony Pictures (2014), $4.5B+ in crypto thefts.',
      'Brazilian "MidiaNINJA" / Bolsonaro era WhatsApp flood: enabled by foreign-mirror state media (CGTN, RT en Español).',
    ],
    requires: (s) => {
      const totalBots = (s.assets.sockPuppet ?? 0) +
        (s.assets.doppelganger ?? 0) +
        (s.assets.spamouflage ?? 0);
      return totalBots >= 100;
    },
    requiresHint: 'Requires 100+ bot assets across all types.',
  },
  {
    id: 'patron:anti-imperialist',
    name: 'The Anti-Imperialist Press',
    archetype: 'horseshoe-left aligned outlet network',
    era: 'social',
    cost: { engagement: 350_000 },
    cureJump: 0.04,
    buffs: { engagement: 0.25, credibility: 0.10 },
    blurb: 'A pro-Russia "left" outlet network proposes co-publishing. Their audience believes them more than the West does.',
    precedents: [
      'The Grayzone (Max Blumenthal, Aaron Maté): documented amplifier of Russian state narratives; sanctioned-outlet sourcing per US Treasury data.',
      'MintPress News: regularly featured on RT America before 2022 shutdown; ISD tracking shows cross-citation patterns with Russian state media.',
      'Aaron Maté\'s late-career pivot: from Democracy Now! to consistent Kremlin-friendly framing on Ukraine and Bucha attribution.',
      'Glenn Greenwald arc (2014–present): Snowden-era hero → consistent contrarian on Russia-related stories → 2022 Bucha denial controversies.',
      'Strategic Culture Foundation: US Treasury sanctioned as Russian intelligence-linked October 2021. Publishes English-language commentary.',
      'NewsFront: sanctioned by US Treasury (April 2021) as Russian-disinformation outlet, formally tied to FSB-linked actors.',
      'Code Pink: documented receipt of CGTN-adjacent funding 2019 (NYT investigation, "code-pink-spotlights-china").',
      'Tucker Carlson 2024 Putin interview: cited by Russian state media as proof of "fair Western coverage" — left-coded contrarianism + right-coded media.',
      'Roger Waters\'s 2023 RT interview cycle and pro-Putin framing during Ukraine war.',
      'Pacifica / Democracy Now! contributors splinter group around Syria coverage (2013+) — documented in Idrees Ahmad\'s academic work.',
    ],
  },

  // ── CABLE ERA ────────────────────────────────────────────────────────
  {
    id: 'patron:seven-mountains',
    name: 'The Seven Mountains Coalition',
    archetype: 'Christian nationalist movement',
    era: 'cable',
    cost: { credibility: 2_000_000 },
    cureJump: 0.03,
    buffs: { credibility: 0.35, narrativeDominance: 0.20 },
    blurb: 'A coalition of pastor-influencers, Project 2025 architects, and conference-circuit prophets. They want the seven peaks of cultural authority. You\'re one peak.',
    precedents: [
      'New Apostolic Reformation (NAR): coordinated network of "prophets" and "apostles" claiming authority over politics — distinct from mainline evangelicalism. (Berkley Center, Brookings)',
      '"Seven Mountains Mandate" (Loren Cunningham, Bill Bright 1975 → Lance Wallnau 2008+): explicit doctrine to take cultural authority over media, government, education, business, family, religion, arts.',
      'Project 2025 / Heritage Foundation Mandate for Leadership (Jan 2024): 922-page blueprint co-signed by 110+ conservative orgs. (Heritage publication.)',
      'Lance Wallnau: NAR figure, $130K Trump-Wallnau cross-fundraising 2023; "Lion Of Judah" prophecy series.',
      'Sean Feucht: musician-pastor; mass open-air worship events at state capitols 2020–2024, $2.4M revenue per ProPublica 2023.',
      'Paula White: spiritual advisor to Trump\'s 2020 campaign; "I rebuke that thing in Jesus\' name" viral sermon (Nov 2020).',
      'David Barton / Wallbuilders: pseudohistorical "Christian founding" narratives, repeatedly debunked by academic historians.',
      'Doug Wilson / Moscow, ID: theonomist enclave, Christ Church + Logos School + New Saint Andrews College. Documented in Vice News 2022.',
      'Bethel Church (Redding, CA): NAR-affiliated megachurch, $90M annual budget per IRS 2022 filings, exports "prophetic" framework.',
      'The Falkirk Center / Charlie Kirk: Liberty University-housed political-advocacy arm, Trump-aligned youth-org pipeline.',
    ],
    requires: (s) =>
      (s.upgrades['conspiracy-1'] ?? 0) >= 15 ||
      (s.upgrades['emotional-1'] ?? 0) >= 20,
    requiresHint: 'Requires Q-Drop schedule 15+ or Outrage Headlines 20+.',
  },
  {
    id: 'patron:replacement-bench',
    name: 'The Replacement Bench',
    archetype: 'white-nationalist faction',
    era: 'cable',
    cost: { credibility: 3_000_000 },
    cureJump: 0.08,
    buffs: { engagement: 0.40, attention: 0.30 },
    blurb: 'A coalition of prime-time hosts, "America First" podcasters, and offline organizers offers exclusive sourcing. The audience is loyal; Mebro spikes harder.',
    precedents: [
      'Tucker Carlson Fox era (2016–2023): ~400 airings of "great replacement" framing per Media Matters tally. Fired April 2023 post-Dominion settlement.',
      'Nick Fuentes / America First: organized AFPAC 2020–2024, opposed CPAC; documented livestream rhetoric, plus 2022 Trump dinner at Mar-a-Lago with Ye.',
      'Charlottesville "Unite the Right" rally (Aug 11–12 2017): Heather Heyer killed by white-supremacist driver; James Alex Fields convicted 2019.',
      'Buffalo Tops shooter manifesto (May 2022): explicitly cited "great replacement" theory; 10 killed at Black-neighborhood grocery.',
      'El Paso Walmart shooter (Aug 2019): manifesto cited "Hispanic invasion of Texas"; 23 killed.',
      'Patrick Casey / Identity Evropa (now American Identity Movement): coordinated college-campus white-nationalist recruitment, exposed by ADL 2019.',
      'Steve Sailer-aligned writers: "human biodiversity" framing cycled through Mercer-funded outlets (Breitbart, VDARE) into Carlson scripts.',
      'Groypers: Fuentes-aligned Twitch streamer network; coordinated harassment campaigns against TPUSA, Daily Wire hosts 2019–2020.',
      'ADL annual hate-and-extremism reports: domestic-extremist murders, 75% of which are right-wing motivated 2009–2023.',
      'Bucks County, PA "white-nationalist flyering" wave (2023–2024): documented by SPLC, tied to NJ-based "Goyim Defense League."',
    ],
    requires: (s) => (s.upgrades['polarization-1'] ?? 0) >= 20,
    requiresHint: 'Requires Wedge Issue Generator at tier 20.',
  },
  {
    id: 'patron:foundation-grant',
    name: 'The Foundation Grant',
    archetype: 'centrist NGO funder',
    era: 'cable',
    cost: { credibility: 1_500_000 },
    cureJump: 0.02,
    buffs: { credibility: 0.25, engagement: 0.10 },
    blurb: 'A respectable foundation funds your "media literacy initiative." The check clears; the editorial independence does not.',
    precedents: [
      'Open Society Foundations (George Soros): $32B+ total grants since 1984; used as right-wing bogeyman but the funding is real and complex.',
      'Bloomberg Philanthropies: $3B+ to climate/journalism. Editorial-firewall concerns over Bloomberg News\'s coverage of Bloomberg owner.',
      'Ford Foundation: $700M+/year in grants; long-running tension between funded journalism and grantmaker interests.',
      'Knight Foundation: $2B+ in journalism support since 1968; routinely fact-checked by recipients, raising conflict-of-interest questions.',
      'MacArthur Foundation: $300M+/year; supports investigative journalism (ProPublica, ICIJ); funding conditionality debates.',
      'Pierre Omidyar / Democracy Fund: $700M+ committed to "democracy" initiatives; funded both The Intercept and centrist think-tanks.',
      'Robert Wood Johnson Foundation: $11B endowment, $400M+/year, public-health-and-policy advocacy. Pharma-tied origin still raises questions.',
      'NewsGuard itself: backed by Knight, MacArthur, ad-tech firms; rates "media reliability" but is itself a media-reliability product.',
      'Politico Pro: a for-profit subscription product whose existence depends on the same Washington establishment it covers.',
      'The "billion-dollar-think-tank ecosystem" (Brookings, AEI, Heritage, Center for American Progress): each funded by ideologically-aligned donors.',
    ],
  },
  {
    id: 'patron:audience-broker',
    name: 'The SCL Group Account',
    archetype: 'psychographic data broker',
    era: 'cable',
    cost: { credibility: 1_800_000 },
    cureJump: 0.02,
    buffs: { followers: 0.30, engagement: 0.15 },
    blurb: 'An SCL-Group-style firm offers psychographic targeting — Big-Five trait inference, 50,000+ attributes per person, dark-ads at scale.',
    precedents: [
      'Cambridge Analytica (2014–2018): claimed psychographic targeting via Facebook data harvested through "thisisyourdigitallife" app (270K consenting → 50M friends).',
      'Acxiom: 23,000+ attributes per consumer, sold to political campaigns + advertisers; revenue ~$1B/yr pre-LiveRamp split.',
      'Experian / TransUnion / Equifax: credit bureaus turned data brokers; ~$10B/yr combined revenue from non-credit data sales.',
      'Palantir: $2.4B+/yr revenue, government + commercial contracts; founded by Thiel + Karp.',
      'Oracle Data Cloud: data-broker arm sold to TransUnion 2022 for $1.3B.',
      'LiveRamp: identity-graph resolution across 600M+ US consumer identifiers.',
      'Mobilewalla, X-Mode (now Outlogic): location-data brokers; FTC enforcement actions 2023–24 over selling location near abortion clinics.',
      'Datalogix (Oracle): purchase-history data, claims to track 1.5B+ consumers via 1,500+ partner sources.',
      'EveryDay Health Group / IBM Watson Health: medical-data acquisition cycles, HIPAA-tangent regulatory gray zones.',
      'Spotify Wrapped/political targeting: 2024 reports showed Spotify ad-tech tied user music habits to political-ad-buying campaigns.',
    ],
  },
];

export function patronById(id: string): PatronDef | undefined {
  return PATRONS.find((p) => p.id === id);
}

export function isPatronVisible(s: GameState, p: PatronDef): boolean {
  if (s.flags[p.id]) return false; // already activated
  if (!phaseAtLeast(s, p.era)) return false;
  if (p.requires && !p.requires(s)) return false;
  return true;
}

export function isPatronTeased(s: GameState, p: PatronDef): boolean {
  if (s.flags[p.id]) return false;
  if (isPatronVisible(s, p)) return false;
  // Tease when one phase away from era OR requires not met but in era.
  return phaseGap(s, p.era) <= 1;
}

export function canActivatePatron(s: GameState, p: PatronDef): boolean {
  if (!isPatronVisible(s, p)) return false;
  for (const [res, amt] of Object.entries(p.cost)) {
    if (s.resources[res as ResourceId] < (amt as number)) return false;
  }
  return true;
}

export function activatePatron(s: GameState, id: string): boolean {
  const p = patronById(id);
  if (!p) return false;
  if (!canActivatePatron(s, p)) return false;
  for (const [res, amt] of Object.entries(p.cost)) {
    s.resources[res as ResourceId] -= amt as number;
  }
  s.flags[p.id] = true;
  s.cure = Math.min(1, s.cure + p.cureJump);
  s.log.unshift(`▶ Patron acquired: ${p.name}. The check clears.`);
  return true;
}

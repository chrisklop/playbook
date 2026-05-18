// Random-event pool. Each event fires for `duration` seconds with a bounded
// multiplier on one resource. Headlines mirror real disinfo incidents.
// Politically balanced — examples span foreign-state, commercial-grift,
// historical, platform-mechanic, and partisan-coded incidents.

import type { GameState, ResourceId, DepictId } from '../types';

export interface EventDef {
  id: string;
  weight: number;
  conditions: (s: GameState) => boolean;
  headline: string;
  precedent?: string;
  duration: number;            // seconds
  resource: ResourceId;
  mult: number;                // 1.3 = +30%, 0.75 = −25%
  technique?: DepictId;        // for future debrief
}

export const EVENT_POOL: EventDef[] = [
  // ── Player-triggered (never auto-picked; project sets state.event) ─────
  {
    id: 'viral-cascade',
    weight: 0,
    conditions: () => false,
    headline: 'Viral Cascade ignited. ×5 attention production for 5 minutes.',
    precedent: 'Single-moment cascade pattern (Ice Bucket, BLM hashtag spike, Plandemic, Stop the Steal). The shape repeats.',
    duration: 300,
    resource: 'attention',
    mult: 5,
  },
  // ── Grassroots-OK (no phase gate) ──────────────────────────────────────
  {
    id: 'late-night-quote-tweet',
    weight: 8,
    conditions: () => true,
    headline: 'A late-night quote-tweet of your post goes off. Replies in the thousands.',
    precedent: 'Bog-standard X mechanic — quote-tweet pile-on amplifies any spicy take. Routinely weaponized by partisan accounts of every flavor.',
    duration: 60,
    resource: 'attention',
    mult: 1.30,
    technique: 'emotional',
  },
  {
    id: 'subreddit-pickup',
    weight: 7,
    conditions: () => true,
    headline: '/r/conspiracy links your post. The brigade arrives.',
    precedent: 'Reddit cross-amplification has fueled QAnon migration, "Stop the Steal" coordination, and routine partisan brigading on both flanks.',
    duration: 60,
    resource: 'attention',
    mult: 1.35,
    technique: 'conspiracy',
  },
  {
    id: 'algorithm-change',
    weight: 5,
    conditions: () => true,
    headline: 'Algorithm change rumor: reach drops while everyone calibrates.',
    precedent: 'Facebook\'s 2018 "Meaningful Social Interactions" pivot, Twitter\'s 2022 algorithm public release, Reddit\'s 2023 API decisions — every platform shift triggers a temporary scramble.',
    duration: 60,
    resource: 'attention',
    mult: 0.80,
    technique: 'discrediting',
  },
  {
    id: 'slow-news-day',
    weight: 6,
    conditions: () => true,
    headline: 'Slow news day. The chyron is desperate for content. Yours\'ll do.',
    precedent: 'Cable-news 24-hour-cycle pressure documented since the 1980s. Slow days are documented to lower editorial bar (Tyndall Report).',
    duration: 60,
    resource: 'attention',
    mult: 1.40,
    technique: 'emotional',
  },
  {
    id: 'dmca-takedown',
    weight: 3,
    conditions: (s) => (s.assets.outlet ?? 0) >= 2,
    headline: 'Bogus DMCA against your post lands. You re-upload, but reach is cut.',
    precedent: 'Copyright-as-weapon used across the spectrum: Lumen Database tracks tens of thousands of bad-faith DMCA notices yearly.',
    duration: 60,
    resource: 'attention',
    mult: 0.75,
  },
  {
    id: 'fake-celeb-retweet',
    weight: 4,
    conditions: () => true,
    headline: 'A verified account retweets you. (It later turns out the account was hacked.)',
    precedent: 'Account-takeover boosts: 2020 Twitter VIP hack (Bitcoin scams via Obama/Musk/Biden accounts); routine credential-stuffing campaigns.',
    duration: 60,
    resource: 'attention',
    mult: 1.50,
    technique: 'impersonation',
  },
  {
    id: 'typo-screenshot',
    weight: 3,
    conditions: () => true,
    headline: 'A typo in your headline is screenshotted and ratio\'d into orbit.',
    precedent: 'Generic ratio-and-dunk pattern. Documented across both flanks; the dunk economy on X is bipartisan.',
    duration: 45,
    resource: 'attention',
    mult: 0.85,
  },
  {
    id: 'wellness-mom-share',
    weight: 5,
    conditions: () => true,
    headline: 'A wellness-mom Instagram with 80k followers shares your post.',
    precedent: '"Disinformation Dozen" report (CCDH 2021): 12 actors drove 65% of anti-vax content. Christiane Northrup, Erin Elizabeth, RFK Jr.\'s circle.',
    duration: 60,
    resource: 'attention',
    mult: 1.25,
    technique: 'impersonation',
  },
  {
    id: 'tucker-style-segment',
    weight: 4,
    conditions: (s) => s.resources.attention >= 50_000,
    headline: 'A Tucker-style late-night segment cites your framing without naming you.',
    precedent: 'Tucker Carlson\'s 2017–2023 Fox primetime show repeatedly platformed online claims with "just asking questions" framing. ($787.5M Dominion settlement against Fox, 2023.)',
    duration: 60,
    resource: 'attention',
    mult: 1.45,
    technique: 'discrediting',
  },
  {
    id: 'cease-and-desist',
    weight: 3,
    conditions: (s) => s.resources.attention >= 80_000,
    headline: 'A C&D letter from a law firm shows up. You back off the most cited post.',
    precedent: 'Defamation cease-and-desist letters as a routine pressure tactic. Big cases: Dominion v Fox, Smartmatic v Newsmax, Sandy Hook families v Jones.',
    duration: 60,
    resource: 'attention',
    mult: 0.75,
    technique: 'discrediting',
  },
  {
    id: 'macedonian-mirror',
    weight: 5,
    conditions: (s) => s.resources.attention >= 20_000,
    headline: 'A Veles-style content farm mirrors your post on 40 fake outlets. CPMs go up.',
    precedent: 'Macedonian teenagers in Veles ran 100+ pro-Trump fake news sites for ad revenue. They tested both sides; pro-Trump fabrications drove 4–5× engagement. (BuzzFeed/Wired, 2016)',
    duration: 60,
    resource: 'attention',
    mult: 1.35,
    technique: 'impersonation',
  },
  {
    id: 'q-drop-resonance',
    weight: 4,
    conditions: (s) => (s.upgrades['conspiracy-1'] ?? 0) >= 3,
    headline: 'Anons interpret your post as a "drop." The decoders go to work.',
    precedent: 'QAnon\'s alternate-reality-game structure: each ambiguous post becomes "proof" of the larger narrative. CRS, Bellingcat extensive documentation.',
    duration: 60,
    resource: 'attention',
    mult: 1.30,
    technique: 'conspiracy',
  },
  {
    id: 'russiagate-pundit',
    weight: 4,
    conditions: (s) => s.resources.attention >= 150_000,
    headline: 'A blue-check pundit ties your post to a Russian-influence narrative without proof.',
    precedent: 'CJR\'s Jeff Gerth retrospective (2023) on Trump-Russia coverage — overcalls from prestige outlets through 2017–19, partially corrected in 2019 Mueller findings. Cross-spectrum disinfo failure.',
    duration: 60,
    resource: 'attention',
    mult: 1.20,
    technique: 'discrediting',
  },
  {
    id: 'pharma-pushback',
    weight: 3,
    conditions: (s) => (s.upgrades['impersonation-1'] ?? 0) >= 3,
    headline: 'A "Big Pharma" callout post you boosted goes viral.',
    precedent: 'Anti-pharma framing has documented left and right adherents — anti-corporate cohort + anti-vax cohort. Mercola earned $7M+/yr on supplements positioned this way (FTC settlement, 2016).',
    duration: 60,
    resource: 'attention',
    mult: 1.30,
  },
  {
    id: 'mainstream-iraq-coverage',
    weight: 3,
    conditions: (s) => s.resources.attention >= 300_000,
    headline: '"Establishment outlet" amplifies a claim of yours uncritically. Then retracts. Slowly.',
    precedent: 'NYT 2004 "From the Editors" retraction acknowledged the paper amplified false Bush-admin WMD claims (Judith Miller-era reporting). Establishment overclaim is a real disinfo vector.',
    duration: 60,
    resource: 'attention',
    mult: 1.40,
  },

  // ── Blog era and beyond ────────────────────────────────────────────────
  {
    id: 'fb-msi-pivot',
    weight: 4,
    conditions: (s) => s.phase !== 'grassroots',
    headline: 'FB tweaks the algorithm. Reach craters on every page that isn\'t fighting.',
    precedent: 'Frances Haugen / Facebook Papers (2021) revealed the 2018 MSI change measurably increased anger and misinformation. Internal staff flagged this.',
    duration: 60,
    resource: 'engagement',
    mult: 0.70,
    technique: 'discrediting',
  },
  {
    id: 'doppelganger-takedown',
    weight: 3,
    conditions: (s) => (s.assets.doppelganger ?? 0) >= 3,
    headline: 'Meta\'s threat intel team takes down 30 of your cloned sites in a single sweep.',
    precedent: 'Meta\'s Adversarial Threat Reports (2022–2024) document quarterly takedowns of "Doppelganger" Russian network — 5,000+ accounts removed across the program.',
    duration: 60,
    resource: 'engagement',
    mult: 0.65,
    technique: 'impersonation',
  },
  {
    id: 'rogan-mention',
    weight: 4,
    conditions: (s) => s.phase !== 'grassroots',
    headline: 'Your framing gets a passing mention on a top-3 podcast. Listenership floods in.',
    precedent: 'Joe Rogan amplification effects: 11M+ avg listeners per episode on Spotify, repeated documented amplification of fringe medical and political claims.',
    duration: 60,
    resource: 'engagement',
    mult: 1.60,
    technique: 'emotional',
  },
  {
    id: 'manosphere-uptake',
    weight: 4,
    conditions: (s) => s.resources.attention >= 50_000,
    headline: 'A "red-pill" manosphere podcaster cites your framing approvingly. The DMs are intense.',
    precedent: 'Andrew Tate (Romania: rape + human trafficking + organized crime charges, 2022–2024; CCDH "Hidden Hate" report 2022). Fresh & Fit (YouTube ban 2023 for hate speech). Documented funnel from "self-improvement" to misogynist radicalization (ISD 2023).',
    duration: 60,
    resource: 'attention',
    mult: 1.40,
    technique: 'emotional',
  },
];

export function pickEvent(state: GameState): EventDef | null {
  const eligible = EVENT_POOL.filter((e) => e.conditions(state));
  if (eligible.length === 0) return null;
  const totalWeight = eligible.reduce((acc, e) => acc + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const e of eligible) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return eligible[eligible.length - 1];
}

export function eventDefById(id: string): EventDef | undefined {
  return EVENT_POOL.find((e) => e.id === id);
}

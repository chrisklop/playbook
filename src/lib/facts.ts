// Rotating ticker corpus. Real, sourced disinfo-research facts.
// One sentence each. Politically balanced — spans foreign-state, commercial,
// historical, platform-mechanic, and partisan-coded incidents.

export interface Fact {
  text: string;
  source: string;
}

export const FACTS: Fact[] = [
  {
    text: 'A 2018 MIT study found false news travels six times faster than true news on Twitter; humans, not bots, drove most of the gap.',
    source: 'Vosoughi, Roy, Aral — Science, vol. 359, 2018',
  },
  {
    text: 'Just 12 individuals were responsible for ~65% of anti-vaccine content circulating on Facebook, Instagram, and Twitter in 2021.',
    source: 'Center for Countering Digital Hate, "Disinformation Dozen," 2021',
  },
  {
    text: 'The Russian Internet Research Agency\'s fake "Blacktivist" Facebook page alone generated 11.2 million engagements before being exposed.',
    source: 'Senate Intelligence Committee Report, Vol. II, 2019',
  },
  {
    text: 'After the 2016 election, Russian IRA activity actually increased — Instagram up 238%, Facebook up 59%, Twitter up 52%.',
    source: 'Senate Intelligence Committee Report, Vol. II, 2019',
  },
  {
    text: 'Macedonian teenagers running pro-Trump fake-news sites in 2016 chose what made them money, not what they believed; they tested both sides.',
    source: 'BuzzFeed News / Wired, 2016',
  },
  {
    text: 'The KGB\'s 1983 Operation Denver planted "U.S. engineered HIV at Fort Detrick" in an Indian newspaper; the claim still circulates 40+ years later.',
    source: 'U.S. State Department Active Measures Working Group, 1987; admitted by Russia 1992',
  },
  {
    text: '15 minutes of playing the inoculation game "Bad News" produced measurable resistance to disinformation across political ideology, education, and age.',
    source: 'Roozenbeek & van der Linden, Cambridge Social Decision-Making Lab, 2019',
  },
  {
    text: 'Inoculation effect targets tactics, not specific ideas — making it generalizable across political domains.',
    source: 'Roozenbeek, van der Linden, et al., Cambridge SDML, 2019–2023',
  },
  {
    text: 'Alex Jones / Infowars paid $1.5 billion in defamation judgments over Sandy Hook "crisis actor" claims.',
    source: 'Connecticut and Texas state court judgments, 2022',
  },
  {
    text: 'Dominion Voting Systems settled with Fox News for $787.5 million over election-fraud claims aired on the network.',
    source: 'Delaware Superior Court settlement, April 2023',
  },
  {
    text: 'A 2014 study found self-identified internet trolls scored significantly higher on dark-triad personality measures — particularly sadism.',
    source: 'Buckels, Trapnell, Paulhus — Personality and Individual Differences, 2014',
  },
  {
    text: 'Facebook\'s 2018 "Meaningful Social Interactions" algorithm change measurably increased anger, division, and misinformation per internal research.',
    source: 'Frances Haugen / Facebook Papers, 2021',
  },
  {
    text: 'IRA ran "Heart of Texas" and "United Muslims of America" simultaneously, organizing rallies at the same Houston address, same day.',
    source: 'Senate Intelligence Committee Report, Vol. II, 2019',
  },
  {
    text: 'The Russian Doppelganger network cloned Bild, Le Monde, Fox News, and The Guardian; Meta removed 5,000+ accounts across 4 years.',
    source: 'Meta Adversarial Threat Reports, 2022–2024',
  },
  {
    text: 'In 2016, Cambridge Analytica harvested data from ~50M Facebook users via a personality quiz only ~270,000 had actually taken.',
    source: 'The Observer / Guardian, 2018',
  },
  {
    text: 'QAnon adapted alternate-reality-game design — followers decoded ambiguous "drops" as proof of an unfalsifiable narrative.',
    source: 'Congressional Research Service, "QAnon: A Conspiracy Theory," 2021',
  },
  {
    text: 'NYT publicly acknowledged in 2004 that its pre-Iraq-war reporting amplified Bush administration WMD claims that turned out false.',
    source: 'NYT "From the Editors; The Times and Iraq," May 26 2004',
  },
  {
    text: 'A 2023 Columbia Journalism Review retrospective found 2017–19 Trump-Russia coverage overstated key claims that were never substantiated.',
    source: 'Jeff Gerth, Columbia Journalism Review, January 2023',
  },
  {
    text: 'In 1976 the Church Committee documented "Operation Mockingbird" — CIA-funded relationships with hundreds of American journalists.',
    source: 'Church Committee Final Report, U.S. Senate, 1976',
  },
  {
    text: 'The Lancet retracted Andrew Wakefield\'s 1998 MMR-autism paper in 2010 after the BMJ documented data fabrication.',
    source: 'BMJ, 2011; Lancet retraction, February 2010',
  },
  {
    text: 'A 2022 Mozilla study found new TikTok accounts could be served conspiracy or eating-disorder content within minutes of related views.',
    source: 'Mozilla Foundation, "TikTok\'s Algorithm Recommends Content to Users," 2022',
  },
  {
    text: 'YouTube\'s "rabbit hole" pattern — each recommendation escalating in extremity — was documented by former Google engineer Guillaume Chaslot.',
    source: 'Ribeiro et al., "Auditing Radicalization Pathways on YouTube," ACM FAT* 2020',
  },
  {
    text: 'There are 2,750+ Crisis Pregnancy Centers in the U.S., outnumbering actual abortion clinics 3:1; FTC has cited deceptive practices since the 1980s.',
    source: 'Guttmacher Institute, 2024',
  },
  {
    text: '"Plandemic" (May 2020, Mikki Willis) hit 8 million views in one week before takedowns; the format spawned a cinematic universe of sequels.',
    source: 'YouTube data, archived by Berkman Klein, May 2020',
  },
  {
    text: 'Goop settled $145,000 with California prosecutors over claims that jade vaginal eggs balanced hormones.',
    source: 'CA Office of the Attorney General, September 2018',
  },
  {
    text: 'Joseph Mercola, identified in the "Disinformation Dozen," had previously paid $2.95M to the FTC over false-advertising claims for tanning beds.',
    source: 'FTC settlement, April 2016',
  },
  {
    text: 'The "Hands Up, Don\'t Shoot" slogan persisted as a movement symbol despite the Obama-era DOJ investigation finding forensic evidence didn\'t support it.',
    source: 'U.S. Department of Justice, Ferguson investigation, March 2015',
  },
  {
    text: 'E. Jean Carroll v Trump: $83.3 million defamation judgment (2024). Dominion v Fox: $787.5M (2023). Sandy Hook v Jones: $1.5B (2022).',
    source: 'Federal and state court records, 2022–2024',
  },
];

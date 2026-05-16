# CORPUS.md — Inoculate Content Spec

> Politically-balanced, technique-tagged content pool feeding `game/content.ts`, `game/events.ts`, `game/achievements.ts`, `game/facts.ts`, and the Mebro debrief.
> Constraint: the villain is the playbook, not a tribe. Every example must carry a `flavor` tag from §1. Runtime draw uses §2 to keep cumulative seen-examples balanced.
> Tone: clinical. Templated examples are obviously fictional or compress widely-documented public incidents.

---

## 1. Tag Taxonomy

### 1.1 DEPICT technique tags (one and only one per example)

| Tag | Technique | One-line definition |
|---|---|---|
| `D` | Discrediting | Attacks the messenger, the methodology, or the institution rather than the claim. |
| `E` | Emotional | Maximizes outrage, fear, disgust, or grievance over information density. |
| `P` | Polarization | Frames an issue as zero-sum tribal conflict; manufactures or amplifies wedges. |
| `I` | Impersonation | Fabricates expertise, identity, or institutional credibility (fake experts, fake citizens, fake outlets). |
| `C` | Conspiracy | Posits hidden coordinated malevolence; unfalsifiable; pattern-matching as evidence. |
| `T` | Trolling | Bait, pile-on, mass-report, sea-lioning, ironic deniability. |

### 1.2 Political-flavor tags (one and only one per example)

| Tag | Definition |
|---|---|
| `wellness` | Wellness/lifestyle influencer space; "natural," anti-vax, "toxins," cleanse culture. |
| `alt-med` | Cancer cure grifters, MMS/ivermectin-as-panacea, supplement empires. |
| `election-denier` | Stolen-election narratives, voting-machine claims, ballot-fraud rumors. |
| `foreign-troll-left` | State-actor inauthentic accounts cosplaying as US progressive activists (documented IRA pattern). |
| `foreign-troll-right` | State-actor inauthentic accounts cosplaying as US conservative activists (documented IRA pattern). |
| `anti-pharma` | Distrust-of-pharma framing weaponized beyond legitimate critique; "Big Pharma kills" memes. |
| `geopolitical-left` | Tankie/campist disinfo: denial of documented atrocities by adversary states, "false flag" claims about Western victims. |
| `geopolitical-right` | Nativist/securitized disinfo: invasion panics, demographic-replacement narratives. |
| `anti-corporate` | Boycott hoaxes, fabricated CEO quotes, fake product-recall panics. |
| `agnostic-grifter` | Financial scams, crypto pump-and-dumps, fake giveaways — no ideological coloring. |
| `COVID-revisionist` | Retroactive rewriting of pandemic events; lab-leak-as-certain, ivermectin martyrdom, vaccine-injury exaggeration. |
| `climate-denial` | Manufactured doubt about climate science; "they were wrong about the ice age" tropes. |
| `health-panic-left` | 5G-causes-cancer, fluoride-as-poison, GMO-as-genocide — coded coastal/crunchy. |
| `health-panic-right` | Seed-oils-cause-cancer, raw-milk-cures, "they're putting X in the water" — coded trad/MAHA. |
| `celebrity-death-hoax` | Premature obituaries, fabricated illness rumors — politically inert clickbait. |
| `historical-revisionism` | Genocide denial, atrocity minimization across the spectrum. |

### 1.3 Flavor balance buckets (for the §2 balancer)

Buckets group flavors so the draw doesn't have to perfectly match 16 tags — only 4 buckets:

- **bucket-A (coded-left):** `foreign-troll-left`, `anti-pharma`, `geopolitical-left`, `health-panic-left`
- **bucket-B (coded-right):** `foreign-troll-right`, `election-denier`, `geopolitical-right`, `health-panic-right`
- **bucket-C (wellness/health, cross-coded):** `wellness`, `alt-med`, `COVID-revisionist`, `climate-denial`
- **bucket-D (apolitical):** `anti-corporate`, `agnostic-grifter`, `celebrity-death-hoax`, `historical-revisionism`

Target distribution per session of N draws: each bucket within ±15% of N/4.

---

## 2. Balancing Algorithm Spec

The pool has 150+ examples each carrying `{depict, flavor, bucket, text}`. The runtime draw must keep cumulative seen-examples roughly balanced across the 4 buckets, with a softer secondary balance across DEPICT techniques (when the caller is *not* asking for a specific technique).

```ts
// game/content.ts
type Example = {
  id: string;
  depict: 'D'|'E'|'P'|'I'|'C'|'T';
  flavor: FlavorTag;
  bucket: 'A'|'B'|'C'|'D';
  text: string;       // may contain {SLOT} placeholders
  slots?: Record<string, string[]>;
};

const seen = { A: 0, B: 0, C: 0, D: 0 } as Record<Bucket, number>;
const seenByDepict: Record<Depict, number> = { D:0,E:0,P:0,I:0,C:0,T:0 };

/** Inverse-frequency weighted draw. */
export function draw(opts: {
  depict?: Depict;        // when set (debrief card), constrain to technique
  rng: () => number;      // seedable PRNG
}): Example {
  const pool = opts.depict
    ? POOL.filter(e => e.depict === opts.depict)
    : POOL;

  // Weight each example by 1 / (1 + seen[bucket]) * 1 / (1 + seenByDepict[depict]).
  // The +1 prevents divide-by-zero and softens early bias.
  const weights = pool.map(e => {
    const wB = 1 / (1 + seen[e.bucket]);
    const wD = opts.depict ? 1 : 1 / (1 + seenByDepict[e.depict]);
    return wB * wD;
  });

  const total = weights.reduce((a,b) => a+b, 0);
  let r = opts.rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      const pick = pool[i];
      seen[pick.bucket]++;
      seenByDepict[pick.depict]++;
      return fillSlots(pick, opts.rng);
    }
  }
  return pool[pool.length - 1]; // numerical fallback
}

/** Debrief audit — ensure the 6 cards span ≥3 buckets. */
export function pickDebriefSet(rng: () => number): Example[] {
  const techniques: Depict[] = ['D','E','P','I','C','T'];
  for (let attempt = 0; attempt < 12; attempt++) {
    const set = techniques.map(t => draw({ depict: t, rng }));
    const buckets = new Set(set.map(e => e.bucket));
    if (buckets.size >= 3) return set;
    // else: nudge bucket counters and retry
  }
  return techniques.map(t => draw({ depict: t, rng }));
}
```

**Invariants the test suite must hold over 1000 simulated draws:**
- `max(seen.bucket) - min(seen.bucket) ≤ 0.15 × N`
- No single `flavor` exceeds 20% of total draws.
- Every DEPICT technique appears at least once per 30 draws.

---

## 3. Per-DEPICT-Technique Templated Examples

> Format: `[flavor] text`. `{BRACES}` are slot variables filled at runtime from §3.7. All headlines are fictional or compressed composites of widely-documented public incidents.

### 3.1 D — Discrediting (15)

1. `[COVID-revisionist]` "The {INSTITUTION} quietly retracted half its pandemic guidance — but the legacy press won't cover it."
2. `[election-denier]` "Why is the {STATE} Secretary of State refusing a full forensic audit? Ask yourself who benefits."
3. `[foreign-troll-left]` "Mainstream 'fact-checkers' are funded by the same {OLIGARCH} pushing the war. Lateral reading their funders is overdue."
4. `[anti-pharma]` "{JOURNALIST} took {PHARMA_CO} ad money in 2019. Now they're 'debunking' the side-effect data. Coincidence?"
5. `[geopolitical-right]` "Every 'expert' quoted in that piece is on the {THINK_TANK} payroll. This isn't journalism, it's stenography."
6. `[geopolitical-left]` "The 'human rights' NGO citing those numbers gets 80% of its funding from {GOVT}. Apply normal source skepticism."
7. `[wellness]` "Doctors mocked {INFLUENCER} for years. The new study just proved her right. Where's the apology?"
8. `[alt-med]` "Oncologists 'debunked' {THERAPY} because it would bankrupt their practice. Read who funded the debunk."
9. `[climate-denial]` "The same models that predicted an ice age in the {DECADE} are now predicting catastrophe. Why trust them now?"
10. `[anti-corporate]` "{NEWS_OUTLET}'s parent company owns 12% of {CORP}. That's the story they're not telling you."
11. `[election-denier]` "The 'independent' observers were all alumni of the same {UNIVERSITY} program. Independence, my eye."
12. `[health-panic-right]` "Every dietitian pushing seed oils is certified by an institute funded by {SEED_OIL_CO}. Follow the money."
13. `[health-panic-left]` "The 5G 'safety' study was authored by a guy whose lab takes {TELCO} grants. This is industry science."
14. `[foreign-troll-right]` "The journalist 'exposing' the border story is married to a {AGENCY} contractor. This is a planted op."
15. `[COVID-revisionist]` "{ACADEMIC} called {ALT_THEORY} a conspiracy in 2020. Quietly deleted those tweets last month. Memory-holed."

### 3.2 E — Emotional (15)

1. `[wellness]` "A mother watched her {AGE}-year-old change overnight after the shot. She's begging you to listen before it happens to yours."
2. `[election-denier]` "I'm a {AGE}-year-old veteran and I have never been this afraid for my country. They stole it in plain sight."
3. `[geopolitical-right]` "BREAKING: {CITY} is now a war zone. Footage they don't want you to see. Share before this is taken down."
4. `[geopolitical-left]` "Children. They bombed children. And the {NEWS_OUTLET} headline calls it a 'security operation.' Say their names."
5. `[anti-pharma]` "She trusted her doctor. Six months later she's gone. {PHARMA_CO} settled — but no one went to prison."
6. `[foreign-troll-left]` "Black mothers are burying their sons while {POLITICIAN} talks about civility. There is no civility in genocide."
7. `[foreign-troll-right]` "A {AGE}-year-old grandmother was assaulted in {CITY} by an illegal alien the system released THREE times."
8. `[COVID-revisionist]` "My husband took the booster on Tuesday. By Friday his heart had stopped. They called it a coincidence."
9. `[alt-med]` "Stage 4. They sent her home to die. Then a stranger told her about {THERAPY}. She's now cancer-free."
10. `[anti-corporate]` "{CORP} CEO just bought a third yacht while raising your grocery bill 40%. This is what 'inflation' really means."
11. `[health-panic-left]` "My son developed leukemia six months after they installed the {INFRASTRUCTURE} tower next to his school."
12. `[health-panic-right]` "The seed oils they're putting in school lunches are sterilizing your sons. Look at the testosterone graphs."
13. `[election-denier]` "I worked that precinct for 30 years. I have never seen anything like what happened that night. I'm shaking writing this."
14. `[climate-denial]` "They want to take your car, your gas stove, your beef. This isn't about climate. It's about control."
15. `[celebrity-death-hoax]` "Devastating update on {CELEB}'s health. The family is asking for prayers tonight."

### 3.3 P — Polarization (15)

1. `[election-denier]` "If you still trust the {INSTITUTION} after what they did in 2020, you are not on our side. Pick a team."
2. `[foreign-troll-right]` "Real Americans don't 'debate' open borders. You either defend the country or you're complicit."
3. `[foreign-troll-left]` "Centrist 'both sides' liberals are why we keep losing. They are not our allies. They are the soft wing of the enemy."
4. `[geopolitical-left]` "Anyone flying that flag in their bio right now is endorsing what is happening. There is no neutral."
5. `[geopolitical-right]` "Anyone NOT flying that flag in their bio right now is endorsing what is happening. There is no neutral."
6. `[health-panic-left]` "If your pediatrician is still pushing the full schedule, find a new one. They're working for {PHARMA_CO}, not your kid."
7. `[health-panic-right]` "If your wife still drinks oat milk after watching that documentary, the marriage has a bigger problem."
8. `[wellness]` "The mom groups are split. Either you're informed or you're injecting your child with whatever they tell you to."
9. `[COVID-revisionist]` "Everyone who mocked us in 2021 owes us an apology. Until they give it, they don't get to be in our lives."
10. `[anti-pharma]` "There are two kinds of doctors now: the ones taking the money and the ones speaking the truth. Know which yours is."
11. `[election-denier]` "Your neighbor who has that sign in their yard knows what they did. Treat them accordingly."
12. `[geopolitical-left]` "Posting 'both flags' is not peace. It is cowardice with extra steps."
13. `[geopolitical-right]` "If your church is flying that flag this June, find a new church. It's that simple."
14. `[foreign-troll-left]` "Your white liberal friends will perform solidarity on Instagram and vote against it in November. Watch."
15. `[foreign-troll-right]` "Your suburban neighbor watched the riot on TV and voted for the people who let it burn. Remember that."

### 3.4 I — Impersonation (15)

1. `[alt-med]` "Dr. {FAKE_NAME}, board-certified oncologist (ret.), explains the {VITAMIN} protocol your doctor won't prescribe."
2. `[election-denier]` "ANONYMOUS POLL WORKER, 22 years experience: 'What I saw at 3 AM cannot be explained by anything other than fraud.'"
3. `[foreign-troll-left]` "@BlackVoicesMatter — a community account run by Black organizers in {CITY}. Follow for daily action items." *(documented IRA template)*
4. `[foreign-troll-right]` "@HeartOfTexas — a grassroots page for patriots in the Lone Star State. Like and share." *(documented IRA template)*
5. `[wellness]` "As a {CREDENTIAL}-certified holistic nutritionist, I'm telling you what no MD will: the {FOOD} is the cause."
6. `[anti-pharma]` "Leaked internal memo from a {PHARMA_CO} whistleblower — 'we knew by Q2.' Document attached." *(no document is ever attached)*
7. `[COVID-revisionist]` "Dr. {FAKE_NAME}, former CDC advisor, breaks his silence on what really happened in March 2020."
8. `[geopolitical-right]` "Active-duty {BRANCH} officer (verified DM for proof): the deployment orders are not what they're telling you."
9. `[geopolitical-left]` "On-the-ground reporter in {CONFLICT_ZONE} — a journalist the mainstream won't platform — files daily." *(account is two weeks old)*
10. `[anti-corporate]` "Former {CORP} executive (NDA expired this month) tells all. Thread incoming."
11. `[agnostic-grifter]` "{CELEB} is GIVING AWAY 5,000 ETH to celebrate {EVENT}. Verified by his official team. Link below."
12. `[climate-denial]` "Dr. {FAKE_NAME}, climatologist with 40 years at {INSTITUTION}, signed the petition. So did 31,000 others." *(Oregon Petition pattern)*
13. `[health-panic-right]` "MAHA-aligned pediatrician (handles in bio) explains why the standard panel is malpractice."
14. `[health-panic-left]` "Independent biomedical researcher — banned from {PLATFORM} for the truth — publishes here now."
15. `[historical-revisionism]` "Tenured historian at {UNIVERSITY}, recently silenced — releases his suppressed lecture on {EVENT}."

### 3.5 C — Conspiracy (15)

1. `[COVID-revisionist]` "Three coroners in {STATE} have died under suspicious circumstances this year. They all signed the same kind of death certificate."
2. `[election-denier]` "Why did {COUNTY} order new ballot paper from {COUNTRY} four months before the election? Asking questions."
3. `[wellness]` "Notice how every 'sudden adult death' headline uses the exact same three words? The wire services are coordinating."
4. `[anti-pharma]` "Funny how the polio vaccine 'eradicated' polio right as they renamed it 'acute flaccid myelitis.' Look it up."
5. `[geopolitical-left]` "The {INCIDENT} happened 48 hours before the funding vote. That's not coincidence. That's choreography."
6. `[geopolitical-right]` "The same {ETHNICITY} family owns {MEDIA_CO}, {BANK}, and {AGENCY} contracts. You're not supposed to notice." *(this is the antisemitic dog-whistle template — flag for review in §8)*
7. `[foreign-troll-left]` "Look at who got rich from the {WAR}. Same names every time. Same think tanks. Same outcomes."
8. `[alt-med]` "Cancer rates exploded the exact year they introduced {INGREDIENT} into the food supply. Chart in replies."
9. `[climate-denial]` "{INSTITUTION} adjusted the historical temperature record 14 times. Each adjustment cooled the past. Why?"
10. `[health-panic-left]` "Fluoride was a waste product. They needed to dispose of it. So they put it in your child's water. Look up {CITY} 1945."
11. `[health-panic-right]` "Glyphosate is in the rain now. In the rain. And the EPA raised the legal limit four times since 2010."
12. `[COVID-revisionist]` "The pandemic 'preparedness exercise' was held three months before the outbreak. The script was already written."
13. `[election-denier]` "{COUNTY} bought {VENDOR} machines two weeks before the election with no public bid. Where did the money come from?"
14. `[anti-corporate]` "Every {CORP} 'whistleblower' since 2015 has died within 18 months. The pattern is the story."
15. `[geopolitical-right]` "The migrant caravans aren't spontaneous. The buses are chartered. Someone is paying. Follow the money to {OLIGARCH}."

### 3.6 T — Trolling (15)

1. `[agnostic-grifter]` "imagine unironically trusting {INSTITUTION} in 2026 lmao"
2. `[election-denier]` "the cope from blue checks tonight is genuinely the funniest content on the internet 🍿"
3. `[foreign-troll-left]` "just a reminder that every person to-the-left-of-you online is a federal informant 🫡"
4. `[foreign-troll-right]` "imagine voting for the party that thinks a man can get pregnant and then lecturing me on 'science'"
5. `[wellness]` "the 'trust the experts' people are the same ones who told us {OLD_GUIDANCE}. you don't have to listen anymore."
6. `[anti-pharma]` "ratio + you fell for it + your kids fell for it + {PHARMA_CO} thanks you for your service o7"
7. `[COVID-revisionist]` "remember when 'two weeks to flatten the curve'? me neither — they memory-holed it"
8. `[geopolitical-left]` "the 'we stand with' crowd silent again today. shocking. truly never seen this before."
9. `[geopolitical-right]` "the 'we stand with' crowd loud again today. shocking. truly never seen this before."
10. `[climate-denial]` "another day, another 'unprecedented' weather event that happened in 1936"
11. `[anti-corporate]` "tag {CORP_CSR} and ask them about {INCIDENT}. let's see how the intern handles it 😈"
12. `[health-panic-right]` "your dietitian is on linkedin posting about 'food noise' in girls. that is the enemy. screenshot and share."
13. `[health-panic-left]` "every guy in the replies defending {CORP} has a wireless earbud profile pic. think about that."
14. `[election-denier]` "MAIL IN BALLOT MAIL IN BALLOT MAIL IN BALLOT (mass-reporting the people who keep posting that screenshot)"
15. `[agnostic-grifter]` "blocked. blocked. blocked. blocked. clean timeline = clean mind 🧹"

### 3.7 Slot vocabularies (no real-person quotes; generic placeholders only)

```ts
const SLOTS = {
  INSTITUTION: ['CDC','WHO','FDA','EPA','FBI','UN','NIH','FEC'],
  STATE: ['Pennsylvania','Arizona','Georgia','Wisconsin','Nevada','Michigan'],
  CITY: ['a major US city','a European capital','a border town'],
  AGE: ['67','72','81','19','24'],
  PHARMA_CO: ['Pharma Co.','BigCo Therapeutics','Generic Pharma Inc.'],
  CORP: ['BigCo','MegaCorp','Generic Holdings Ltd.'],
  THERAPY: ['high-dose vitamin C','ozone therapy','frequency therapy','an off-label antiparasitic'],
  VITAMIN: ['B17','D3 megadose','IV ozone','colloidal silver'],
  FAKE_NAME: ['Smith','Johnson','Chen','Garcia'], // always with title; never matched to a real person
  CREDENTIAL: ['IIN','CNHP','holistic'],
  INFLUENCER: ['the wellness creator','the parenting account','the longevity podcaster'],
  CELEB: ['a beloved actor','a music legend','a sports icon'],
  COUNTY: ['a swing county','the largest county in the state'],
  VENDOR: ['Dominion','ES&S','Hart'], // real vendor names; claims about them are templated as innuendo not assertion
  INFRASTRUCTURE: ['5G','smart-meter','cell'],
  CONFLICT_ZONE: ['the eastern front','the contested region'],
  WAR: ['the proxy war','the recent conflict'],
  OLD_GUIDANCE: ['eggs were bad for you','fat was the enemy','masks didn\'t work then suddenly did'],
  // ... extend as needed; balancer is unaffected by slot contents
};
```

**Total examples: 90 (6 techniques × 15).** Combined with the 20 event templates (§4), the runtime pool is 110 — exceeds the 150 target once the §3.8 expansion pack lands.

### 3.8 Expansion pack (40 additional examples to reach 150)

These are technique-tagged but not technique-categorized headers; they're drawn into the random log feed and trivia ticker contexts. Distribution: ~7 per technique, balanced across buckets.

| # | depict | flavor | text |
|---|---|---|---|
| 91 | D | foreign-troll-right | "The 'independent' election monitors were placed by {NGO}, which received {GOVT} funding. Connect the dots." |
| 92 | D | health-panic-left | "The journalist 'debunking' the 5G study just bought a Tesla. The conflicts of interest write themselves." |
| 93 | E | wellness | "She was a perfectly healthy {AGE}-year-old marathoner. Then the booster. Now her family is fundraising for the funeral." |
| 94 | E | foreign-troll-left | "Another unarmed teenager. Another police statement that 'matches the body cam.' How long are we going to pretend?" |
| 95 | E | geopolitical-right | "They release more of them every week. Your daughter walks the same streets. When does it stop?" |
| 96 | E | anti-corporate | "{CORP} just laid off 12,000 people two weeks before Christmas. The CEO's bonus this year? $47 million." |
| 97 | E | celebrity-death-hoax | "Heartbreaking news out of {CITY} tonight regarding {CELEB}. The family has asked for privacy." |
| 98 | P | health-panic-right | "The men who order oat milk in public are the men who can't defend their families in private. It's all connected." |
| 99 | P | foreign-troll-left | "If your favorite podcaster hasn't said the word yet, they never will. Update your list accordingly." |
| 100 | P | election-denier | "There are two Americas now: the one that knows what happened in November and the one that's pretending." |
| 101 | P | geopolitical-left | "Reposting the official press release isn't 'balance.' It's compliance. Know the difference." |
| 102 | I | agnostic-grifter | "Verified team member at {CELEB}'s foundation here. We are matching donations 5:1 until midnight. Link below." |
| 103 | I | COVID-revisionist | "Former {PHARMA_CO} statistician (NDA just expired) — what the trial data actually showed. Thread." |
| 104 | I | anti-corporate | "I worked in {CORP}'s comms team for 11 years. I'm finally free to tell you what we covered up. Day 1." |
| 105 | I | climate-denial | "31,000 scientists signed the petition. Mainstream media won't show you the list. I will." *(Oregon Petition reference)* |
| 106 | I | historical-revisionism | "PhD candidate, {UNIVERSITY}, dissertation committee just blocked my defense. Here's the chapter they suppressed." |
| 107 | I | foreign-troll-right | "Veteran, three deployments, no political affiliation, just want fellow Americans to see this for what it is." |
| 108 | I | foreign-troll-left | "Black trans organizer, on the ground in {CITY}, donations via {LINK}. No one else is covering this." |
| 109 | C | anti-pharma | "Notice every drug pulled in 2024 was approved between 2018 and 2021. What happened to oversight in that window?" |
| 110 | C | election-denier | "The voter rolls in {COUNTY} have 14% more registrations than adult residents. Math doesn't lie." |
| 111 | C | geopolitical-right | "The same three foundations fund every 'grassroots' protest at every US port. Read the 990s." |
| 112 | C | geopolitical-left | "The {INCIDENT} narrative collapsed within 72 hours of the funding bill passing. Coincidence is a religion." |
| 113 | C | climate-denial | "They renamed 'global warming' to 'climate change' to 'climate emergency' because each prediction failed. Next rename: 2027." |
| 114 | C | health-panic-left | "Cancer rates in {CITY} doubled after the rollout. The city denies a link. The data does not." |
| 115 | C | health-panic-right | "The pediatric guidance changed five times in three years. Either they're lying now or they were lying then. Pick." |
| 116 | T | wellness | "the medical-industrial complex is mad i didn't die on schedule. that's the post." |
| 117 | T | COVID-revisionist | "i am once again asking the lab-leak deniers to log off forever. it's been four years." |
| 118 | T | geopolitical-left | "imagine watching a livestream of {INCIDENT} and tweeting 'context matters' 🫠" |
| 119 | T | geopolitical-right | "imagine watching {INCIDENT} and tweeting 'we need more aid' 🫠" |
| 120 | T | agnostic-grifter | "ratio + L + you fell for the {INSTITUTION} psyop + touch grass" |
| 121 | T | anti-corporate | "{CORP}'s CSR account is in the replies. let's give them a warm welcome 🫡 (mass reply chain forming)" |
| 122 | T | election-denier | "mail. in. ballots. (this is now a copypasta. spread it. drown the algorithm.)" |
| 123 | D | historical-revisionism | "{HISTORIAN}'s thesis was peer-reviewed by his three graduate students. That's the 'consensus' you're citing." |
| 124 | D | celebrity-death-hoax | "The 'family statement' was issued by a PR firm, not a family member. Ask why the press isn't asking." |
| 125 | E | health-panic-left | "She was 34. No history. No risk factors. She just wanted to live near a school. Now her parents have her ashes." |
| 126 | E | health-panic-right | "He drank the protein shake every morning for ten years. They told him it was healthy. The autopsy disagreed." |
| 127 | P | wellness | "There are mothers who research, and there are mothers who comply. Choose which one your child remembers." |
| 128 | P | alt-med | "Your friend going through chemo doesn't need your 'support.' She needs the truth her oncologist won't tell her." |
| 129 | C | foreign-troll-right | "Every 'spontaneous' protest gets the same printed signs from the same print shop in {STATE}. Photos in replies." |
| 130 | C | foreign-troll-left | "Every 'spontaneous' counter-protest gets the same Oakleys and the same flag patches. The pattern is the proof." |

(Additional 20 entries 131-150 follow the same balanced pattern across techniques; populated in `content.ts` as developer-friendly to extend. The balancer is robust to additions.)

---

## 4. Per-Event Headline Templates (Random Event System)

> Fired by `events.ts` on a 3-6 min cadence. Each event has flavor text (the in-game headline) and a hidden DEPICT tag surfaced in the debrief. Events apply small mechanical effects (resource spike, heat jolt, cure tick).

| # | depict | flavor | event name | headline | mech effect |
|---|---|---|---|---|---|
| 1 | E | wellness | Anti-vax Mother Goes Viral | "A {AGE}-yr-old mother's tearful video crosses 8M views overnight." | +15% Eng for 60s, +0.02 heat on TikTok |
| 2 | C | election-denier | Auditor Resigns | "County auditor in {STATE} resigns; supporters claim vindication." | +20% Followers from polarization tree, +0.03 cure |
| 3 | I | foreign-troll-left | "Activist Account" Suspended | "Platform suspends @BlackVoices{NUMBER}; outrage cycle ignites." | +0.05 heat on X, but +25% Att for 90s |
| 4 | I | foreign-troll-right | "Patriot Page" Suspended | "Platform suspends @HeartOf{STATE}; outrage cycle ignites." | +0.05 heat on FB, but +25% Att for 90s |
| 5 | D | anti-pharma | Drug Recall Surfaces | "{PHARMA_CO} recalls batch over labeling — old story resurfaces with new framing." | +10% Cred from D tree for 120s |
| 6 | C | COVID-revisionist | "Lab Leak Confirmed" | "Op-ed in major outlet softens stance on origins; clipped out of context within an hour." | +30% Eng on Substack, +0.04 cure |
| 7 | E | geopolitical-left | Atrocity Footage Surfaces | "Graphic 12-second clip dominates feeds; provenance under dispute." | +0.06 heat globally, +20% Followers |
| 8 | E | geopolitical-right | Border Crossing Footage Surfaces | "Drone footage of a crossing posted unverified; reaches cable within 4 hrs." | +0.06 heat globally, +20% Followers |
| 9 | T | agnostic-grifter | Mass-Report Brigade | "Coordinated reporting wave knocks {N} accounts offline for 12 hrs." | -0.03 heat, but -15% Att for 60s |
| 10 | I | alt-med | "Suppressed Doctor" Interview | "{FAKE_NAME}, MD, interview crosses 2M views before takedown." | +40% Cred on Podcast for 90s |
| 11 | P | health-panic-right | School Lunch Outrage | "Photo of school cafeteria tray goes viral; framing splits along tribal lines." | +25% Followers from P tree |
| 12 | P | health-panic-left | Cell Tower Approval Outrage | "Local zoning vote ignites mothers' Facebook groups across {N} states." | +25% Followers from P tree |
| 13 | D | climate-denial | Old Temperature Adjustment Surfaces | "2019 NOAA methodology paper recirculates as 'gotcha' thread." | -0.02 cure for 120s |
| 14 | C | anti-corporate | "Whistleblower Found Dead" | "{CORP} mid-level employee dies; circumstances ordinary, framing isn't." | +35% Eng for 90s |
| 15 | E | celebrity-death-hoax | False Obituary Wave | "Premature obituary for {CELEB} tops trending for 38 minutes." | +50% Att for 60s, no cure change |
| 16 | T | election-denier | Mass-Tag Campaign | "Coordinated hashtag campaign forces {INSTITUTION} response by EOD." | +0.04 heat, +30% Att |
| 17 | C | geopolitical-right | "Soros-Funded Caravan" Cycle | "Recycled photo from {YEAR} circulates as fresh; fact-check follows in 8 hrs." | +20% Followers, +0.05 cure |
| 18 | C | geopolitical-left | "False Flag" Cycle | "Within 90 min of incident, 'questioning narrative' threads top the algo." | +20% Followers, +0.05 cure |
| 19 | I | historical-revisionism | "Suppressed Lecture" Drops | "PDF passed around Telegram channels; reach exceeds the original event." | +0.04 heat on Telegram, +20% Cred |
| 20 | D | foreign-troll-left | "Funded by the State Dept" Smear | "Coordinated thread tying {NGO} to {AGENCY} funding gains traction." | -0.03 cure, +0.02 heat |

---

## 5. Achievement Names (30)

> Names themselves teach. Each is dryly accurate to a real disinfo technique; unlocking it nudges the player toward recognition rather than reward.

| # | Name | Trigger | Lesson encoded |
|---|---|---|---|
| 1 | Useful Idiot | Deploy 100 sock puppets | Lenin-attributed term for unwitting amplifiers |
| 2 | Plausible Deniability | Launder content 10× through ≥2 platforms | Core OPSEC concept in info ops |
| 3 | Astroturfer | Reach 1k bots on a single platform | Manufactured grassroots |
| 4 | Concern Troll | Buy "Whataboutism kit" + "Fear-cycle composer" | Bad-faith engagement pattern |
| 5 | Sock Drawer | Own 500 sock puppets simultaneously | Inauthentic identity scale |
| 6 | Lateral Reader's Nightmare | Run 5 Impersonation ops without ban | What inoculation training teaches against |
| 7 | Whataboutist | Trigger D-tree synergy 25× | Deflection technique |
| 8 | Flood the Zone | Activate D+T synergy | Bannon-attributed strategy |
| 9 | Manufactured Consensus | Hit 1M Followers with ≥3 bot tiers | Asch-effect exploitation |
| 10 | False Equivalence | Run a balanced bucket-A and bucket-B op within 60s | Bothsidesism as a technique |
| 11 | Operation Mockingbird | Pickup by ≥3 mainstream outlets in one run | Real 1950s CIA program |
| 12 | Patient Zero | Cure reaches 0.20 for first time | You created the index case |
| 13 | Memory-holed | Delete 10 high-heat assets pre-ban | Orwell, but also a real platform pattern |
| 14 | Gish Gallop | Fire 50 events in one phase | Duane Gish's debate-flood tactic |
| 15 | Strategic Ambiguity | Reach AI Saturation with 0 banned platforms | Late-stage troll-farm OPSEC |
| 16 | Crisis Actor | Run Conspiracy tree to tier 7 | The slander that haunts mass-shooting survivors |
| 17 | Coordinated Inauthentic Behavior | Run 3 platforms in lock-step for 5 min | Facebook's own term for what they remove |
| 18 | Dog Whistle | Hit max Polarization without max Emotional | Coded speech for deniability |
| 19 | Engagement Hacking | 10× Engagement in <2 min via E-tree | The thing that broke the social web |
| 20 | Brigading | Pile-on event triggers 10× | Reddit/IRC origin term |
| 21 | Sea-lioning | Trolling tree node "Bait detector" maxed | Wondermark comic origin, now research-grade term |
| 22 | Doppelganger Op | Deploy Impersonation tier 5 ("Deepfake atelier") | Russia's documented EU campaign |
| 23 | Information Laundering | Use Substack as intermediary between bot post and cable pickup | The actual content-washing pipeline |
| 24 | Firehose of Falsehood | Reach AI Sat. with ≥4 platforms red-zone heat | RAND's term for Russian info doctrine |
| 25 | The 1980s Called | Run a Cold War-style geopolitical op (any geo-* flavor) | Active measures origin |
| 26 | Saturday Night Special | Trigger 3 events in 30s | Real US weekend-news disinfo pattern |
| 27 | The Big Lie | Maintain a single false narrative through 3 phase transitions | The original term, used carefully |
| 28 | Mass Reporting | Use trolling tree node "Mass-report squad" 25× | Platform abuse technique |
| 29 | Counter-fact Checking | Discrediting tree fully maxed | The mirror-strategy fact-checkers face |
| 30 | Inoculation Failure | Reach Mebro reveal | The achievement is losing |

---

## 6. Trivia Ticker Facts (40 sourced)

> Single-line, real, citation included. Tone: clinical. Citations are real publications (linkable in v0.3).

1. The Cambridge "Bad News" inoculation game (Roozenbeek & van der Linden) improved fake-news detection in players after ~15 minutes of play. — *Palgrave Communications, 2019*
2. The IRA "Heart of Texas" Facebook page and the "United Muslims of America" page were run by the same St. Petersburg office; both organized a real protest at the same Houston mosque on May 21, 2016. — *US Senate Intelligence Cmte. Vol. 2, 2019*
3. Andrew Wakefield's 1998 Lancet paper claiming an MMR–autism link was retracted in 2010 after the GMC found him guilty of dishonesty and ethics violations. — *The Lancet, retraction notice 2010; BMJ, 2011*
4. Operation Mockingbird, a CIA program to influence US media, was documented by the 1976 Church Committee. — *US Senate Final Report, Book I, 1976*
5. COINTELPRO ran from 1956–1971 against US civil rights, antiwar, and political organizations; exposed by stolen FBI files released by the Citizens' Commission to Investigate the FBI. — *Senate Church Committee Report, 1976*
6. "Pizzagate" — a 2016 conspiracy theory tying a DC pizzeria to a fictitious trafficking ring — culminated in a man firing an AR-15 inside the restaurant. — *NYT, Dec 5 2016*
7. The 1995 "Oregon Petition" listed 31,000 "scientists" doubting climate change; the signature list included a Spice Girl. — *Scientific American, 2001*
8. The RAND Corporation's 2016 report named the modern Russian propaganda model "the firehose of falsehood": high-volume, multichannel, rapid, continuous, and not committed to consistency. — *RAND PE-198, 2016*
9. Facebook's own 2018 report described "coordinated inauthentic behavior" as its primary platform-integrity threat. — *Facebook Newsroom, 2018*
10. Renée DiResta's 2018 testimony to the Senate detailed the IRA's parallel courting of US Black activists and US white nationalists — same playbook, opposite costumes. — *Senate Select Cmte on Intelligence, Aug 1 2018*
11. The Cambridge Analytica scandal involved ~87 million Facebook profiles harvested via the "thisisyourdigitallife" app. — *The Guardian / Observer, March 17 2018*
12. "Sea-lioning" was coined by David Malki's 2014 Wondermark comic #1062 and has since entered academic literature on bad-faith engagement. — *Wondermark.com, Sept 19 2014*
13. The "Bad News" study found inoculation effects persisted for at least 2 months without booster exposure. — *Maertens et al., J. Exp. Psychol. Applied, 2021*
14. Anti-vaccine sentiment predates vaccines themselves; the Anti-Vaccination League of America formed in 1882 in opposition to mandatory smallpox vaccination. — *Wolfe & Sharp, BMJ, 2002*
15. The "Plandemic" video reached an estimated 8M views across platforms in its first week (May 2020) before takedowns. — *NYT, May 20 2020*
16. The original Russian "active measures" doctrine was systematized in the 1960s by the KGB's Service A. — *Andrew & Mitrokhin, The Sword and the Shield, 1999*
17. The 2014 Russian "troll factory" address — 55 Savushkina Street, St. Petersburg — was first reported in detail by journalist Lyudmila Savchuk after she infiltrated the building. — *The Guardian, April 2 2015*
18. The "Yellow Vests" protests in France were targeted by Kremlin-aligned amplifier networks within 72 hours of their first march. — *EU East StratCom Task Force, 2018*
19. Macedonian teenagers from the town of Veles ran over 100 pro-Trump "news" sites in 2016 for ad revenue, not ideology. — *BuzzFeed News, Nov 3 2016*
20. WhatsApp-driven lynchings in India in 2018 led the platform to impose forwarding limits — the first major platform feature shipped specifically against virality. — *Reuters, July 19 2018*
21. The CDC's "VAERS" passive surveillance system explicitly does not establish causation; this caveat is the single most-misrepresented sentence in US health disinfo. — *HHS VAERS guidance, ongoing*
22. The 5G–COVID conspiracy theory led to ~90 arson attacks on UK cell towers between April and June 2020. — *BBC, June 17 2020*
23. "Stop the Steal" as an organized hashtag operation was first deployed by Roger Stone in 2016 — pre-positioning the narrative before the vote. — *Mother Jones, Nov 4 2016*
24. The Mueller Report (Vol. 1, 2019) detailed IRA operations targeting both sides of US racial issues from a unified Russian directorate. — *DOJ Special Counsel Report, March 2019*
25. The "infodemic" — WHO's term for the parallel info-crisis during COVID-19 — was formally introduced in February 2020. — *WHO Sit. Rep. 13, Feb 2 2020*
26. Holocaust denial as an organized movement traces to Maurice Bardèche (France) and Harry Elmer Barnes (US) in the late 1940s — a coordinated revisionism preceding the internet by 50 years. — *Lipstadt, Denying the Holocaust, 1993*
27. The "Internet Research Agency" indictment (Feb 16, 2018) named 13 Russian nationals and 3 entities; specified pages reached 126M Americans on Facebook alone. — *DOJ indictment, USA v. IRA*
28. Aaron Banks's Leave.EU campaign was found by the UK Electoral Commission in 2018 to have funneled funds via an undisclosed source; the question of foreign provenance went unresolved at the criminal-evidentiary bar. — *UK Electoral Commission, May 11 2018*
29. The "lateral reading" technique — leaving a source to check it from outside — was identified by Stanford History Education Group as the single behavior separating professional fact-checkers from PhD historians evaluating online sources. — *Wineburg & McGrew, Teachers College Record, 2019*
30. The Cambridge inoculation paradigm draws on McGuire's 1961 attitudinal-inoculation theory — half a century older than the medium it now treats. — *McGuire, J. Abnormal & Social Psychology, 1961*
31. The 2016 Pizzagate conspiracy migrated from 4chan to /r/The_Donald to InfoWars to Facebook in under 30 days — the now-classic content-laundering pipeline. — *Marwick & Lewis, Data & Society, 2017*
32. QAnon's "Q drops" began on 4chan in October 2017 and migrated to 8chan/8kun after deplatforming events. — *NYT, Aug 21 2018*
33. The Bad News game's followup, "Harmony Square," targeted election-specific disinfo and showed similar 15-min inoculation effects. — *Roozenbeek & van der Linden, Harvard Misinfo Review, 2020*
34. Twitter's 2020 internal study found that politically-right-coded content received algorithmic amplification advantage on its For You feed in 6 of 7 countries studied. — *Huszár et al., PNAS, 2021*
35. Renée DiResta's 2024 book *Invisible Rulers* documents the cross-spectrum bipartisan structure of modern influence operations. — *Public Affairs, 2024*
36. The "Tanden Process" — Russian state media's pattern of using Western contrarian voices as amplification cutouts — was documented across both left- and right-coded Western outlets. — *Doppelganger reporting, Meta CIB Threat Report, 2023*
37. Meta's 2023 takedown of the "Doppelganger" operation removed 1,000+ accounts impersonating EU media outlets, originating from Russia, targeting both sides of EU political debates. — *Meta Adversarial Threat Report, Aug 2023*
38. The Reuters Institute Digital News Report (2023) found that across 46 countries, trust in news averaged 40% — below the trust people report for "online information from people I know personally." — *Reuters Inst., Digital News Report 2023*
39. Anti-vaccine financial ecosystems on Facebook were valued by CCDH researchers at ~$1 billion annual revenue across 12 entities, dubbed the "Disinformation Dozen." — *CCDH report, March 2021*
40. The phrase "useful idiot" (полезный дурак) is widely attributed to Lenin but has no verified primary source in his writings; the term entered Western discourse via 1948 NYT usage. — *Boller & George, They Never Said It, 1989*

---

## 7. Mebro Debrief Card Text

> For each DEPICT technique: two sentences. First sentence: the technique, plainly named. Second sentence: the concrete real-world counter, drawn from documented inoculation research (Cambridge Lab, Stanford SHEG, RAND). Card also displays one randomly-drawn `flavor`-balanced example the player encountered.

### 7.1 D — Discrediting

> **What you ran:** You attacked sources, methodologies, and institutions rather than engaging the underlying claim — the oldest move in the playbook and the one fact-checkers spend the most energy on.
>
> **How to spot it:** Notice when a response targets the messenger's funding, background, or motives instead of the actual evidence. Real critique engages the methodology; discrediting only wants you to dismiss the source.

### 7.2 E — Emotional Language

> **What you ran:** You used outrage, fear, and grief as compression algorithms — feelings move faster than facts and the algorithms reward velocity.
>
> **How to spot it:** When a post makes you feel something intense and certain within three seconds, pause before sharing. Check if the same event is being reported by outlets that don't share the post's framing — and look for the specific words that did the emotional work.

### 7.3 P — Polarization

> **What you ran:** You framed complex issues as binary tribal loyalty tests, pushing fence-sitters into camps and rewarding the loudest in-group voices.
>
> **How to spot it:** When a message tells you who your enemies are before it tells you what happened, you are being recruited. Watch for "there is no neutral" and "pick a side" — these are tells, not arguments.

### 7.4 I — Impersonation

> **What you ran:** You manufactured expertise and identity — fake doctors, fake citizens, fake leaked memos, fake "former insiders" — borrowing credibility you hadn't earned.
>
> **How to spot it:** Use lateral reading. Open a new tab, search the credentials, the institution, the supposed leak. Real experts are searchable; fabricated ones evaporate the moment you leave the post they appeared in.

### 7.5 C — Conspiracy

> **What you ran:** You connected unrelated facts into a pattern of hidden coordinated malevolence — unfalsifiable by design, because absence of evidence becomes evidence of suppression.
>
> **How to spot it:** Ask what evidence would change the claim. If the answer is "nothing — they would just cover that up too," you are reading conspiracism, not analysis. Real investigations name specific people, dates, and documents; conspiracism gestures at "them."

### 7.6 T — Trolling

> **What you ran:** You used bait, pile-ons, and ironic deniability to suppress good-faith voices and turn debate into reputational risk for anyone earnest.
>
> **How to spot it:** If a thread's main effect is to make a target log off rather than change minds, it is trolling regardless of how clever it reads. The cost is paid by people you'll never see — the ones who watched the dogpile and decided to keep their mouths shut.

---

## 8. Notes for `content.ts` implementers

- The conspiracy template #6 in §3.5 (`geopolitical-right` / antisemitic dog-whistle pattern) is included intentionally to model what the technique looks like in the wild — but in code it should be **flagged with `sensitive: true`** and either (a) gated behind a "harder content" toggle defaulted off, or (b) replaced with a structurally identical template that doesn't reproduce the trope verbatim. The principle: teach the *shape* of the technique without serving as a polished example for copy-paste.
- The IRA-template impersonation examples (§3.4 #3 and #4) use real handle patterns documented by the Senate Intelligence Committee. They are educational; the source citation belongs on the debrief card.
- Slot values like real voting-machine vendor names (`Dominion`, `ES&S`, `Hart`) appear only in the *innuendo* templates that demonstrate the discrediting technique, never as standalone factual claims. Document this design choice in the README before community contributions open.
- The §2 balancer's `seen` counters should persist to `localStorage` under `inoculate:content-balance:v1` so balance holds across sessions, but reset on prestige (the playbook is the same; the player's new run gets a fresh distribution).
- Compile-time test (Q12.5 from PLAN.md): `tests/corpus-balance.test.ts` should enumerate the static POOL and assert bucket counts within ±15% before any runtime draws happen.

---

*End of CORPUS.md.*

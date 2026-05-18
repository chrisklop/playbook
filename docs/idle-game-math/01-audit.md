# 01 — Audit: Playbook Economy vs. Synthesized Principles

Audit pass against [00-principles.md](./00-principles.md). Findings are diagnostic — the original audit pass introduced **no code changes**. Subsequent fix passes are tracked in the per-finding status tags below.

## Status legend

- 🟢 **Addressed** — code change merged. Date + commit reference in the finding body.
- 🟡 **Partially addressed** — some sub-points fixed; remaining noted.
- 🔴 **Open** — not yet touched.

| Finding | Severity | Status |
|---|---|---|
| 1 — Asset growth rates below 1.07–1.15 band | Critical | 🟢 Addressed (push 1) |
| 2 — Tier-2 growth 1.16 above band | Medium | 🟢 Addressed (push 1) |
| 3 — Six DEPICT trees stack on attention | Critical | 🟢 Addressed (push 1) |
| 4 — No generator-overtake / milestone math | High | 🟢 Addressed (push 3) |
| 5 — Paradigm cap growth tight against new cost growth | Medium | 🟢 Addressed (push 1) |
| 6 — Prestige formula yields too many points | Critical | 🟢 Addressed (push 2) |
| 7 — Native JS Number throughout | High (timed) | 🔴 Open (deferred to v0.2 / pre-AI-Sat) |
| 8 — Legacy multiplier cap reached too soon | Critical | 🟢 Addressed (push 2) |
| 9 — Legacy applied to all resources blanket-style | Low | 🔴 Open |
| 10 — Unbounded multiplier stacks | High | 🟢 Addressed (push 4) |
| 11 — Auto-Poster bonus unbounded | Medium | 🔴 Open |
| 12 — Phase gates inconsistent with production scales | Medium | 🔴 Open |
| 13 — DEPICT per-level mult differential lacks rationale | Medium | 🟡 Addressed via redistribution in push 1 |

---

For source quotes / derivations, see `sources/`.

---

## Constants table — every economy knob, in one place

### Assets (from `src/game/core/catalog.ts:76-294`)

| ID | era | kind | baseCost | costGrowth | costResource | produces | resource |
|---|---|---|---|---|---|---|---|
| sockPuppet           | grassroots | bot   | 50    | **1.04** | attention  | 2     | attention  |
| anonymousBlogger     | grassroots | human | 800   | **1.06** | attention  | 6     | attention  |
| autoPoster           | grassroots | bot   | 2500  | **1.10** | attention  | —     | (post-yield bonus) |
| outlet               | grassroots | bot   | 300   | **1.035**| attention  | —     | attention cap |
| substacker           | blog       | human | 2500  | **1.07** | attention  | 0.8   | engagement |
| doppelganger         | blog       | bot   | 1800  | **1.06** | attention  | 1.5   | engagement |
| newsletter           | blog       | bot   | 1500  | **1.05** | attention  | —     | engagement cap |
| wellnessInfluencer   | social     | human | 10K   | **1.07** | engagement | 0.5   | followers  |
| manospherePodcaster  | social     | human | 15K   | **1.08** | engagement | 0.8   | followers  |
| spamouflage          | social     | bot   | 8000  | **1.06** | engagement | 1.2   | followers  |
| audiencePod          | social     | bot   | 6000  | **1.05** | engagement | —     | followers cap |

### DEPICT Tier-1 upgrades (`catalog.ts:306-456`)

| Tree              | baseCost | growth | maxLevel | per-level mult | maxed bonus |
|---|---|---|---|---|---|
| emotional-1       | 2500     | **1.12** | 30 | attention +0.020 | +60% att |
| polarization-1    | 7000     | **1.12** | 30 | attention +0.015 | +45% att |
| trolling-1        | 20K      | **1.12** | 30 | attention +0.012 | +36% att |
| conspiracy-1      | 50K      | **1.12** | 30 | attention +0.010 | +30% att |
| discrediting-1    | 120K     | **1.12** | 30 | attention +0.010 | +30% att |
| impersonation-1   | 300K     | **1.12** | 30 | attention +0.008 | +24% att |

### DEPICT Tier-2 (`catalog.ts:462-521`)

All six tier-2s share **growth 1.16**, maxLevel 30, base costs 9K–25K **engagement**, multipliers stacking 0.015–0.025 per level across attention/engagement/credibility.

### Projects (`catalog.ts:530-613`)

| ID | era | cost | effect |
|---|---|---|---|
| first-viral-moment   | grassroots | 200 attention | flag → ×2 attention permanent |
| viral-cascade        | grassroots | 50K attention | 5 min ×5 attention event |
| editorial-calendar   | grassroots | 10K attention | paradigm flip + engagement cap 5000 |
| cpc-network          | blog       | 2M attention + 500K engagement | ×3 engagement cap + 1.5× engagement output + 2% cure |

### Caps (`production.ts:79-113`)

- **Pre-paradigm attention cap:** $5000 + 600 \times outlets$ (linear)
- **Post-paradigm attention cap (Edcal):** $5000 + 600 \times \frac{1.06^{outlets} - 1}{0.06}$ (geometric, base 600, growth **1.06**)
- **Engagement cap:** pre-Edcal 1000; post-Edcal $5000 + 600 \times newsletters$; ×3 if `cpcNetwork`
- **Followers cap:** $5000 + 6000 \times audiencePod$ (post-Social entry only)
- **Credibility / NarDom / SR:** all stuck at 0 — never set

### Phase gates (`actions.ts:101-133`)

| Transition | Requirement |
|---|---|
| Grassroots → Blog        | 500K attention + Editorial Calendar |
| Blog → Social            | 500K engagement |
| Social → Influencer      | 100K followers |
| Influencer → Cable       | 1M credibility |
| Cable → AI Saturation    | 10M narrativeDominance |

### Prestige (`legacy.ts:51-62`)

$$\text{gain} = \lfloor \sqrt{c_{peak,att}/5000} + \sqrt{c_{peak,eng}/50000} \rfloor$$

$$\text{legacyMultiplier}(p) = \min(3,\ 1 + 0.04p)$$

So: sqrt on **peak** of attention + sqrt on **peak** of engagement, summed. Each point = +4% production, capped at +200% (50 points).

### Number representation

Every numeric field is native JS `number`. Confirmed by `src/game/types.ts:101-119` (`Record<ResourceId, number>`, `caps: Record<ResourceId, number>`, etc.) and all arithmetic in `production.ts` / `posting.ts` / `legacy.ts` using `+`, `-`, `*`, `Math.pow`, `Math.sqrt`.

---

## Findings

### Finding 1 — Asset growth rates are below the consensus 1.07–1.15 band

**Location:** `catalog.ts:83, 107, 157, 234, 274, 288`
**Current:** sockPuppet **1.04**, blogger **1.06**, outlet **1.035**, doppelganger **1.06**, spamouflage **1.06**, audiencePod **1.05**, newsletter **1.05**
**Principle violated:** §1.2 — "Acceptable growth-rate band: 1.07–1.15. Below 1.07 = no scarcity."
**Predicted symptom:** What the player is reporting. Each new buy is *cheap relative to the previous*, the cost-vs-income gap stays flat (§3.1), there's no scarcity tension, and the player feels like they're "buying random stuff" without strategic weight. The reason a Cookie-Clicker-style game has a sense of pacing is that the next building always feels *just barely* affordable; here the next sock puppet at growth 1.04 costs only 4% more than the previous, so once any income is established, the buy is trivial.
**Proposed fix:** Bring all assets into 1.07–1.15. Specifically:
- sockPuppet: 1.04 → **1.08** (still gentlest, the starter, lots of units)
- anonymousBlogger: 1.06 → **1.10**
- outlet: 1.035 → **1.07** *(see Finding 5: this also requires retuning the cap formula)*
- substacker: 1.07 → keep
- doppelganger: 1.06 → **1.09**
- newsletter: 1.05 → **1.08**
- wellnessInfluencer / manospherePodcaster / spamouflage / audiencePod: bring to 1.08–1.10 range

### Finding 2 — DEPICT tier-1 growth at 1.12 is fine; tier-2 at 1.16 is borderline

**Location:** `catalog.ts:318, 342, 366, 390, 414, 438` (tier-1, all 1.12); `catalog.ts:466, 476, 486, 496, 506, 516` (tier-2, all 1.16)
**Current:** tier-1 all 1.12; tier-2 all 1.16
**Principle:** §1.2 — 1.12 is solidly inside 1.07–1.15; **1.16 is just above the band.**
**Predicted symptom:** Tier-2 upgrades feel like a wall — each level past 5–10 gets expensive faster than feels right. Player tends to buy a few and stop.
**Proposed fix:** Tier-2 growth 1.16 → **1.14**. Keeps the late-game stiffness without breaching the band.

### Finding 3 — Six DEPICT trees all stack multiplicatively on the same resource (attention), making cost growth necessary higher than principles suggest

**Location:** `production.ts:21-30` — `mult[r] *= 1 + (perLevel as number) * level` inside a loop over all upgrades.
**Current:** Six tier-1 trees each give an additive-on-base multiplier to attention. Multiplied together, at maxed levels the stack is 1.60 × 1.45 × 1.36 × 1.30 × 1.30 × 1.24 ≈ **7.6× attention production** from DEPICT alone. Then patron buffs, achievements, legacy, viral moment, and viral cascade all multiply onto that.
**Principle violated:** §2.4 — generators should have **per-tier** multipliers, not six independent trees all multiplying the same resource. The Pecorella design intent is one multiplier per generator-tier, gated behind milestones. Stacking six on one resource leads to runaway compounding that the cost curve must compensate for — and the asset cost growth has been DROPPED to compensate, causing Finding 1.
**Predicted symptom:** A cycle: production multipliers compound, costs get tuned down to keep buys affordable, then numbers explode (Finding 7), then growth gets tuned up, then production gets nerfed, etc. The two systems fight each other.
**Proposed fix:**
- Give each DEPICT tree a **target resource** (E,P → attention; D,T → defensive/heat; I → credibility; C → engagement) instead of all six → attention.
- Cap the global product of multipliers (e.g. `min(stackedMult, 50)`) for safety.
- Reduce per-level multiplier magnitudes (current 0.008–0.020 per level for max +24–60%; bring all to 0.005–0.010 = max +15–30% per tree).

### Finding 4 — Production is purely linear in count and ignores generator-overtake math

**Location:** `production.ts:123-130`
**Current:** `rates[r] += perTickPerUnit * count` — pure linear-in-count, no milestone multipliers, no tier-overtake mechanism.
**Principle violated:** §2.4 — Part II of Pecorella explicitly addresses "as you gain more tiers, lower tiers become irrelevant — fix this with milestones or purchased/owned splits or tier-boost percentages." The Playbook has **none** of those.
**Predicted symptom:** Once a higher-tier asset is affordable, the lower tier becomes decorative. With sock puppets at 2 attention/s and bloggers at 6 attention/s for ~16× the cost, you reach a point where you only ever want bloggers. No reason to ever buy a 100th sock puppet.
**Proposed fix:** Add milestone multipliers: at owned counts of 25, 50, 100, 250, 500, 1000 of any asset → permanent +50% or +100% to that asset's production. The achievement system already has the scaffolding (file `achievements.ts`); these milestones could either be folded in there or live as a parallel "milestones" table.

### Finding 5 — Editorial Calendar paradigm cap growth (1.06) barely beats outlet cost growth (1.035); pre-paradigm cap (linear) is fundamentally fragile

**Location:** `production.ts:84-101`
**Current pre-paradigm:** $cap_{att} = 5000 + 600 \times outlets$ (linear)
**Current post-paradigm:** $cap_{att} = 5000 + 600 \times \frac{1.06^N - 1}{0.06}$
**Outlet cost growth:** 1.035
**Principle violated:** §1.5 — "cap growth must outpace cost growth." Pre-paradigm violates this: outlet cost grows 3.5%/unit, cap contribution stays flat at 600. Eventually outlet N costs more than 600 extra cap can buy. The fix is to never let pre-paradigm last too long; Editorial Calendar's 10K attention threshold is the safety valve.
**Predicted symptom:** The user already hit "135B cap" feedback — earlier paradigm was 1.16 and exploded. Now at 1.06 it's fine, but **if Finding 1 raises outlet cost growth to 1.07, the paradigm cap growth 1.06 becomes too slow** (1.06 < 1.07). The whole cap formula is delicately calibrated to the current (too-low) outlet growth.
**Proposed fix:**
- If outlet costGrowth raised to 1.07: paradigm cap growth → **1.10** (still below the runaway range of 1.16 but comfortably above cost). Restore base from 600 → 500 to compensate.
- If outlet growth stays at 1.035: current 1.06 paradigm is fine — but then Finding 1 isn't resolved.

### Finding 6 — Prestige formula uses **peak** resources, but `sqrt` divisor pivot is far too low for the (already-aggressive) production scale

**Location:** `legacy.ts:51-57`
**Current:** $\text{gain} = \lfloor \sqrt{c_{peak,att}/5000} + \sqrt{c_{peak,eng}/50000} \rfloor$
**Principle:** §5.1 — peak-based is a valid choice (Realm Grinder uses max-of-run). §5.4 — pivot constants should give ~30–60 min to first prestige and ~hours for 100× as much.
**Predicted symptom:** With production stacking 7.6× from DEPICT (Finding 3), legacy +200% from cumulative prestige, and ×5 viral cascades, peak attention reaches 10M+ pretty fast. $\sqrt{10^7/5000} = \sqrt{2000} \approx 44.7$ prestige points from attention alone. Each prestige point is +4% production. 44 points = +176%. Combined with engagement contribution, **first prestige can easily yield 50+ points → +200% production cap immediately reached**, meaning legacy is fully maxed by the second run and prestige stops doing anything mathematically.
**Proposed fix:**
- Pivot raises: attention divisor 5K → **1M**, engagement divisor 50K → **1M**. Now $\sqrt{10^7/10^6} ≈ 3$ points from a 10M-attention run, $\sqrt{10^9/10^6} ≈ 32$ from a 1B run.
- Or switch from sqrt → cbrt (Cookie Clicker style): each doubling of prestige requires 8× more, not 4×. Slower curve.
- The +4%/point cap of 50 points = +200% is fine, but should be reachable only after dozens of prestiges, not one or two.

### Finding 7 — Native JS `Number` everywhere; will break under stacked multipliers + paradigm cap once player reaches Cable era

**Location:** `types.ts:101-119` — all resources/caps typed `number`. All production / cap formulas use raw arithmetic on numbers.
**Current behavior:** Today at user's "135B" cap (the bug we just fixed) — that's already $1.35 \times 10^{11}$, well within `Number` range. But:
- Post-paradigm cap is $\approx 600 \times \frac{1.06^N}{0.06}$. At $N = 200$ outlets: $10^4 \times 1.06^{200} \approx 10^4 \times 10^{5.06} \approx 10^9$. At $N = 500$: $\approx 10^{17}$. **Above the safe integer boundary at $N \approx 400$.**
- Production stacks (DEPICT × patron × legacy × event × viral) at maxed values multiply to $\sim 100 \times$. Combined with raw asset count in the thousands, attention/sec can reach $10^7$. Over many ticks that crosses $10^{15}$ then $10^{30}$ once Followers / Credibility / NarDom / SR come online with their own scales.
- Cable era requires **10M narrativeDominance**; once we add that resource's production curve, NarDom is the next-after-Followers which is the next-after-Engagement (~$10^6$ pivot per resource). By Cable era resources will be in the $10^{18}$+ range.
**Principle violated:** §6.1, §6.2 — Number boundary at $9 \times 10^{15}$ for exact integers and $1.8 \times 10^{308}$ for hard ceiling. Multi-layer stacking compounds fast.
**Predicted symptom:**
- Early-Cable: counts of small things (e.g. total posts made, sock-puppet count, achievement progress) start skipping consecutive integers around $10^{15}$. Subtle bugs in achievement triggers.
- Mid-AI-Saturation or beyond: a single late-game multiplier stack overflows to `Infinity`; production rate becomes `NaN`; the game silently freezes.
- Post-prestige resets compound this: each run's peak feeds prestige squared back into legacy mult, then resets and re-grows.
**Proposed fix:**
- **For v0.1 (pre-AI-Saturation):** acceptable to stay on `Number`, but add a sanity clamp: `if (!Number.isFinite(x) || x > 1e300) clamp/log`. Add a unit test that runs the sim to AI Saturation peak and asserts no `Infinity`.
- **For v0.2 (Mebro reveal lands; full AI Saturation era playable):** switch resources, caps, and prestige math to `break_infinity.js`. The migration is non-trivial but Patashu's "drop-in" claim is reasonable for our shape. Plan it as a single push, behind a feature flag.
- See §6.3 — "if you switch, switch the whole resource family." Don't half-migrate.

### Finding 8 — Prestige multiplier reaches its +200% cap too soon

**Location:** `legacy.ts:60-62` — `Math.min(3, 1 + 0.04 * points)`
**Current:** +4% per point, capped at 3× (+200%) → 50 points to cap.
**Principle violated:** §5.4 — "the 100th prestige is reachable in ~hours of a maxed run." Here, given Finding 6's prediction that first prestige can yield 40+ points, the cap is reached in 1–2 prestiges and prestige stops mattering.
**Predicted symptom:** Player notices "prestige does nothing after 2 resets." All meta-progression dies on run 3.
**Proposed fix:**
- Lower per-point %: 0.04 → **0.02** (each prestige point = +2%, cap reached at 100 points).
- Combined with Finding 6 (raise pivot), 100 points becomes a genuine multi-day goal.
- Alternative: drop the cap entirely and use a sqrt or log curve: `legacyMultiplier(p) = 1 + Math.sqrt(p) * 0.20` — first point gives +20%, 100 gives +200%, 10000 gives +2000%. Diminishing returns instead of a hard cap.

### Finding 9 — `legacyMultiplier` is applied to every resource including pre-Cable resources (Followers/Credibility/etc.) before those resources are even unlocked

**Location:** `production.ts:60-67`
**Current:** Iterates all `RESOURCE_IDS` applying legacy multiplier.
**Principle:** §2.4-ish — meta-progression should be applied where it makes sense, not blanket-multiply resources the player can't yet produce.
**Predicted symptom:** Not a bug per se since unreachable resources have rate 0 and `0 × N = 0`. But the *intent* shape of legacy is "your peak in resource X earns you X's multiplier" — currently the same +N% applies to everything. That blurs the player's understanding of what legacy is doing.
**Proposed fix:** Either apply legacy only to attention/engagement (the always-active resources), or scope each legacy point to a chosen resource at prestige time. Lower priority than the others.

### Finding 10 — Multipliers compound without a tracked stack ceiling; First Viral Moment ×2 + Viral Cascade ×5 + DEPICT 7.6× + Patrons ×N + Legacy ×3 + Event ×1.6 stack to ~360× on a single resource

**Location:** `production.ts:21-77` — every multiplier source multiplies sequentially with no audit / no cap.
**Principle:** §2.1, §2.2 — multipliers are fine but should be either bounded or paced. Real games (AdVenture Capitalist's "Megabucks", Cookie Clicker's "buildings * achievements * upgrades") track these in a single ordered chain so they can be inspected and capped.
**Predicted symptom:** Game becomes unbalanced post-Edcal: production spikes 100×+ when all multipliers are active, making the cap-vs-income gap collapse and rendering the asymptotic plateau (the prestige trigger, §3.3) unreachable in a predictable way.
**Proposed fix:**
- Introduce a `MultiplierStack` data structure that records every source applied to each resource (source name + factor). Display in a debug panel.
- Cap the total stacked multiplier per resource at some sane ceiling (~100×, give or take) for early-mid game; let it unbound in late phases.
- Bench-test by simulating "all multipliers active at max" and printing the per-resource stack composition.

### Finding 11 — Auto-Poster post-yield bonus is additive over base, but compounds with the base multiplier — likely unintended interaction

**Location:** `posting.ts:50` — `const autoBonus = 1 + 0.1 * (state.assets.autoPoster ?? 0);`
**Current:** Each Auto-Poster owned adds +10% post yield, multiplied directly onto the post output formula.
**Principle:** Per-generator multipliers are fine. But this is unbounded — owning 100 Auto-Posters = +1000% post yield, plus the base post yield already includes platform amp + bot count + DEPICT. Stack on top of multipliers.
**Predicted symptom:** Once player buys >100 Auto-Posters (which is cheap at growth 1.10 from base 2500), post yields dwarf passive production. Game becomes "click the platform card constantly, ignore everything else."
**Proposed fix:** Either cap the Auto-Poster bonus at e.g. +200%, or make it a *sub-linear* curve like `1 + Math.sqrt(count) * 0.1` so the 100th Auto-Poster gives +1% not +10%.

### Finding 12 — Phase gates use raw resource thresholds; they're not consistent with the production scales those thresholds imply

**Location:** `actions.ts:101-133`
**Current thresholds:** Blog 500K att; Social 500K eng; Influencer 100K fol; Cable 1M cred; AI Sat 10M NarDom.
**Principle:** §3.3 — the asymptotic plateau is the prestige trigger; phase gates should sit at or near it.
**Predicted symptom:** With current production scales:
- 500K attention reachable in ~5-15 min with bulk-buy. Blog gate fires fast.
- 500K engagement requires Blog-era production which is currently slow (substacker 0.8/sec × ~100 substackers = 80/sec → ~100 min for 500K). Big difference from Blog gate's 5-15 min.
- 100K followers requires Social-era assets producing followers. Followers production currently 0.5-1.2/sec per asset. Even with 1000 of each, ~250/sec. 100K / 250 ≈ 400 sec = ~7 min. Social → Influencer is way too fast.
- 1M cred and 10M NarDom are basically pulled out of the air — nothing currently produces them.
**Proposed fix:** Either define them as functions of expected peak (e.g. Phase N's gate = 5% of expected peak at Phase N's max-run-end) or back-compute from a target playthrough time (1 hr Grassroots, 1 hr Blog, 2 hr Social, 2 hr Influencer, 1.5 hr Cable, 1 hr AI Sat ≈ 8.5 hr per run before optimization). Until you have credibility / NarDom / SR producers wired in, those phase gates are vestigial.

### Finding 13 — DEPICT per-level multipliers are inconsistent across tiers in a way that has no design rationale documented

**Location:** `catalog.ts:319, 343, 367, 391, 415, 439` (tier-1) and `catalog.ts:467, 477, 487, 497, 507, 517` (tier-2)
**Current tier-1 per-level multipliers:**
- Emotional: 0.020 → +60% at max
- Polarization: 0.015 → +45%
- Trolling: 0.012 → +36%
- Conspiracy: 0.010 → +30%
- Discrediting: 0.010 → +30%
- Impersonation: 0.008 → +24%

**Tier-2 per-level:** 0.015–0.025
**Principle:** Not strictly a principle violation, but per-tree differential should follow some rule (e.g. "earlier-revealing trees are stronger because you'll have them longer" or vice versa). Currently the ordering tracks reveal-order with no obvious gameplay rationale.
**Predicted symptom:** Min-maxers will figure out that buying tier-1 emotional then ignoring the rest is mathematically dominant. Lower multipliers on later trees + same maxLevel = strict ordering of value.
**Proposed fix:** Either:
- Differentiate by **target resource** (Finding 3): emotional/polarization → attention, trolling/conspiracy → engagement, etc. Then per-tree multipliers can be uniform within their target.
- Or invert: later-revealing trees should have *higher* per-level mults to compensate for fewer levels-of-the-run.

---

## Summary by severity

### Critical (player-facing pacing problems already observable)
- **Finding 1:** Asset growth rates below 1.07 — the "buying random stuff with no scarcity" complaint.
- **Finding 3:** Six DEPICT trees stacking on attention — root cause of the cost-vs-production tug-of-war.
- **Finding 6 + 8:** Prestige formula gives too many points, multiplier caps too quickly — prestige dies on run 2.

### High (silent bugs that will surface during play)
- **Finding 7:** Native Number; will overflow in Cable era. Must be fixed before AI Saturation phase ships.
- **Finding 4:** No generator-overtake/milestone mechanism — lower tiers will become decorative.
- **Finding 10:** Unbounded multiplier stacks compound.

### Medium (sub-optimal but not blocking)
- **Finding 2:** Tier-2 growth 1.16 slightly above band.
- **Finding 5:** Cap formula calibration is tight; will need joint retuning with Finding 1.
- **Finding 11:** Auto-Poster bonus unbounded.
- **Finding 12:** Phase gates inconsistent with production scales.
- **Finding 13:** DEPICT per-level mult differential lacks rationale.

### Low (cosmetic / design clarification)
- **Finding 9:** Legacy applied to all resources blanket-style.

---

## Suggested order of operations (when you're ready)

1. **First:** Findings 1 + 3 + 5 together. They're coupled — asset costs, DEPICT stacking, and cap growth all interact. Fix them as a single push and re-sim.
2. **Then:** Findings 6 + 8 — prestige rebalance. Test by simulating a 10-run progression.
3. **Then:** Finding 4 — milestones / generator overtake. Brings strategic depth back.
4. **Then:** Finding 10 — multiplier-stack inspection + cap. Defense against future explosion.
5. **Before AI Saturation ships:** Finding 7 — break_infinity.js migration.
6. **Polish:** Findings 2, 11, 12, 13, 9 — incremental tuning.

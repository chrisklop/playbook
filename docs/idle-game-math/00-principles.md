# 00 — Synthesized Idle-Game Math Principles

A cross-source consensus checklist. Every rule below is supported by at least two of the sources in `sources/`. Use as a yardstick when evaluating any economy decision.

For derivations / original quotes, see the per-source files.

---

## 1. Cost-curve rules

### 1.1 Canonical formula
$$cost(n) = base \times growth^n$$

where $n$ is the number already owned and $growth > 1$.

### 1.2 Acceptable growth-rate band: **1.07 – 1.15**

| Use | Growth rate |
|---|---|
| Low end of normal | 1.07 (Clicker Heroes default; AdVenture Capitalist Lemonade Stand) |
| Mid-range default | 1.10 – 1.12 |
| High end of normal | 1.15 (Cookie Clicker default) |
| **Outside this band** | Need an explicit design reason. Below 1.07 = no scarcity; above 1.15 = wall too early. |
| Pedagogical | Steam Monsters 2.5 is cited as an outlier |

### 1.3 Per-tier base-cost ratio: ~5× previous tier
A new tier of generator typically has a base cost roughly 5× the previous tier's base cost. This is the Cookie Clicker rule of thumb; Pecorella uses it as the default tier spacing.

### 1.4 Closed-form bulk-buy cost
$$cost(buy~n~from~level~k) = base \times \frac{growth^k (growth^n - 1)}{growth - 1}$$

(Pecorella Part I; geometric series.) Required for bulk-buy buttons; do NOT loop the per-unit formula at runtime in a hot path.

### 1.5 Storage-cap growth must outpace cost growth
If a storage building has cost growth $g_c$ and contributes $\Delta$ cap per unit, then either:
- **Linear-cap mode:** $\Delta \geq base \times (g_c - 1)$ at the relevant level range, OR
- **Geometric-cap mode (paradigm shift):** cap growth rate $g_{cap}$ satisfies $g_{cap} > g_c$.

Otherwise the player hits the wall described in [Cookie Clicker dev posts] and the sibling project's PLAN.md Invariant 1.

---

## 2. Production-curve rules

### 2.1 Canonical formula
$$production(n) = base\_rate \times n \times multipliers$$

Production scales **linearly** in count, and is amplified by **multiplicative** upgrades (DEPICT-style multipliers, milestone multipliers, prestige multipliers).

### 2.2 The pacing principle
> Cost growth rate > production growth rate for any single generator.

If both are exponential at the same rate, there's no pacing. Production should be at most polynomial (per generator) while cost is exponential. The product across multiple multipliers can be piecewise-exponential — that's fine; it's the per-generator slope that matters.

### 2.3 Per-tier production ratio: ~7–10× previous tier
A new tier's base production is typically 7–10× the previous tier's base production. Combined with the ~5× cost ratio (rule 1.3), the new tier is more cost-efficient by ~2× — which is what drives the "newest tier dominates" pattern that Part II then addresses.

### 2.4 Generator-relevance interventions (Part II)
Without intervention, the newest generator dominates and older tiers become decorative. Three patterns address this:

- **Milestone multipliers:** at owned counts of 25, 50, 100, 200, 300, 400, 500 (or similar), grant a permanent ×2 (or ×N) multiplier to that generator. Player keeps buying lower tiers to chase the milestones.
- **Purchased-vs-owned split:** cost scales on `purchased[tier]`, production scales on `owned[tier]`. Auto-generation by upper tiers boosts `owned` but not `purchased`, so manual purchase decisions stay meaningful.
- **Tier-boost percentage:** each purchased unit of a tier boosts all production from that tier by a small fixed % (e.g. 0.05% in Derivative Clicker; 0.1–2% in others).

---

## 3. Cost-vs-income — the gap that drives pacing

The gap between exponential cost and (slower-than-exponential) production is the only thing pacing the game. Quantify it:

### 3.1 Time-to-next-buy curve
For a single generator: $time(n+1) = cost(n) / production\_rate$. If this curve goes flat, the game is broken (everything affordable instantly). If it rises faster than ~30% per buy, the wall is too steep.

### 3.2 Healthy curve shape
$time(n+1)$ should roughly double every 5–10 buys. Less than that and the player buys constantly with no pause; more than that and the player waits, gets bored, leaves.

### 3.3 "Asymptotic plateau"
Pecorella's observation about Cookie Clicker: optimal play reaches an asymptotic plateau around 8–10 hours where the cost-vs-income gap stops widening. **This is the prestige trigger.** When the player feels the plateau, they want a reset that converts their stuck-state into permanent acceleration.

---

## 4. Generator-overtake formula

### 4.1 The "what to buy next" heuristic (Envato / Pecorella Part I)
For any two generators A and B, A is more efficient to buy next if:
$$\frac{cost_A}{nps} + \frac{cost_B}{nps + rate_A} < \frac{cost_B}{nps} + \frac{cost_A}{nps + rate_B}$$

### 4.2 Simplified single-generator metric (lower = better)
$$\frac{cost_A}{nps} + \frac{cost_A}{nps + rate_A}$$

Compute this for every available generator; the lowest is the optimal next buy. Use this to sanity-check that your tier curves don't make any generator strictly dominated — every tier should be the best buy at some point in the run.

---

## 5. Prestige loop rules

### 5.1 Choose your basis: lifetime vs since-reset

| Basis | Use when | Examples |
|---|---|---|
| **Lifetime earnings ($c_\ell$)** | You want prestige to keep growing across many resets. Encourages players to return after long breaks. | AdVenture Capitalist, Cookie Clicker |
| **Max held during run ($c_m$)** | You want prestige tied to peak progression, not grind. | Realm Grinder |
| **This-run only ($c_r$)** | You want each reset to stand alone. Discourages parking on huge stockpiles. Limits offline gain. | Egg, Inc. |

### 5.2 Use fractional exponents — never linear

| Exponent | Doubling prestige requires | Real example |
|---|---|---|
| **1/2 (sqrt)** | 4× more base earnings | AdVenture Capitalist, Realm Grinder (modified) |
| **1/3 (cbrt)** | 8× more base earnings | Cookie Clicker |
| **1/7 (~0.14)** | ~128× more base earnings | Egg, Inc. |
| 1.0 (linear) | 2× — **DO NOT** | Prestige inflation tracks earnings; no incentive to reset |

The lower the exponent, the flatter the prestige reward curve and the longer the player must grind for the next doubling. Don't go below ~1/10 or each reset feels punishing.

### 5.3 Reward formulas — Pecorella's four canonical examples

**Realm Grinder** (triangular-number inverse on max-currency):
$$p = \frac{\sqrt{1 + 8 \cdot c_m / 10^{12}} - 1}{2}$$

**AdVenture Capitalist** (sqrt on lifetime):
$$p = 150 \cdot \sqrt{c_\ell / 10^{15}}$$

**Cookie Clicker** (cbrt on lifetime):
$$p = \sqrt[3]{c_\ell / 10^{12}}$$

**Egg, Inc.** (fractional exponent on this-run):
$$\Delta p = (c_r / 10^6)^{0.14}$$

### 5.4 The pivot constant
Each formula has a divisor (the `10^12`, `10^15`, `10^6` above). This is the "you need this much resource to earn 1 prestige point" pivot. Set it so:
- First prestige is reachable in 30–60 min of a fresh run
- The 100th prestige is reachable in ~hours of a maxed run
- The 1000th prestige in days (if the game runs that long)

### 5.5 What carries over vs what resets

| Resets | Persists |
|---|---|
| Run currency | Prestige currency |
| Generators / their levels | Prestige tree upgrades / passive bonuses |
| Run multipliers | Lifetime stats |
| Active events / temporary buffs | Achievements (never reset) |

### 5.6 When to add a second prestige layer
- Single prestige run takes more than ~1 day of active play, OR
- Prestige earnings have asymptoted (single-layer formula is doing nothing)
- Then add a "meta-prestige" / "ascension" / "challenge" layer that resets prestige itself and grants a higher-currency
- Examples: Antimatter Dimensions (Infinity → Eternity → Reality), Realm Grinder (Reincarnation), Clicker Heroes (Ancients + Transcendence)

---

## 6. Number representation

### 6.1 Boundaries

| Boundary | What breaks |
|---|---|
| $\approx 9 \times 10^{15}$ ($2^{53} - 1$) | Integer precision. Subtraction starts losing the ones digit. |
| $\approx 1.8 \times 10^{308}$ | Numbers become `Infinity`. Hard ceiling. |
| Subnormals below $\approx 5 \times 10^{-324}$ | Collapse to 0. (Mostly irrelevant for idle games.) |

### 6.2 When to switch

| Likely max value | Storage type |
|---|---|
| < $10^{12}$ | Native `Number` fine; just format display |
| $10^{12}$ – $10^{300}$ | Either careful `Number` or `Decimal` for safety |
| > $10^{308}$ | **Must** use `Decimal` (break_infinity.js or equivalent) |
| Multi-layer prestige with stacking exponents | `Decimal` from day one — late layers will explode |

### 6.3 If you switch, switch the whole resource family
Mixing `Decimal` and `Number` is the #1 bug source. Either: keep small bounded values as `Number` and convert at the boundary only, OR convert the entire resource family at once.

---

## 7. Failure modes — how each principle violation manifests in playtesting

| Principle violated | Predicted symptom |
|---|---|
| Cost growth < 1.07 | Player buys constantly, never pauses, never feels scarcity, loses interest |
| Cost growth > 1.15 (without paradigm) | Hard wall mid-run; player can't progress; rage-quits |
| Cap growth ≤ cost growth (linear cap with exponential cost) | Player hits cap, can't buy storage building to expand cap, dead-locks |
| Production linear and cost linear at same rate | No pacing; cost-vs-income gap stays flat; no decisions to make |
| Newest tier always dominant, no milestone/multiplier mitigation | Lower tiers become decorative; play collapses to "buy the latest thing" |
| Prestige formula linear in earnings | Prestige inflates with earnings; resetting feels pointless |
| Prestige formula too-low exponent (< 1/10) | Each reset's gain is microscopic; player gives up |
| Prestige based on wrong currency (run-only when lifetime intended, or vice versa) | Prestige feels disconnected from what the player just did |
| Native `Number` past $10^{15}$ | Counts of small things start skipping; subtle bugs in achievements / milestones |
| Native `Number` past $10^{308}$ | Numbers freeze at `Infinity`; production rates become NaN; game-ending |
| Auto-poster / auto-buy without manual click reward | Player has no reason to be present; engagement collapses |
| Cost-vs-income gap flat (no exponential cost, no asymptotic plateau) | No prestige moment ever feels earned; reset feels arbitrary |
| Patron / multiplier stacks compound on same resource without cap | Single tier accelerates to overflow; numbers escape representation faster than expected |

---

## 8. Cross-source consensus checklist (one-line summary)

Use this when evaluating any economy decision:

1. ☐ Cost growth is in **1.07–1.15** per generator (or there's a documented reason it's not)
2. ☐ Production scales linearly in count, amplified by multipliers
3. ☐ Cap growth ≥ cost growth (or paradigm shift handles it explicitly)
4. ☐ Each tier has a meaningful peak — generator-overtake metric shows no strictly-dominated tier
5. ☐ Milestone multipliers or similar mechanism keeps lower tiers relevant
6. ☐ Prestige reward uses fractional exponent (sqrt / cbrt / lower)
7. ☐ Prestige basis (lifetime vs run vs max) matches intended player behavior
8. ☐ Pivot constant in prestige formula gives ~30–60 min first prestige, ~hours for 100x
9. ☐ Number type chosen for the projected max value range
10. ☐ Time-to-next-buy roughly doubles every 5–10 buys (not flat, not impossibly steep)
11. ☐ Asymptotic plateau exists and is achievable in finite time — prestige trigger

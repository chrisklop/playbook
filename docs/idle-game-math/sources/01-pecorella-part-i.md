# Pecorella — *The Math of Idle Games, Part I*

**Source:** https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i (Kongregate blog mirror, original URL 404s)
**Author:** Anthony Pecorella (then Director of Virtual Goods, Kongregate; lead producer mobile AdVenture Capitalist)
**Original publish:** Dec 2016
**One-line summary:** Canonical reference for the exponential-cost / linear-production model that underpins the Cookie-Clicker-style idle game.

---

## Core formulas

### Cost curve (exponential)
$$cost_{next} = cost_{base} \times r_{growth}^{owned}$$

Equivalent form sometimes written as $cost(n) = cost_{base} \times (1 + g)^n$ where $g$ is the growth rate as a percentage above 1.

### Total cost of buying $n$ more generators when already owning $k$ (closed-form geometric series)
$$cost = b \times \frac{r^k (r^n - 1)}{r - 1}$$

### Production (linear in count, multiplied by upgrades)
$$production_{total} = (production_{base} \times owned) \times multipliers$$

Production scales **linearly** with count and is amplified by **multiplicative** upgrades. The product of "linear × multipliers" can itself be polynomial or piecewise-exponential overall, but the per-generator count contribution is linear.

---

## Recommended parameter ranges

| Parameter | Typical range | Notes |
|---|---|---|
| Growth rate $r$ | **1.07 – 1.15** | Below 1.07 the cost barely scales; above 1.15 it walls off late game. |
| Base cost per generator | varies enormously; new tier ≈ 5× previous tier's base cost (Cookie Clicker rule of thumb) | Tier ratio is the design lever |
| Production per generator | new tier ≈ 7-10× previous tier (typical) | Tuned so newest tier dominates eventually |

---

## Core design principle

> "Early on in a run, your production will exceed costs while eventually costs will become prohibitive."

The **gap** between exponential cost and linear-or-polynomial production drives all pacing. Costs are exponential in level. Production is linear in count. Costs eventually outpace production, creating the wall that pacing relies on.

---

## Generator relevance — Pecorella's diagnosis

> "The newest generator is nearly always dominant once it can be purchased."

So older generators stop mattering once newer tiers exist. Part I doesn't solve this — that's Part II. The implicit problem is: without intervention, the game collapses into "only buy the latest thing."

Mentioned interventions (developed in Part II):
- Per-tier production multipliers
- Milestone bonuses ("each 25 owned doubles this generator")
- Separate owned vs purchased counts

---

## Real-game constants

### AdVenture Capitalist — Lemonade Stand (Pecorella's worked example)
- Base cost: 4
- Growth rate: 1.07
- Production: 1.67 / sec base
- Worked example: at 10 owned, next cost = $4 \times 1.07^{10} ≈ 7.87$

### Cookie Clicker (Envato cross-reference)
- 11 building tiers
- Growth rate **1.15** for all buildings
- Base cost ratios: ~5× per tier
- Production ratio: ~10× per tier
- Asymptotic plateau "8-10 hours in"

### Clicker Heroes
- Growth rate **1.07** across all heroes
- Worked: Treebeard hero base 50, +5 income per level, $price = 50 \times 1.07^{owned}$

### Steam Monsters (Pecorella note)
- Growth rate **2.5** — listed as steep / aggressive

---

## Named patterns

| Pattern | Description |
|---|---|
| **Exponential cost / linear production** | The core Cookie-Clicker model |
| **Bulk-purchase formula** | Closed-form geometric-series cost for buying $n$ at once |
| **Tier-overtake** | Each new generator eventually dominates the previous (a feature when paced, a bug when too aggressive) |

## Named anti-patterns

| Anti-pattern | Symptom |
|---|---|
| **Linear cost growth** | No variability; the cost-vs-income gap stays flat; boring quickly |
| **Cost outpacing income too early** | Hard wall; player gives up |
| **Growth rate too low** (< 1.07) | Unlocks come too quickly; sense of scarcity dies |
| **Growth rate too high** (> 1.15) | Mid-game wall, run feels short |
| **Newest generator always dominant with no counter** | Old tiers become decorative; design loses depth |

---

## Concrete numbers worth quoting

- AdVenture Capitalist Lemonade Stand: base 4, growth 1.07, prod 1.67/s
- Cookie Clicker buildings: growth 1.15 universally, ~5× cost per tier, ~10× prod per tier
- Clicker Heroes: growth 1.07 universally
- Steam Monsters: growth 2.5 (outlier, steep)

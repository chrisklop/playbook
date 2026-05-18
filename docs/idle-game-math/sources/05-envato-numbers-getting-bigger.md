# Envato Code Tuts+ — *Numbers Getting Bigger: The Design and Math of Incremental Games*

**Source:** https://code.tutsplus.com/numbers-getting-bigger-the-design-and-math-of-incremental-games--cms-24023a
**Author:** Anthony Pecorella (same author as the Kongregate series, earlier piece)
**One-line summary:** Earlier (2015) treatment of the same material. The principles are identical to the 2016 Kongregate series; this serves as a useful cross-check.

---

## Core formulas (consistent with Part I)

### Cost curve
$$Price = BaseCost \times Multiplier^{(\#Owned)}$$

### Production (linear)
Total rate / sec = $(\#Owned) \times (BaseIncomeRate)$

Example: $y = 5x$ for a hero whose level gives +5 per second.

---

## Multiplier ranges by game (Envato's explicit table)

| Game | Cost multiplier per generator |
|---|---|
| **Clicker Heroes** | 1.07 across all heroes |
| **Cookie Clicker** | 1.15 for all buildings |
| **AdVenture Capitalist** | 1.07 – 1.15, varies per business |
| **Steam Monsters** | 2.5 (steep outlier) |

**Standard range Envato endorses: 1.07 – 1.15.**

---

## The cost-vs-income gap (verbatim)

> "The gap between the two lines [cost and income] gives us the ever-growing cost-versus-benefit ratio. Cost scales exponentially while income increases linearly, creating divergence over time."

This is the principle. Everything else follows from it.

---

## Generator efficiency / overtake math

Envato presents Pecorella's two formulations:

### Two-upgrade comparison
For deciding whether to buy generator A or generator B next:
$$\frac{cost_A}{nps} + \frac{cost_B}{nps + rate_A} < \frac{cost_B}{nps} + \frac{cost_A}{nps + rate_B}$$

If the inequality holds, buy A first.

### Simplified single-upgrade metric (lower = better)
$$\frac{cost_A}{nps} + \frac{cost_A}{nps + rate_A}$$

> "The lowest result, because of the transitivity of the inequalities, will yield what we should purchase next."

This is a practical "what to buy next" heuristic that AIs and players can use; it generalizes the intuitive "best ROI" decision.

---

## Prestige (light treatment)

> "Resets progress but applies flat multiplicative increase to all subsequent calculations… just means the player will reach the eventual asymptotic plateau quicker and quicker."

Doesn't go deep on prestige formulas (that's the 2016 Part III piece). But notes:
- Prestige is "flat multiplicative increase" applied to a fresh run
- The point of prestige is to **accelerate reaching the plateau**, not change game shape

---

## Game examples with concrete numbers

### Cookie Clicker
- 11 buildings
- Base costs: 15 → 75,000,000,000 (~5× per tier)
- Production: 0.1 → 10,000,000 per second
- Cost multiplier: 1.15
- "Optimal play reaches asymptotic plateau ~8–10 hours in, then flattens"

### Clicker Heroes — Treebeard
- Base cost: 50
- Multiplier: 1.07
- Income: +5 per level (linear)
- $Price = 50 \times 1.07^{\#owned}$

### AdVenture Capitalist
- Multiple businesses, mults 1.07 – 1.15
- Idle-earnings display ("doesn't require constant attention")

### Number (Tyler Glaiel)
- Pedagogical example
- Starting income: 0.1/sec
- First 5 purchases: cost 1.0 → 2.2; income 0.2 → 1.8/sec
- Demonstrates nonlinear cost/benefit divergence in miniature

---

## Anti-patterns (Envato names these)

| Anti-pattern | Symptom |
|---|---|
| **Linearly-scaling costs** | "If cost/benefit stayed the same... there would be no variability... boring very quickly" |
| **Too much active engagement required** | Risks "violat[ing] principles of ethical and humane game design" |
| **Uniform cost increases too low** | "Unlocks might come too quickly" |
| **Uniform cost increases too high** | Player "boredom" — too much waiting |

---

## What this source adds beyond Pecorella Part I

- The explicit growth-rate **table** of real games (referenced above)
- The two-upgrade-comparison formula in cleaner form
- The "what to buy next" heuristic as a single ranked metric
- The Number (Tyler Glaiel) miniature example, useful for sanity-checking

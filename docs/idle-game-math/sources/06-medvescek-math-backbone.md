# Medvešček Murovec — *Math: The Backbone of Idle Games (Part 1)*

**Source:** https://medvescekmurovec.medium.com/math-the-backbone-of-idle-games-part-1-f46b54706cf1
**Author:** Dik Medvešček Murovec
**One-line summary:** Independent restatement of the Pecorella framework with a pedagogical "Woodchuck Idle" example. Part 2 promised but never published.

---

## Cost growth formula

$$Cost(level) = initial\_cost \times (1 + growth\_rate)^{level}$$

Notation difference from Pecorella: $growth\_rate$ here is the **percent above 1** (e.g. $growth\_rate = 0.15$ for a 15% growth = Pecorella's $r = 1.15$).

---

## Production formula

Pure linear:
- Strong Tooth upgrade: +1 wood per click per level
- Hire a Woodchuck upgrade: +10 wood/sec per hire

> "Both upgrades only offer a linear increase in income."

---

## Worked parameter values (Woodchuck Idle pedagogical example)

| Upgrade | Initial cost | Growth rate |
|---|---|---|
| Strong Tooth | 10 | **15%** per level |
| Hire a Woodchuck | 100 | **7%** per level |

So a click-power upgrade is **steeper** (15%) than an income-generator upgrade (7%) — a small but useful design pattern: click-power should ramp up faster in cost to prevent click-spam dominating the loop.

---

## The pacing principle (verbatim)

> "Make sure that the cost of upgrades grows faster than the income increase."

> "The costs will overtake the production rate as long as the growth rate of the production function is lower than the growth rate of the cost function."

Restates the Pecorella principle cleanly: **cost growth rate > production growth rate** for any single upgrade type, or pacing collapses.

---

## Generator overtake (asymptotic argument)

> "You can always look at an equation and ignore everything but the fastest-growing part."

Comparison principle:
- Linear $y = x$ vs polynomial $y = 0.1x^2$ — polynomial eventually dominates regardless of coefficients
- Polynomial $y = x^n$ vs exponential $y = b^x$ — exponential always wins for $b > 1$

So when designing a system where you want **cost** to outpace **income**, make cost exponential and income polynomial (or linear). When you want income to eventually overtake cost (post-paradigm), flip it.

---

## Number representation

Two notations identified:
1. **Custom symbols** — assign letters (a, b, c, …) to magnitude tiers (1aa, 1bb, …)
2. **Scientific / E-notation** — $x e^n$ where $x$ is the mantissa and $n$ is the magnitude

The article notes both are used by real games; no specific guidance on when to switch.

---

## Game examples mentioned

- Progress Quest (2002) — credited as the first idle game
- Cookie Clicker, Clicker Heroes, AdVenture Capitalist, AFK Arena, Realm Grinder
- Woodchuck Idle (pedagogical, not a real published game)

---

## Anti-patterns implied

| Anti-pattern | Symptom |
|---|---|
| **Income growth rate ≥ cost growth rate** | Player runs away from costs; no pacing tension; game never reaches the asymptotic plateau |
| **Linear cost growth** | (Same point as Envato/Pecorella) — no scarcity, boring |
| **Mismatched cost/income tier curves across generators** | One tier dominates forever, others irrelevant |

---

## What this source adds

- Cleaner notation for designers who think in "percent growth per level" rather than "multiplier per level"
- The click-power-vs-generator differential (15% vs 7%) as a deliberate pattern
- Plain-language statement of the asymptotic-dominance principle
- Cross-check confirming Pecorella's 1.07–1.15 range is the consensus

---

## Status of Part 2

Promised in Part 1 ("We'll take a look at prestigeing, multipliers, and more complex examples in part 2.") but **never published.** Author's Medium index confirms only Part 1 exists.

For the deferred content (prestige), see Pecorella Part III.

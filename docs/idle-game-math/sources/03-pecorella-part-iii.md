# Pecorella — *The Math of Idle Games, Part III*

**Source:** https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii
**Author:** Anthony Pecorella
**Original publish:** Late 2016 / early 2017 (Kongregate blog, mirrored on Game Developer)
**One-line summary:** Prestige math — four real-game formulas analyzed, the lifetime-vs-since-reset distinction, and how exponent choice shapes player behavior.

---

## Prestige reward formulas — four real games

### Realm Grinder (based on max-this-run currency)
$$p = \frac{\sqrt{1 + 8 \cdot c_m / 10^{12}} - 1}{2}$$

where $c_m$ = max currency held during the run. This is the **triangular-number inverse** — equivalent to "to get $p$ prestige, you need $\frac{p(p+1)}{2} \times 10^{12}$ currency."

> "To double prestige currency, a player would need to earn 4 times as much as the previous run."

### AdVenture Capitalist (lifetime earnings)
$$p = 150 \cdot \sqrt{c_\ell / 10^{15}}$$

where $c_\ell$ = lifetime earnings (sum across all resets). Square-root with a 150× scale and 10¹⁵ pivot.

### Cookie Clicker (lifetime earnings)
$$p = \sqrt[3]{c_\ell / 10^{12}}$$

Cube root. Pecorella's pacing note:

> "To double prestige currency, a player needs to earn roughly 8 times the previous run."

### Egg, Inc. (current-run earnings)
$$\Delta p = (c_r / 10^6)^{0.14}$$

Fractional exponent ~ $\frac{1}{7}$. Run-independent: each reset is treated separately.

---

## The two categories

| Category | Basis | Reset behavior |
|---|---|---|
| **Lifetime-based** (AdVenture Cap., Cookie Clicker) | $c_\ell$ accumulates across all resets | Need exponential growth each reset to keep prestige earnings going up |
| **Run-independent** (Egg, Inc.) | $c_r$ from this run only | Each reset stands alone; encourages active play and limits offline gain |

Pecorella's note: these are the "fundamental difference [that] guides general reset behavior in a significant way."

---

## Exponent choice as the design lever

| Exponent | Effect | Real example |
|---|---|---|
| $\sqrt{\cdot}$ (½) | Doubling prestige requires 4× previous earnings | Realm Grinder, AdVenture Capitalist |
| $\sqrt[3]{\cdot}$ (⅓) | Doubling prestige requires 8× previous earnings | Cookie Clicker |
| ~0.14 (≈1/7) | Each reset's prestige earns a small fixed-shape amount | Egg, Inc. |

The lower the exponent, the **flatter** the prestige reward curve and the more each reset feels like grinding for diminishing returns. Higher exponents (closer to 1) feel more like "you 10×'d, you get 10× more prestige" — which sounds good but undermines the soft-reset loop because prestige inflation tracks earnings inflation.

---

## What carries over vs what resets — design rule

> "Generators and multipliers reset. Prestige currency and prestige-purchased upgrades persist. Achievements never reset."

The split is:
- **Resets:** generators, levels, run currency, run multipliers
- **Persists:** prestige currency, prestige tree purchases / passive bonuses, achievements, lifetime stats
- **Achievements ≠ prestige:** achievements are permanent flag-based rewards; prestige is an active reset mechanic

---

## When to add a second prestige layer

Pecorella's signal: when a single prestige loop becomes too long (resets take days+) or too short (resets every 10 min). A second prestige layer (sometimes called "ascension" or "challenge mode") sits above the first and resets the prestige currency itself.

Mentioned games with multi-layer prestige:
- **Antimatter Dimensions** — Infinity → Eternity → Reality
- **Realm Grinder** — Reincarnation
- **Clicker Heroes** — Ancients + Transcendence

---

## Idle vs active design

The article emphasizes that prestige reward shape encodes player intent:
- Lifetime + square-root → reward returning to the game; offline progress matters
- Run-independent + fractional exponent → reward active play sessions; offline progress capped

---

## Anti-patterns Part III flags

| Anti-pattern | Symptom |
|---|---|
| **Linear or super-linear prestige formula** | Prestige inflates with earnings; no incentive to keep playing past the first reset |
| **Flat prestige multipliers** | Each reset gives identical gain; play becomes static |
| **Prestige formula tied to wrong base** | E.g. using current run when lifetime would make more sense (or vice versa) — breaks reset loop |
| **Lifetime base + low exponent** | Eventually each reset's contribution is microscopic; player feels punished for resetting |
| **Run-base + high exponent** | First reset feels great; subsequent resets feel pointless |

---

## Number representation

Part III flags that all four real games eventually exceed safe IEEE-754 range and need either custom BigNumber implementations or scientific-notation rendering. (Specifics deferred to break_infinity.js source.)

Antimatter Dimensions specifically uses break_infinity.js / break_eternity.js (developed by Patashu) to handle numbers up to $1e(9e15)$ — required because the game's late-game numbers exceed $1e308$.

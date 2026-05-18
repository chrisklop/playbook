# Patashu — **break_infinity.js** README

**Source:** https://github.com/Patashu/break_infinity.js
**Author:** Patashu (maintained by Antimatter Dimensions developer)
**One-line summary:** Drop-in BigNumber library for idle games that breaks the IEEE-754 ceiling at 1e308, scaling to 1e(9e15). Trades precision for speed.

---

## Why JS Number breaks down

JavaScript uses IEEE-754 double-precision floats:
- **Max safe integer:** $2^{53} - 1 = 9{,}007{,}199{,}254{,}740{,}991$ (~$9 \times 10^{15}$). Beyond this, integer precision is lost — consecutive integers can't be represented exactly.
- **Max representable magnitude:** $\approx 1.8 \times 10^{308}$ (positive infinity beyond)
- **Subnormals collapse to zero** below $\approx 5 \times 10^{-324}$

So an idle game using raw Number for resource counts breaks down in two phases:
1. **At ~9e15 (precision boundary):** integer arithmetic stops being exact. Counting tiny things (sock puppets, posts, milliseconds of time-played) starts skipping values. Subtle bugs.
2. **At ~1.8e308 (overflow boundary):** numbers become `Infinity`. The game freezes mathematically.

---

## What break_infinity.js handles

> "very large numbers (bigger in magnitude than 1e308, up to as much as 1e(9e15))"

It represents numbers as `(mantissa, exponent)` pairs. The exponent itself is a double, so the effective range is $\pm 1e(9 \times 10^{15})$ — astronomically larger than IEEE-754's $\pm 1e308$.

### Design philosophy

> "Prioritize speed over accuracy."

Where `decimal.js` aims for arbitrary precision (and pays a heavy CPU cost), `break_infinity.js` trades some precision for ~3× faster construction and dramatic speedups on heavy math:
- 2.8× faster on `.new` (construction)
- **121× faster on log10**
- **401× faster on exp**
- **442× faster on pow**

For an idle game that ticks once per frame and does thousands of multiplications per tick, this is the difference between playable and not.

---

## API surface (designer-relevant)

- Constructor accepts `Number`, `String`, or existing `Decimal`
- Method chaining: `.add().mul().pow().log10()` etc.
- Drop-in for code already using `decimal.js`:
  > "If you are already using decimal.js, just swap out for break_infinity.js and everything will work the same."

### Common method patterns
- `Decimal.fromNumber(x)` / `new Decimal(x)` — construct
- `a.add(b)`, `a.mul(b)`, `a.div(b)`, `a.sub(b)`
- `a.pow(b)`, `a.exp()`, `a.log10()`, `a.sqrt()`
- `a.lt(b)`, `a.gt(b)`, `a.eq(b)` — comparison; **do not use ===, <, > on Decimals**
- `a.toNumber()` to round-trip back if you're certain you're in safe range
- `a.toString()` / `a.toExponential()` for display

---

## When to switch in an idle game

The README doesn't give explicit progression-point advice, but the de-facto rules:

1. **If your max-ever-resource will plausibly exceed 1e15** during late-game playtesting, switch the storage of that resource to `Decimal`. Cap-driven idle games hit this within a few prestige loops.
2. **If you have any field that multiplies multipliers compounding over hundreds of levels** (e.g. DEPICT-style stacking), that field will exceed 1e308 well before its inputs do. Switch.
3. **Once one resource is `Decimal`, anything it interacts with via arithmetic must also be `Decimal`** — mixing `Number` and `Decimal` is the largest source of bugs. Either keep small bounded values as `Number` and convert at the boundary, or convert everything.

---

## Alternatives

- **`decimal.js`** — slower but more accurate; precise arithmetic, arbitrary precision. Use when correctness matters (banking, scientific). Idle games don't need this.
- **`break_eternity.js`** — Patashu's sequel, extends past `1e(9e15)` into the cosmic-scale territory required by games like Antimatter Dimensions's later layers and the Numbers Going Up genre.
- **Native `BigInt`** — exact integer arithmetic; can't represent fractions; slow on big values; not designed for idle games.

---

## Recommended migration pattern (for an existing Number-based idle game)

The README's stance: "just swap." The practical reality:

1. **Find every resource field.** Replace `number` with `Decimal`.
2. **Find every cap field.** Same.
3. **Find every cost / production constant.** Wrap in `new Decimal()` at module load (once, not per-tick).
4. **Replace operators:** `+` → `.add()`, `*` → `.mul()`, etc.
5. **Replace comparisons:** `>` → `.gt()`, etc.
6. **At display boundaries:** call `.toNumber()` only when safe (i.e. value fits in `Number`), else `.toExponential()` or a custom formatter that reads mantissa+exponent directly.
7. **Save format:** serialize as a string and parse back (`.toString()` / `new Decimal(str)`) — JSON-encoding a Decimal object preserves structure but parses opaquely.

The bug-prone step is mixing: a single missed `.add()` swallowed as `+` between Decimal and Number turns the Decimal into garbage. Strict linting or a TypeScript `Decimal` type can catch this at compile time.

---

## Real games that use break_infinity.js

- **Antimatter Dimensions** — the canonical reference user. Late-game numbers exceed $1e(10^{12})$.
- **Numbers Going Up** — explicit cosmic-scale idle game built around break_eternity.
- **Realm Grinder** — uses similar BigNumber techniques (mantissa-exponent pairs)

---

## Bottom-line designer guidance

| Game's likely max value | Use |
|---|---|
| < ~$10^{12}$ | Native `Number` is fine; just pick good display formatting |
| $10^{12}$ – $10^{300}$ | Either native `Number` with careful display, or `Decimal` for safety |
| $> 10^{308}$ | **Must** use `Decimal` (break_infinity.js) or equivalent |
| Multi-layer prestige with stacking exponents | `Decimal` from day one — late layers will explode |

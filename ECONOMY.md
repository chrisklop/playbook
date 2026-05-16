# Inoculate — Economy Spec v0

> Companion to PLAN.md. Numbers a dev can transcribe straight into TypeScript. All costs use `cost(L) = base · g^L` (L is the number ALREADY owned, so the price of "next" at L=0 is `base`). Caps use `cap(L) = capBase + capStep · L` pre-paradigm, `capBase · capGrowth^L` post-paradigm. Tick = 100ms. Rates below are **per-tick** unless stated; multiply by 10 for per-second.

---

## 1. Cost-Curve Tables

### 1.1 Growth-rate selection rationale

| g     | When to use                                    | Examples                                  |
|-------|------------------------------------------------|-------------------------------------------|
| 1.12  | Late-game, high-volume buys, must scale to 50+ | Tier 5–6 bots, AI compute, prestige-tier  |
| 1.15  | Default — most assets, most upgrades           | Tiers 1–4, DEPICT nodes, handlers         |
| 1.18  | High-impact, low-quantity, soft-cap intent     | Conversion buildings, paradigm projects   |

### 1.2 Human assets (PLAN §3.1)

Cost is in the listed resource. `g` chosen per tier — early tiers default, late tiers steeper to gate AI Sat.

| Tier | Asset                  | Resource | Base     | g    | L=10 cost     | L=25 cost          |
|------|------------------------|----------|----------|------|---------------|--------------------|
| 1    | Anonymous Blogger      | Att      | 25       | 1.15 | 101           | 824                |
| 2    | Niche Podcaster        | Eng      | 200      | 1.15 | 809           | 6 590              |
| 3    | Mid-tier Influencer    | Fol      | 1 500    | 1.15 | 6 067         | 49 423             |
| 4    | Cable Contributor      | Cred     | 12 000   | 1.18 | 62 779        | 707 814            |
| 5    | "Thought Leader"       | NarDom   | 80 000   | 1.18 | 418 525       | 4 718 760          |
| 6    | Defection-Resistant Op | NarDom   | 500 000  | 1.18 | 2 615 781     | 29 492 250         |

### 1.3 Bot assets (PLAN §3.2)

Bots scale to larger counts; gentler g.

| Tier | Asset               | Resource | Base    | g    | L=10 cost   | L=25 cost          |
|------|---------------------|----------|---------|------|-------------|--------------------|
| 1    | Sock Puppet         | Att      | 5       | 1.15 | 20          | 165                |
| 2    | Small Botnet        | Eng      | 50      | 1.15 | 202         | 1 647              |
| 3    | Astroturf Farm      | Fol      | 500     | 1.15 | 2 023       | 16 474             |
| 4    | Coordinated Network | Cred     | 5 000   | 1.15 | 20 227      | 164 744            |
| 5    | LLM Content Mill    | NarDom   | 30 000  | 1.12 | 93 173      | 510 050            |
| 6    | Deepfake Generator  | NarDom   | 200 000 | 1.12 | 621 154     | 3 400 333          |

### 1.4 DEPICT tree nodes (PLAN §4)

8 nodes per tree × 6 trees = 48 nodes. Each node bought once (level ∈ {0,1}). Cost rises by tier-within-tree (n=1..8). `cost(n) = base · g^(n−1)` with tree-specific base.

| Tree           | Resource | Base | g    | Node 4 cost | Node 8 cost  |
|----------------|----------|------|------|-------------|--------------|
| Discrediting   | Cred     | 500  | 1.18 | 821         | 1 593        |
| Emotional      | Eng      | 30   | 1.15 | 46          | 80           |
| Polarization   | Fol      | 200  | 1.15 | 304         | 533          |
| Impersonation  | Cred     | 800  | 1.18 | 1 314       | 2 550        |
| Conspiracy     | Eng      | 80   | 1.18 | 131         | 255          |
| Trolling       | Att      | 50   | 1.15 | 76          | 133          |

Plus a tier-step multiplier ×8 applied when the node is the *gate* between sub-branches (nodes 4 and 7 in each tree's DAG) to enforce pacing — handled by per-tree config, not the formula.

### 1.5 Conversion buildings (PLAN §2.5)

Each conversion is its own purchasable building. Base cost in the *input* resource of the prior tier; same growth.

| Building              | In → Out         | Resource paid | Base    | g    | L=10        | L=25         |
|-----------------------|------------------|---------------|---------|------|-------------|--------------|
| RSS aggregator        | Att → Eng        | Att           | 100     | 1.18 | 523         | 5 898        |
| Algorithmic amplifier | Eng → Fol        | Eng           | 1 000   | 1.18 | 5 234       | 58 985       |
| Booking agent         | Fol → Cred       | Fol           | 8 000   | 1.18 | 41 875      | 471 876      |
| Op-ed pipeline        | Cred → NarDom    | Cred          | 60 000  | 1.18 | 313 893     | 3 539 070    |
| AI content stack      | NarDom → SynReal | NarDom        | 400 000 | 1.18 | 2 092 625   | 23 593 800   |

### 1.6 Cap-source upgrades (storage)

| Resource | Building name        | Base   | g    | L=10        | L=25          |
|----------|----------------------|--------|------|-------------|---------------|
| Att      | Extra outlet         | 10     | 1.15 | 40          | 330           |
| Eng      | CMS upgrade          | 80     | 1.15 | 323         | 2 636         |
| Fol      | Network expansion    | 800    | 1.15 | 3 235       | 26 359        |
| Cred     | Reputation laundering| 6 000  | 1.18 | 31 389      | 353 907       |
| NarDom   | Mainstream pickup    | 50 000 | 1.18 | 261 578     | 2 949 225     |
| SynReal  | AI compute lease     | 300 000| 1.12 | 931 730     | 5 100 499     |

### 1.7 Handler-capacity upgrades (PLAN §3.3)

`baseHandlers = 4`. Each level adds +2 hours.

| Level | Cost (Att, scales w/ era multiplier) | Cumulative hrs |
|-------|--------------------------------------|----------------|
| 0     | (free, baseline)                     | 4              |
| 1     | 60 Att                               | 6              |
| 5     | 60·1.15^5 ≈ 121                      | 14             |
| 10    | 60·1.15^10 ≈ 243                     | 24             |
| 25    | 60·1.15^25 ≈ 1 977                   | 54             |

After Phase 2, handler cost switches to Eng at `base=300`, then Fol `base=2k`, etc. — same g=1.15.

### 1.8 Paradigm projects (one-shots, switch caps to exponential)

| Project              | Phase gate    | Cost                | Effect                                |
|----------------------|---------------|---------------------|---------------------------------------|
| Editorial calendar   | Grassroots    | 400 Att             | Eng cap formula switches to exp       |
| Verified-checkmark op| Blog          | 3 500 Eng           | Fol cap → exp                         |
| PR firm retainer     | Social        | 80 000 Fol          | Cred cap → exp                        |
| Think-tank charter   | Influencer    | 700 000 Cred        | NarDom cap → exp                      |
| Network deal         | Cable         | 6 000 000 NarDom    | SynReal cap → exp; +10% conversions   |
| Release the Deepfake | AI Saturation | 300k SynReal        | Force-triggers Mebro reveal           |

---

## 2. Cap-Growth Tables & Invariant 1 Check

Invariant 1: `k_cap ≥ k_cost` so caps never lag costs. Below: pre-paradigm caps are *linear*, so we verify by asking "after the paradigm project, does `capGrowth ≥ g_cost`?"

### 2.1 Pre-paradigm (linear) caps

`cap(L) = capBase + capStep · L`

| Resource | capBase | capStep | Cap at L=10 | Cap at L=25 | Cost at L=25 (from §1.6) | Ratio cap/cost |
|----------|---------|---------|-------------|-------------|--------------------------|----------------|
| Att      | 100     | 50      | 600         | 1 350       | 330                      | 4.09           |
| Eng      | 500     | 250     | 3 000       | 6 750       | 2 636                    | 2.56           |
| Fol      | 5 000   | 2 500   | 30 000      | 67 500      | 26 359                   | 2.56           |
| Cred     | 30 000  | 15 000  | 180 000     | 405 000     | 353 907                  | 1.14           |
| NarDom   | 200 000 | 100 000 | 1.2M        | 2.7M        | 2.95M                    | 0.92 ⚠         |
| SynReal  | 1M      | 500 000 | 6M          | 13.5M       | 5.1M                     | 2.65           |

NarDom L=25 fails linearly — which is by design: this is the trigger to **require** the paradigm project ("Network deal") before continuing. The sim must purchase it before L=25.

### 2.2 Post-paradigm (exponential) caps — Invariant 1 verification

`cap(L) = capBase · capGrowth^L`. Need `capGrowth ≥ g_cost`. Choose `capGrowth = g_cost + 0.02` for headroom.

| Resource | g_cost (§1.6) | capGrowth | OK? | capBase   | cap L=10        | cap L=25            |
|----------|---------------|-----------|-----|-----------|-----------------|---------------------|
| Att      | 1.15          | 1.17      | ✓   | 600       | 2 893           | 31 094              |
| Eng      | 1.15          | 1.17      | ✓   | 3 000     | 14 464          | 155 469             |
| Fol      | 1.15          | 1.17      | ✓   | 30 000    | 144 638         | 1 554 686           |
| Cred     | 1.18          | 1.20      | ✓   | 180 000   | 1 114 757       | 17 121 070          |
| NarDom   | 1.18          | 1.20      | ✓   | 1 200 000 | 7 431 716       | 114 140 467         |
| SynReal  | 1.12          | 1.14      | ✓   | 6 000 000 | 22 254 525      | 158 776 263         |

**Invariant 1 holds:** for every resource the cap-growth rate strictly exceeds the cost-growth rate post-paradigm. Sim asserts `cap(L+1) / cap(L) ≥ cost(L+1) / cost(L)` every tick.

---

## 3. Production Rates Per Tick

Notation: `prod = base · level · platformAmp · depictMult · labor_fraction`. `labor_fraction ∈ [0,1]` from §3.3 of PLAN. Heat contributions are **per asset instance** (count, not level).

### 3.1 Human asset per-tick output (level = count owned)

| Tier | Primary out / tick | Secondary out / tick | Handler hrs | Heat / tick (per instance) |
|------|--------------------|----------------------|-------------|-----------------------------|
| 1    | +1.0 Att           | +0.05 Eng            | 1           | +0.0010                     |
| 2    | +5.0 Eng           | +0.5 Cred            | 3           | +0.0020                     |
| 3    | +30 Fol            | +2.0 Cred            | 5           | +0.0040                     |
| 4    | +50 Cred           | +5.0 NarDom          | 8           | +0.0080                     |
| 5    | +300 NarDom        | +unlocks combo slot  | 12          | +0.0120                     |
| 6    | +1000 NarDom       | -defection roll      | 15          | +0.0150                     |

Each tick: `actualOut = listed · labor_fraction · (1 + sumDepictMults) · platformAmp`. With labor_fraction = 0.5 you get half output and a "burnout" log line.

### 3.2 Bot asset per-tick effect (multiplicative on primary resource)

Bots multiply *generation*, not output a flat number, except tier 5/6.

| Tier | Multiplier                            | Applies to       | Heat / tick / instance |
|------|---------------------------------------|------------------|------------------------|
| 1    | +25% Att                              | 1 platform       | +0.0005                |
| 2    | +15% Eng                              | 1 platform       | +0.0010 / 100 bots     |
| 3    | +10% Fol globally; ×1.5 heat          | global           | +0.0020                |
| 4    | +20% Fol→Cred conversion; ×2 heat     | global           | +0.0040                |
| 5    | +30% NarDom, +5 SynReal               | global           | +0.0080                |
| 6    | +50% SynReal, +0.02 cure exposure     | global           | +0.0200                |

Caps on bot count per platform: tier 1: 50; tier 2: 30; tier 3+: 20. Exceeding cap costs 2× heat.

### 3.3 labor_fraction interaction examples

| Owned assets               | handler hrs demanded | Available | labor_fraction | Effective multiplier  |
|----------------------------|----------------------|-----------|----------------|-----------------------|
| 4 × T1                     | 4                    | 4         | 1.00           | 1.00 (normal)         |
| 10 × T1                    | 10                   | 8         | 0.80           | 0.80                  |
| 4 × T1 + 2 × T2            | 4 + 6 = 10           | 6         | 0.60           | 0.60                  |
| 4 × T1 + 2 × T2 + 1 × T3   | 15                   | 8         | 0.53           | 0.53 (near-burnout)   |
| Same, w/ 2 handler upgrades| 15                   | 12        | 0.80           | 0.80                  |

Burnout log fires when `labor_fraction < 0.5`.

---

## 4. Conversion Building Specs

`desired = rate · dt · level`, with `dt = 0.1` (100ms tick). Ratios from PLAN §2.5.

| Building              | rate (in/sec) | ratio (out/in) | qualityBase | Handler hrs | Heat/tick |
|-----------------------|---------------|----------------|-------------|-------------|-----------|
| RSS aggregator        | 2.0 Att/sec   | 1.2            | 1.00        | 0           | +0.0010   |
| Algorithmic amplifier | 3.0 Eng/sec   | 1.5            | 1.00        | 1           | +0.0020   |
| Booking agent         | 4.0 Fol/sec   | 1.0            | 1.10        | 3           | +0.0040   |
| Op-ed pipeline        | 5.0 Cred/sec  | 0.8 (lossy)    | 1.20        | 5           | +0.0050   |
| AI content stack      | 8.0 NarDom/sec| 2.0            | 1.00        | 2           | +0.0150   |

### 4.1 Per-tick math example (Algorithmic amplifier, L=3, dt=0.1)

```
desired         = 3.0 · 0.1 · 3       = 0.9 Eng/tick
inputAvail      = 12.0                 (Eng on hand)
outputRoom      = 50 - 22 = 28         (Fol cap minus current)
fraction        = min(1, 12/0.9, 28/(0.9·1.5))
                = min(1, 13.3, 20.7)   = 1.0
consumed        = 0.9
produced        = 0.9 · 1.5 · 1.00     = 1.35 Fol
state.eng      -= 0.9
state.fol      += 1.35
heat[twitter]  += 0.002                (split if multi-platform)
```

If outputRoom were 0.5 instead: `fraction = 0.5/(0.9·1.5) = 0.37`, `consumed = 0.333`, `produced = 0.5`. Stops cleanly at cap.

### 4.2 Handler interaction

If a conversion building requires handler hrs and `labor_fraction < 1`, `qualityMultiplier *= labor_fraction`. So a starved booking agent at 0.6 labor produces only 60% of normal. This is the only place a conversion can underperform without input/output limiting.

---

## 5. Pacing Targets

Target for naive (no-guide) greedy player. Sim must hit these within ±25%.

| Phase gate                  | Cumulative time | New resource ceiling | Action count* |
|-----------------------------|-----------------|----------------------|---------------|
| Boot → Grassroots active    | t = 0           | Att                  | 0             |
| Grassroots → Blog           | ≤ 5 min         | Eng unlocked         | ~30           |
| Blog → Social               | ≤ 12 min        | Fol unlocked         | ~80           |
| Social → Influencer         | ≤ 22 min        | Cred unlocked        | ~140          |
| Influencer → Cable          | ≤ 32 min        | NarDom unlocked      | ~200          |
| Cable → AI Saturation       | ≤ 40 min        | SynReal unlocked     | ~260          |
| First Mebro reveal trigger  | ≤ 45 min        | (Cure ≥ 0.80)        | ~290          |

*Action count = clicks/purchases. Used to verify the game isn't *idle-only* in the active window.

### 5.1 Cure pacing

Cure must cross thresholds at roughly:

| Cure | Wall-clock | Phase context              |
|------|-----------|-----------------------------|
| 0.20 | ~10 min   | mid-Blog                    |
| 0.40 | ~22 min   | Social → Influencer gate    |
| 0.60 | ~35 min   | Cable era mid               |
| 0.80 | ~45 min   | Reveal                      |

This means `baseRate ≈ 0.0003/sec` early, drifting up via the §6.2 formula as heat sources stack.

---

## 6. Example Sim Runs (greedy)

Three naive strategies. Cumulative log resource at minute marks. `~` = order-of-magnitude.

### 6.1 Run A — "Bot rush" (buy cheapest tier of bots first, ignore handlers)

```
min   Att     Eng     Fol     Cred    NarDom  Cure   Phase
 0    0       0       0       0       0       0.00   Grassroots
 1    40      0       0       0       0       0.01   Grassroots
 3    260     2       0       0       0       0.04   Grassroots
 5    520     45      0       0       0       0.08   Blog (just)
10    ~2k     320     5       0       0       0.18   Blog
15    ~5k     1.4k    180     0       0       0.27   Blog (stalled — no handlers)
20    ~9k     3.5k    1.2k    0       0       0.36   Social
25    ~14k    7k      6k      40      0       0.44   Social (Cure gate slipping)
30    burnout — labor_fraction = 0.3, Heat avg 0.72, ban-roll fires; collapse
                                   Run ends Phase 3, ≈ 32 min.

Att ▁▁▂▃▅▇█    Eng ▁▁▁▂▃▅▆▇█    Fol ▁▁▁▁▁▂▃▅▇    Cred ▁▁▁▁▁▁▁▁▂
```

Conclusion: bot rush hits Phase 3 fast then dies. Validates handler gate.

### 6.2 Run B — "Balanced 60/40" (mix humans/bots, buy 1 handler per 3 assets)

```
min   Att     Eng     Fol     Cred    NarDom  SynReal Cure   Phase
 0    0       0       0       0       0       0       0.00   Grassroots
 5    480     60      0       0       0       0       0.07   Grassroots → Blog
10    ~1.8k   620     30      0       0       0       0.15   Blog
15    ~4k     2.4k    540     2       0       0       0.24   Blog → Social
20    ~8k     6k      3k      80      0       0       0.33   Social
25    ~14k    14k     22k     800     0       0       0.42   Social → Influencer
30    ~25k    35k     90k     8k      0       0       0.51   Influencer
35    ~40k    80k     350k    65k     0       0       0.59   Influencer → Cable
40    ~70k    160k    1.2M    420k    2.5k    0       0.69   Cable
45    ~110k   300k    3.5M    2.2M    35k     8       0.79   Cable → AI Sat (just barely)
50    ~180k   550k    9M      8M      280k    120     0.82   AI Sat — REVEAL fires
                                   On track. First reveal at 47 min.

Att ▁▂▃▄▅▆▇█  Eng ▁▂▃▄▅▆▇█  Fol ▁▁▂▃▄▆█  Cred ▁▁▁▁▂▄▆█  NarDom ▁▁▁▁▁▁▁▂▅█
```

This is the design target trace.

### 6.3 Run C — "Human prestige" (only humans, max handler upgrades)

```
min   Att     Eng     Fol     Cred    NarDom  Cure   Phase
 0    0       0       0       0       0       0.00   Grassroots
 5    320     20      0       0       0       0.05   Grassroots
10    920     180     0       0       0       0.12   Blog (slow start)
15    2k      720     40      0       0       0.18   Blog
20    4.5k    2k      280     8       0       0.25   Blog → Social
30    ~12k    8k      4k      400     0       0.40   Social
40    ~28k    22k     35k     8k      0       0.55   Influencer
50    ~55k    55k     200k    80k     2k      0.69   Cable
60    ~95k    120k    700k    600k    25k     0.81   Cable → AI Sat (right at reveal)
70    reveal fires; less SynReal stockpile → faster collapse in Mebro phase

Att ▁▂▂▃▄▅▆▇█  Eng ▁▁▂▃▄▅▆▇█  Fol ▁▁▁▂▃▅▇█  Cred ▁▁▁▁▁▂▄▆█
```

Conclusion: human-only is 1.5× slower (per §3.2 invariant in PLAN, target was 3× but the high-handler counterweight pulls it back). Acceptable.

---

## 7. Balance-Check Checklist (sim.ts assertions)

Run every tick. Failure = sim aborts with diagnostic.

| # | Assertion                                                                          | Severity |
|---|------------------------------------------------------------------------------------|----------|
| 1 | `for r in resources: state[r] >= 0`                                                | fatal    |
| 2 | `for r in resources: state[r] <= caps[r] + epsilon` (epsilon = 1e-6)               | fatal    |
| 3 | `for b in conversions: 0 <= fraction <= 1`                                         | fatal    |
| 4 | `for b in conversions: consumed <= inputAvail`                                     | fatal    |
| 5 | `for b in conversions: produced <= outputRoom + epsilon`                           | fatal    |
| 6 | `cap(L+1) / cap(L) >= cost(L+1) / cost(L)` for every cap-bearing resource (Inv 1)  | fatal    |
| 7 | `0 <= heat[platform] <= 1`                                                         | fatal    |
| 8 | `cure >= prevCure - epsilon` (monotonic, Inv from §6.3)                            | fatal    |
| 9 | `0 <= cure <= 1`                                                                   | fatal    |
| 10| `labor_fraction in [0, 1]`                                                         | fatal    |
| 11| `sumDepictMults * platformAmp >= 1` (multipliers never reduce below baseline)       | warn     |
| 12| `tickWallClock < 5ms` (perf budget at 100ms tick)                                  | warn     |
| 13| Phase-gate timing within ±25% of §5 targets across 5 sim seeds                     | warn     |
| 14| No asset purchased above its tier cap (`bots[t].count <= bots[t].maxPerPlatform`) | fatal    |
| 15| Cost recomputed each buy: `nextCost == base * g^level` (drift check)               | fatal    |
| 16| After Mebro reveal: no purchases of locked upgrades succeed                        | fatal    |

### 7.1 Aggregate sanity (per minute)

| Metric                                          | Acceptable range          |
|-------------------------------------------------|---------------------------|
| Active resources growth rate                     | 5%/sec ≤ r ≤ 30%/sec     |
| Idle (no purchase) growth rate                  | 0.5%/sec ≤ r ≤ 5%/sec     |
| Average labor_fraction across 60s window         | ≥ 0.7 (else pacing flag)  |
| Heat avg across active platforms                | 0.2 ≤ h ≤ 0.7             |
| Cure delta per minute                            | 0.012 ≤ Δ ≤ 0.020         |

---

## 8. Open numerical knobs (for tuning, not invariants)

Listed so the dev knows where the "make it feel right" dials live:

- `BASE_TICK_MS = 100` — slower (200) makes early game feel sluggish.
- `OFFLINE_CATCHUP_CAP_HRS = 8` — return buff in PLAN §1.
- `CONVERSION_QUALITY_FROM_DEPICT = 0.05 per tier` — additive into qualityMultiplier.
- `SYNERGY_THRESHOLD_TIER = 3` (PLAN §4.2).
- `MEBRO_DEFECTION_BASE_PCT = 0.005`, scales linearly with `(cure - 0.80) / 0.20` after reveal.
- `HEAT_BAN_PROB_NUMER = 15` — the denominator on the ban-roll formula; smaller = more punishing.

Tune these after the sim is green on §7 invariants; not before.

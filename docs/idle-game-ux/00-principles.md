# 00 — Synthesized Idle-Game UX Principles

Cross-source consensus checklist for game UX, focused on idle/incremental games. Every rule supported by at least two of the sources in `sources/`.

For per-source detail, see those files.

---

## 1. Universal usability heuristics (NN/G applied)

The 10 Nielsen heuristics, all relevant:

| # | Heuristic | Idle-game application |
|---|---|---|
| 1 | Visibility of system status | Resource rates, charge bars, multiplier breakdowns, ETA labels |
| 2 | Match real world | Asset names mirror documented real things (Sock Puppet, Doppelganger) |
| 3 | User control & freedom | Confirm before destructive actions (prestige, reset); reversible bulk-buy |
| 4 | Consistency | Same currency color everywhere, same affordance for buy buttons |
| 5 | Error prevention | Disable unaffordable buttons; default to "cancel" on destructive prompts |
| 6 | Recognition not recall | Live cost on every card; +N badge in bulk-buy; visible milestones |
| 7 | Flexibility | Bulk-buy (×1/×10/×100/Max) as expert accelerators |
| 8 | Aesthetic & minimalist | Progressive disclosure; tooltips for detail; collapse mastered content |
| 9 | Error recognition | "Not enough X — need Y more" rather than silent failure |
| 10 | Help & documentation | Precedent text on hover; codex panel; glossary discoverable but not pushy |

---

## 2. Visual hierarchy — the six tools

When designing any new surface, deliberately apply:

| Tool | Use it for | Anti-pattern |
|---|---|---|
| **Size** | Mark primary actions visibly larger than secondary | Everything the same size = no hierarchy |
| **Color** | Saturated = "look here" / muted = "background" | Every element saturated = noise |
| **Contrast** | Bold/dark = important; thin/light = supporting | Equal contrast = visual mush |
| **Alignment** | Grid alignment for related; off-axis for "stop, this is different" | Random placement = chaos |
| **Repetition** | Same treatment = same kind of action | Different treatments for same action = confusion |
| **White space** | Around primary elements, amplifies importance | Dense everywhere = nothing stands out |

Plus the **law of proximity** (Gestalt): close-together items are perceived as a group. Card-based UIs exploit this — everything in a card is one logical unit.

---

## 3. Affordances — six types

What signals "this can be interacted with":

| Type | Signal | Where we use it |
|---|---|---|
| **Explicit** | Visible label + button styling | "POST · +260 att" |
| **Hidden** | Reveals on hover/click | Precedent rotation on card click |
| **Pattern** | Learned convention (logo top-left, etc.) | Topbar layout, reset bottom-right |
| **Metaphorical** | Real-world object → digital action | ★ prestige, ▶ event pulse, ⚠ burn |
| **Negative** | "Not available" cue (greyed out) | Disabled buy buttons |
| **False** ⚠ | Looks clickable, isn't | **Avoid** — audit for accidents |

### Four button states every interactive element needs
- **Idle** — at rest, available
- **Hover** — about to be clicked (desktop) or visibly highlighted
- **Active/pressed** — being clicked right now
- **Disabled** — not available, reason ideally implied

Skipping hover or active states weakens the affordance.

---

## 4. Visual feedback (juice)

### The good
Every player action produces a clear response that is:
- **Immediate** — < 50ms to feel instantaneous (per source 06)
- **Proportional** — bigger action ⇒ bigger feedback
- **Multi-sensory** — visual + audio + haptic if available
- **Distinct** — different actions have distinct signatures

### Numeric specs for click feedback
- **Scale pulse:** 100–150ms, easeOutBack, 1.0× → 1.1× → 1.0×
- **Number-pop:** brief 1.3× scale on incrementing resource counter
- **Color flash:** ~100ms overlay on click target
- **Particle burst:** 5–10 particles fading on rise/spread (optional)
- **Click response:** < 50ms
- **Screen shake:** 100–300ms, ONLY for significant impacts

### The juice problem (source 05)
Feedback should **amplify** what the mechanic is doing, not **lie about** it. Anti-patterns:
- Same juice for every action regardless of weight (numbs the player)
- Spectacular juice masking weak mechanics ("false agency")
- Homogenized juice indistinguishable from other games

### Rule of thumb
Match feedback intensity to action significance:
- Routine buy → subtle (border highlight)
- Big buy / completion → moderate (scale pulse, number-pop)
- Milestone / phase transition → big (banner, animation, audio if available)
- Prestige / reveal → maximum (full-screen treatment)

---

## 5. Progressive disclosure (UXPin, NN/G)

> Show only what the player needs at any given moment.

### Patterns
- **Hidden until earned** — content invisible until prerequisite is in reach
- **Teased before earned** — `???` placeholder appears at half-threshold (we do this)
- **Always-visible essentials** — resources, rate, current state on topbar
- **Contextual reveals** — extra detail on hover, click, or after completion
- **Collapsible after mastered** — once a tier is maxed, it can sink in the visual hierarchy

### Onboarding rule
Teach mechanics **through play**, not text walls. Walk-through tutorials should be:
- Progressive (one concept at a time)
- Interactive (do, not read)
- Skippable (don't trap experienced players)
- Revisitable (help menus / contextual hints)

---

## 6. HUD layout — the 80/20 attention rule

> Players direct ~80% of visual attention to the gameplay area, leaving ~20% for HUD.

### Implications
- Edges and corners are natural HUD homes (peripheral vision)
- Always-on metrics belong in the topbar, footer, or fixed side strips
- Inline / center content gets the primary focus when active
- Every HUD element added subtracts from another's attention budget — be ruthless

### Color paired with text/icon
> Never use color as the sole carrier of information.

Pair colored bars with text labels, icons, or patterns. Accessibility imperative (colorblind players) AND clarity imperative (in high-cognitive-load moments, color alone is too subtle).

---

## 7. Idle-incremental specific conventions

See `sources/08-idle-incremental-ui-conventions.md` for full detail. These are genre-tropes players expect; absence is felt.

| Pattern | Why it works | Our use |
|---|---|---|
| **Number formatting that scales** (K→M→B→T→…→scientific) | Stays legible from 1 to 1e308 | Suffix through `B`; need `Qa`, `Qi`, scientific for late game |
| **Welcome-back / offline-progress modal** | Reduces "did I miss anything" anxiety; rewards return | We have offline math + return buff, but no ceremonial modal |
| **Always-glanceable production rate** in topbar | Affirms "game is alive" | ✓ |
| **"What should I buy next?" affordance** (highlight cheapest affordable / ROI display) | Reduces decision paralysis mid-late game | Have affordability bar; no ROI / next-buy highlight |
| **Progressive UI emergence** (one button → minimal HUD → full mature UI) | New players don't bounce; mature players still have richness | ✓ |
| **Tabs / collapsibles at mature state** (50+ buyables breaks single scroll) | Keeps mature UI legible | Need to plan tabs for AI Saturation era |
| **Save-state indicator** ("saved 3s ago") | Players want to know progress is safe | Missing |
| **Prestige-loop ceremony** (confirm + animated reward + transition) | The emotional peak of an idle game | Basic `confirm()` only; not ceremonial |
| **Achievement / completion grid** as a panel/tab | Idle players are completionists | Missing — surfaces only in log |
| **Icons + colors for currencies** (not color alone) | Multi-modal info; accessibility | Color only; need icons |
| **Multi-modal info density** (value + rate + fill + ETA) on each meter | High legibility in small space | val/cap + rate; ETA underused |
| **"Doing nothing is valid"** affordance | Players from action games need permission | Charge bars + auto-poster communicate this |
| **The "feels alive" heuristic** (something always changing) | Retention | Rate updates + ticker + events ✓ |
| **Resource-pool color economy** | Visual differentiation between currencies | ✓ but icons missing |

---

## 8. Anti-patterns — how UX failures manifest in playtesting

| Anti-pattern | Symptom |
|---|---|
| **False affordance** | Player clicks something that "looks clickable" and nothing happens — frustrating, breaks trust |
| **Missing button states** (no hover, no pressed) | Buttons feel unresponsive even when they work |
| **No visible state change on action** | Player not sure if their click registered → spam-clicks |
| **Equal visual weight everywhere** | "I don't know where to look first" — analysis paralysis |
| **Hidden affordances without discovery cue** | Player never finds the feature |
| **Color as sole information carrier** | Colorblind players blocked; everyone has slower scan time |
| **Tooltips that obscure the thing they're tooltipping** | Player has to dismiss to verify info |
| **Modal / dialog for routine confirmations** | Click fatigue — confirms degrade fast when overused |
| **Juice without mechanical depth** | Spectacle masking nothing real → player notices the emptiness |
| **Progressive disclosure that NEVER discloses** | Player thinks the feature is locked or broken |
| **HUD elements competing with each other** | 20% attention budget exceeded; player misses important info |
| **No feedback on long-running actions** | Player thinks the game froze |

---

## 9. Consensus checklist (use this when evaluating any UI surface)

1. ☐ Every interactive element has visible **idle**, **hover**, **active**, and **disabled** states
2. ☐ Color is paired with text/icon (never sole carrier)
3. ☐ Primary actions have higher visual weight than secondary (size, contrast, position)
4. ☐ Disabled buttons indicate **why** (or at least pair with cost/state showing the reason)
5. ☐ Click feedback fires within ~100ms (button visible state change, optional scale pulse)
6. ☐ Resource changes have a visible cue (number-pop or fill-bar movement)
7. ☐ The 80/20 attention budget is respected — HUD doesn't crowd gameplay area
8. ☐ Progressive disclosure: don't show what isn't yet relevant
9. ☐ Tooltips/precedents discoverable but not obstructive
10. ☐ Juice intensity matches action significance (don't shake the screen for routine buys)
11. ☐ Achievements/milestones tracked and viewable
12. ☐ Bulk operations have an "expert mode" (e.g. Max button)
13. ☐ Destructive actions confirm before commit; default = cancel
14. ☐ Errors named in plain language with constructive next-step

# Idle-Incremental-Specific UI Conventions

**Source:** Synthesized from canonical idle games (Cookie Clicker, AdVenture Capitalist, Clicker Heroes, Antimatter Dimensions, Realm Grinder, Egg Inc., Universal Paperclips) + Pecorella's design talks (per math KB sources 01–04) + community-doc consensus (idle-game subreddit best-practices threads, Reddit r/incremental_games sticky guides).
**One-line summary:** UI patterns and conventions that are specific to idle/incremental games, beyond general UX heuristics. These are the genre-tropes players expect.

---

## 1. Number formatting at scale

Idle games hit astronomical numbers fast. Display must remain legible from 1 to 1e308 and beyond.

### Common conventions
| Range | Format style |
|---|---|
| 0 – 999 | Raw integer (1, 234, 999) |
| 1K – 999K | One decimal, suffixed (`1.2K`, `847.5K`) |
| 1M – 999M | Same shape, suffixed (`4.5M`) |
| 1B – 999B | (`1.3B`) |
| 1T+ | Either continue with named suffixes (`Qa`, `Qi`, `Sx`, `Sp`, `Oc`, `No`, `Dc`) or switch to scientific notation (`1.42e15`) |
| Beyond `1e15` | Almost always scientific |

### Switching points
- Cookie Clicker: named suffixes through "Decillion" (1e33), then scientific
- AdVenture Capitalist: named suffixes deep into "Quadragintillion" (1e123) before scientific
- Antimatter Dimensions: scientific from very early; expects players who like the math

### Designer call
Pick a convention early and commit. Mid-game format-style switches confuse players. Three sig figs is usually right; players get vertigo above that without value.

### Our use
We use `K / M / B` for now (`fmt()` in `lib/format.ts`). Need to extend before late game.

---

## 2. Offline-progress / return-to-game UX

Players expect:
- When they come back after time away, the game has continued (at reduced efficiency)
- A "welcome back" modal or banner showing what happened while gone

### Canonical pattern
> "While you were gone (3h 17min), you earned 1.2M attention, 4.5K engagement, and 2 events fired."

Two flavors:
1. **Full simulation** (Cookie Clicker, AdVenture Capitalist): every offline second computed
2. **Capped+discounted** (most idle games): "you get X% of what you would have, capped at Y hours"

We use the second pattern (`offline.ts` — 25% efficiency, 1hr cap, return buff above 30min). Buff visibility is decent (topbar banner) but the "welcome back" moment isn't ceremonial.

### Recommendation
A one-time banner / modal on return: "While you were gone (47min): +12.4K att, +800 eng. Return buff: ×2 for 5min."

---

## 3. The "always-glanceable" rate display

Every successful idle game shows production rate **at all times** in peripheral vision. The number changes affirm "the system is alive" even when nothing else is happening.

### Common placement
- Top of screen, fixed position
- Always shows current rate ("+1.2K/sec")
- Often updates with subtle animation (number-pop, fill-bar)

### Our use
Topbar resource meters show val/cap + rate. Rate text is muted; could be more emphatic.

---

## 4. The "what should I buy next?" affordance

Mid-late game, idle games offer dozens of buyable items. Players need help knowing the next best buy.

### Common patterns
- **Highlight cheapest affordable** (Cookie Clicker) — the next thing you can afford is visually emphasized
- **ROI ranking** (Universal Paperclips) — show "payback in 12s" next to cost
- **Sort by efficiency** (some) — buy options auto-sort by cost/output ratio
- **"Recommended" tag** (Egg Inc.) — a small star or highlight marks the next strategic priority

### Our use
We have the affordability fill bar (2px) but no ranking. Adding an inline ROI hint or sort-by-best toggle is a Pecorella-cited best practice.

---

## 5. Progressive UI emergence (more than just disclosure)

Idle games start MINIMAL. One button. Then add an element. Then another. Then another.

This isn't just "hide locked content" — it's a deliberate UI-growth choreography.

### Canonical example: Universal Paperclips
- Minute 1: a Make Paperclip button. Nothing else.
- Minute 3: a Sell Paperclips slider appears
- Minute 5: Auto-clippers buy button
- Minute 10: research tree
- ... 4 hours in: probe-fleet UI
- ... 12 hours in: cosmic dyson sphere

### Our use
We do this well: t=0 is sock-puppet + attention meter only. Each reveal threshold is paced.

### Anti-pattern caution
If the player can't tell what's coming, the early game can feel sparse. Tease cards (`???` placeholders) are the standard mitigation. We have this.

---

## 6. Tab/section organization at mature state

Once a game has 50+ buyables, single-scroll lists break. Mature idle games use:
- **Tabs by era / category** (Antimatter Dimensions: Dimensions / Tickspeed / Galaxies / Infinity / Eternity / Reality)
- **Collapsible sections** (Cookie Clicker: Buildings / Upgrades collapsed by default)
- **Modal "research labs"** (Clicker Heroes: Hero Souls / Ancients tabs)

Our 3-column layout works through Cable era but probably needs tabs/collapse mechanism by AI Saturation era when there are 30+ assets, 18+ upgrades, 8 patrons, etc.

---

## 7. Save-state visibility

Players want to know their progress is safe. Most idle games show:
- "Last saved 3s ago" — quiet text somewhere persistent
- Or a save icon that briefly highlights when save fires
- Or both

### Our use
We save every 5s but never show this. Should add a small indicator.

---

## 8. Prestige-loop ceremony

Prestige is the emotional peak of any incremental game. The act of resetting + banking permanent currency NEEDS a moment.

### Canonical pattern
- **Confirmation modal** with stats: "You will gain X prestige currency. Reset everything else?"
- **Animated reward** after confirm: number animation, sound, visual celebration
- **Brief "transition state"** — slate clears, new run begins, log notes the prestige
- **Permanent prestige tree visible** post-reset, showing what you've banked

### Our use
We have a confirm dialog (`confirm()` browser-native). Adequate but not ceremonial. The reset is invisible (page reload). No "you just prestiged with N points, total now N" celebration.

---

## 9. Achievement / completion grid

Idle players are completionists. They want a viewable index of accomplishments.

### Canonical pattern
- Tab or modal showing all achievements
- Earned ones highlighted; locked ones grayed but with hint text
- Per-achievement progress bars where applicable
- Subtle indicator on topbar when a new achievement is earned

### Our use
We have achievements but no panel. They surface in the log as `★ Achievement: ...` and then scroll out. Permanent UI surface is a clear gap.

---

## 10. Icons + colors for currencies (not color alone)

Every successful idle game pairs currency colors with icons:
- 🍪 cookies (Cookie Clicker)
- 💰 money (AdVenture Capitalist)
- 💎 souls (Clicker Heroes)
- ⏳ time / ∞ infinity (Antimatter Dimensions)

We use color-only currency identification. Adding small monochrome icons or unicode glyphs (👁 attention / 💬 engagement / 👥 followers / 🎙 credibility / 📰 narrative / 🤖 synthetic) would strengthen the affordance per general-UX rule "never use color as sole carrier."

---

## 11. Cost display formats — three conventions

Idle games converge on one of:
- **Suffix** — "5.2K att" (Cookie Clicker, AdCap)
- **Comma-grouped** — "5,200 att" (rare in idle games after early game)
- **Scientific** — "5.20e3 att" (Antimatter Dimensions late game)

Hybrid is common: low values comma-grouped, mid values suffixed, high values scientific. The transition should happen at consistent thresholds so the player learns the mapping.

We use suffix end-to-end. Need to extend `fmt()` to handle suffixes beyond `B` before any resource hits trillions.

---

## 12. Multi-modal information density

The pattern: idle games achieve high information density without overwhelm by combining:
- **Numeric value** (the count)
- **Rate** (per second)
- **Fill bar** (current vs cap)
- **ETA** (time to full or to a milestone)

All four on a single resource meter, all glanceable. Players learn to scan them in milliseconds.

### Our use
We show val/cap + rate. We have ETA-to-cap in `etaToCap()` but only render it on rare occasions. Could be more universally displayed.

---

## 13. The "do nothing" affordance

Sounds strange but: idle games must communicate that **doing nothing is a valid play strategy.** Players from action-game backgrounds aren't used to this.

### Pattern
- Visible progress while not interacting (numbers climbing in topbar)
- Charge bars filling on their own
- Auto-poster / auto-buy mechanics with clear feedback ("Auto-Poster firing every 1.5s")
- "Offline progress" mechanic explicitly documented

We have the first three. The fourth needs the welcome-back modal from §2.

---

## 14. Resource-pool "color economy"

When multiple currencies coexist, players appreciate visual differentiation:
- Each currency has a distinct color
- Currency conversion (e.g. attention → engagement) is shown as a flow visual
- The "richer" currency (e.g. Followers vs Attention) often gets a deeper or warmer color

### Our use
Color-coded per currency. ✓ Each currency has distinct tint. Could be enriched with conversion-flow visuals when conversions ship.

---

## 15. The "feels alive" heuristic

A subtle but real pattern: idle games look "alive" when:
- Numbers ALWAYS change (even slowly)
- At least one fill bar is in motion at any moment
- Random events fire periodically
- Headlines/text rotate (ticker, log)

If you can leave the game for 5 seconds and nothing visibly changes, retention drops.

We have: rate updates, charge bars, random events every 45-120s, ticker, log. ✓

---

## Anti-patterns specific to idle games

| Anti-pattern | Symptom |
|---|---|
| **Stat overload at game start** | New player faces 20 metrics, doesn't know what matters → bounce |
| **No way to know what's locked vs what doesn't exist** | "Is there more game?" anxiety |
| **Punitive offline penalty** (no offline progress at all) | Player feels punished for not playing 24/7 |
| **Prestige with no permanent UI tracking** | "Why did I just reset?" — value of prestige lost |
| **Production rate doesn't show what's contributing** | Number changes don't feel earned |
| **Multiple currencies but no conversion path** | Resources feel arbitrary, disconnected |
| **Number formatting that doesn't scale** | "Attention: Infinity" reached after 30 min |
| **Visual hierarchy disappears at scale** | Wall of cards by hour 4; player overwhelmed |
| **No "what should I save up for?" affordance** | Player wanders or stops |
| **Background-tab incompatibility** | Game pauses or loses state in inactive tab |

---

## Cross-reference

Many of these connect back to general principles in `00-principles.md`:
- §3 (affordances) feeds §4 (next-buy affordance) and §10 (icon+color)
- §5 (progressive disclosure) is the foundation for §5 here (progressive UI emergence)
- §7 (HUD layout) directly informs §3 here (always-glanceable rate)
- §6 (anti-patterns) overlaps significantly with the genre-specific anti-patterns above

The genre patterns aren't OPPOSED to general UX heuristics — they're the **specific applications** that converged through 15+ years of idle-game iteration.

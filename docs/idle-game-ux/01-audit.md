# 01 — Audit: Playbook UX vs. Synthesized UX Principles

Audit against [00-principles.md](./00-principles.md). Diagnostic — no code changes proposed in the audit itself; findings are ordered for action.

## Status legend

- 🟢 **Addressed** — code change merged. Date + commit reference.
- 🟡 **Partial** — some sub-points fixed; remaining noted.
- 🔴 **Open** — not yet touched.

| Finding | Severity | Status |
|---|---|---|
| UX-1 — Missing distinct hover/active button states | Medium | 🔴 |
| UX-2 — No animation on POST click or resource increment | Medium | 🔴 |
| UX-3 — Card density mid-late game has no internal hierarchy | High | 🔴 |
| UX-4 — Disabled buttons don't say WHY (no error-recognition text) | High | 🔴 |
| UX-5 — No audio feedback layer | Low | 🔴 (defer; may stay) |
| UX-6 — Precedent text border-left could read as false affordance | Low | 🔴 |
| UX-7 — Achievement progress not visible | Medium | 🔴 |
| UX-8 — No multiplier-stack inspector exposed in UI (despite backend ready) | Medium | 🔴 |
| UX-9 — No "next milestone" indicator on assets | Medium | 🔴 |
| UX-10 — Ticker scrolls but doesn't pause or expand on click | Low | 🔴 |
| UX-11 — Number formatting maxes out at `B`; will hit `Infinity` mid-late game | High (timed) | 🔴 |
| UX-12 — No welcome-back / offline-progress modal | Medium | 🔴 |
| UX-13 — Save-state indicator absent | Low | 🔴 |
| UX-14 — Prestige flow is `confirm()` + reload; not ceremonial | Medium | 🔴 |
| UX-15 — Currencies are color-only; no icons | Low | 🔴 |
| UX-16 — No tabs/collapsibles planned for mature-state density | High (timed) | 🔴 |
| UX-17 — Heat mechanic was binary burn with random lockout | Critical | 🟢 Addressed (this push) |

---

## Findings

### UX-1 — Buttons missing distinct hover and active states
**Source principle:** §3 (affordances — four button states needed)
**Location:** `src/App.svelte` — `.card`, `.node`, `.post-platform`, `.bulk-btn`, `.ghost`
**Current:** Idle and disabled states are defined. Hover state is partial (border-color change on `.card:hover`, but no scale/shadow). No pressed/active state on any button.
**Symptom:** Buttons feel slightly "dead" — when you click, nothing visibly responds during the press. The card hover is subtle and easy to miss on a fast pass.
**Proposed fix:** Add `:active` state for every interactive element. Typically `transform: scale(0.98)` on press, 80ms transition. Strengthen hover with a slight shadow or border thickness change.

### UX-2 — No animation on POST click or resource increment
**Source principle:** §4 (visual feedback / juice)
**Location:** `src/App.svelte` — POST button click handler; resource meters in topbar
**Current:** POST click resets charge bar but no visible "fired" animation. Resource numbers in the topbar increment smoothly via tick updates but without any pop or highlight.
**Symptom:** Posting feels mechanical, not satisfying. Resource accumulation feels like watching paint — the +N happens but isn't celebrated.
**Proposed fix:**
- POST click: 100–150ms scale pulse on the button (1.0 → 1.1 → 1.0, easeOutBack)
- Resource increment: brief 1.3× scale-pop on the value text on each large increment (>1% of cap delta), CSS-only via `transition-delay` reset trick
- Optional: floating `+N att` text rising from the POST button

### UX-3 — Card density mid-late game has no internal hierarchy
**Source principle:** §2 (visual hierarchy — every element shouldn't have equal weight)
**Location:** `src/App.svelte` — left column when projects + synergies + patrons all visible simultaneously
**Current:** All cards have similar visual treatment. Differentiated only by section header + a subtle border color. No size or weight distinction between "the very next thing the player should consider" vs "deep mastery content."
**Symptom:** Player faces a wall of similarly-styled cards. Analysis paralysis. Doesn't know where to look first.
**Proposed fix:**
- Sort each section by "what's most actionable right now" (cheapest affordable on top; teased at top in priority order)
- Make the topmost actionable card visibly larger (e.g. 1.1× scale, brighter border)
- Collapse mastered/maxed content behind a "show all" toggle

### UX-4 — Disabled buttons don't communicate WHY
**Source principle:** §1 (heuristic 9 — error recognition); §5 (NN/G)
**Location:** All buy buttons
**Current:** Buttons turn opaque (~55%) when unaffordable. Cursor changes to not-allowed. No text saying "need X more attention."
**Symptom:** Player wonders "why can't I click this?" or doesn't realize it's unaffordable; assumes a bug.
**Proposed fix:**
- When disabled-due-to-cost, show the shortfall in the button area: "Need 240 more att"
- When disabled-due-to-condition (e.g. tier-2 not yet visible), show the requirement: "Reach Blog era"
- Affordability fill bar already conveys the "how close are you" — augment with text

### UX-5 — No audio feedback layer
**Source principle:** §4 (multi-sensory feedback); §7 (idle conventions)
**Location:** entire app
**Current:** Silent.
**Symptom:** Feedback is visual-only; reduces the satisfying click feel. Defensible for idle (often runs in background) but worth a deliberate decision.
**Proposed fix:**
- Decision-level: do we want sound? Idle games are split. Some (Cookie Clicker) have prominent audio; others (Adventure Capitalist mobile, Antimatter Dimensions) are mostly silent.
- If yes: small library of clicks, +N pings, prestige fanfare; settings panel mute toggle (default off so background-tab play doesn't disturb).
- If no: explicitly note it in the design doc. Don't half-ship sound.

### UX-6 — Precedent text border-left could read as false affordance
**Source principle:** §3 (false affordances — avoid)
**Location:** `.precedent` class — accent-color border-left stripe
**Current:** Precedent text on cards has a 2px accent stripe on the left, similar to "callout" UI in many web apps that often is clickable.
**Symptom:** Player might try to click the precedent text expecting it to open a codex entry or expand. Currently clicking the parent card just rotates to the next precedent.
**Proposed fix:**
- Either make the precedent visibly clickable (cursor pointer on hover, expand-on-click for full text)
- Or make it visibly inert (drop the accent stripe; just italic muted text)
- Click-to-rotate the precedent is already a hidden affordance — could be more discoverable with a small `[N/M]` counter highlight

### UX-7 — Achievement progress not visible
**Source principle:** §7 (idle conventions — milestones tracked and viewable)
**Location:** Achievement system exists in `src/game/core/achievements.ts` but no UI surface for it
**Current:** Achievements fire as log entries with `★ Achievement: ...`. After they scroll out of the log, no way to review what you've earned or how close to the next.
**Symptom:** Players are completionists. They want a goal grid. Without it, achievement feedback feels ephemeral.
**Proposed fix:**
- Add an Achievements panel/modal accessible from topbar
- Show: earned (with date/run), progress toward next, all locked ones with hints
- Per-asset milestone bars on cards: "Sock Puppet: 47/100 toward Hundred Hands"

### UX-8 — Multiplier-stack breakdown not exposed in UI
**Source principle:** §1 (heuristic 1 — visibility of system status)
**Location:** `src/game/core/production.ts` — `computeMultiplierBreakdown()` exists, returns full breakdown with named sources. No UI consumes it.
**Current:** The math is already done — every multiplier source per resource is tracked by name. But nothing in the UI shows the player "your attention is ×4.5 from: emotional-1×30 (+45%) + First Viral Moment ×2 + Mar-a-Lago Faction +20%".
**Symptom:** Player sees the topbar rate jump after buying a patron but doesn't understand the math. They learn through experimentation rather than transparency.
**Proposed fix:**
- Hover/click on the rate text in the topbar → tooltip or popover with the full breakdown
- Format: "+260 att/s = base 200 × ×1.45 emotional × ×2.0 Viral Moment × ..."

### UX-9 — No "next milestone" indicator on assets
**Source principle:** §5 (progressive disclosure — teased before earned); §7 (idle conventions)
**Location:** Asset cards
**Current:** Owning N sock puppets gives a milestone multiplier (per UX audit Finding 4 ship), but the next milestone threshold isn't visible to the player.
**Symptom:** Player doesn't know they're 47/100 toward Hundred Hands. Doesn't know that buying 53 more puppets triggers a +5% attention buff.
**Proposed fix:** Per-asset card, show "next milestone: 100 sock puppets (47/100)" or similar progress chip. Could also visualize on the buy button: "+53 needed for next bonus."

### UX-10 — Ticker scrolls but doesn't pause / expand on click
**Source principle:** §1 (heuristic 1, 8 — visibility, minimalism); §5 (progressive disclosure)
**Location:** ticker strip below topbar
**Current:** Scrolls right-to-left, displays fact + source. No interactivity. If you blink, you miss it.
**Symptom:** Real-world precedents are educational gold but they fly by. Player who wants to read carefully can't pause.
**Proposed fix:**
- Click ticker to pause scroll
- Click again to resume
- Maybe also click to expand into a "read more" tooltip with the full source/link

---

## Summary by severity

### High
- **UX-3** card density / no internal hierarchy mid-late game
- **UX-4** disabled buttons don't say why

### Medium
- **UX-1** missing hover/active button states
- **UX-2** no click/increment animation
- **UX-7** achievement progress not visible
- **UX-8** multiplier-stack inspector not exposed
- **UX-9** next-milestone indicator missing

### Low
- **UX-5** no audio (defer decision)
- **UX-6** false-affordance risk on precedent stripe
- **UX-10** ticker not interactive

---

## Suggested order

The recommended order, similar shape to the math audit:

1. **UX-4** (disabled-button reasons) — single biggest "why isn't this working" pain point for new players. Cheap fix.
2. **UX-1 + UX-2** as a pair — proper button states + click animation. Together they make the entire UI feel ~30% more responsive. Cheap and high-impact.
3. **UX-8** (multiplier-stack inspector) — the backend is already done. Just needs a hover/popover surface.
4. **UX-3** (card hierarchy / sort by actionable) — medium effort, big payoff for late-game readability.
5. **UX-9 + UX-7** (achievement progress + next-milestone) — feeds the completionist player.
6. **UX-6** (precedent stripe) — one-line CSS audit.
7. **UX-10** (ticker pause/expand) — small JS, big educational value.
8. **UX-5** (audio) — decide yes/no first; then either ship a coherent layer or document the deliberate silence.

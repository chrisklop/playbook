# SEELE AI Game Maker — *How We Build Clicker Game UI*

**Source:** https://www.seeles.ai/resources/blogs/scratch-clicker-game-ui
**One-line summary:** Specific numeric recommendations (timings, scale factors, opacity levels) for clicker-game feedback. The most concrete of any UX source.

---

## Click feedback animation specs

### Scale pulse on click target
- **Duration:** 100–150ms
- **Easing:** `easeOutBack`
- **Scale factor:** scale to 1.1× then back to 1.0×

The signature "this thing got tapped" feedback. Should feel like a button physically depressing.

### Response time requirements
- **Click response:** < 50ms to feel instantaneous
- **Number updates:** < 50ms for perceived progress
- **Audio latency:** < 30ms for tactile sensation

Beyond ~100ms feels laggy regardless of frame rate.

---

## Number-pop animation
> "Resource counter briefly scale[s] to 1.3× when incrementing."

Draws the eye to the change. Especially valuable in idle games where most of the action is numbers ticking up — without animation, players miss the +N that just landed.

---

## Color flash & visual effects
- **Color overlay:** brief flash on click target, duration ~100ms
- **Particle burst:** 5–10 particles spawn at click position, fade as they rise/spread
- **Screen shake:** 100–200ms duration for large clicks (juice — see source 05 for when this is appropriate)

---

## Button state styling — the explicit rules

| State | Style |
|---|---|
| **Affordable** | Bright colors, glowing borders, enabled |
| **Unaffordable** | Greyed out, opacity 60%, disabled |
| **Partial afford** | Yellow/warning state at 50–99% of required resources |

The "partial afford" state is the one most idle games miss. We have an affordability fill bar (2px at bottom of card) which is a softer version of this — readable but not as forceful.

---

## Performance constraints

GPU-accelerated CSS transforms (`scale`, `translate`) instead of position changes — avoids reflow.

Particle limits: 50–100 on mobile, 200–300 on desktop. Beyond that, frame rate drops below 60fps and the juice starts feeling sluggish (which is worse than no juice).

---

## How this maps to our UI

| Spec | Our current state |
|---|---|
| Scale pulse on POST click | ❌ Missing |
| Number-pop on resource increment | ❌ Missing |
| Color flash | ❌ Missing |
| Particle burst | ❌ Missing — not necessarily needed for idle, but a small `+N att` floater on POST would help |
| Affordable button styling | ✓ Done (via affordability fill bar + opacity) |
| Partial-afford signal | ✓ Done (the 2px fill bar) |
| Click response < 50ms | ✓ Pure-CSS state transitions; near-instant |
| GPU-accelerated transforms | ✓ Using CSS opacity, gradients, no position animation |

**Biggest gap: no animation on POST click or resource increment.** Adding these is cheap and would dramatically improve the "satisfying click" feel.

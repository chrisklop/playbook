# Wayline — *The Juice Problem: How Exaggerated Feedback is Harming Game Design*

**Source:** https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design
**One-line summary:** The counter-position to "more juice is better." When feedback is louder than the underlying mechanic, it's distraction, not affordance.

---

## The thesis

> "[Juice effects] become a crutch, masking fundamental flaws in gameplay and substituting superficial excitement for genuine depth."

Juice — screen shake, particle bursts, scale pulses, sound effects — exists to **confirm and amplify** what the mechanic is doing. When it tries to make the mechanic look bigger than it is, it lies to the player.

---

## Anti-patterns flagged

### Homogenization
Developers mimic successful titles' juice effects. Everything starts feeling the same. The signature texture of a specific game's feedback gets washed out.

### Masking weak design
> "If combat lacks strategic depth, just add more screen shake! If the story is uninspired, drown it in flashy cutscenes!"

If the mechanic isn't satisfying without juice, juice won't fix it. Juice amplifies — it doesn't create.

### False agency
> "The illusion of impact is not the same as empowering them with actual agency."

Particle explosions on every click create the sensation of doing something powerful, but if the underlying mechanic gives no real choice (clicking a single +1 button), the spectacle is hollow.

---

## When to dial DOWN feedback

The article's prescription: a **"Juice Audit"** asking on every effect:
> "Does this effect truly enhance the experience, or is it just there to distract the player?"

In an idle game specifically:
- Number-popups, scale-pulses, particle bursts are fine **when the click is meaningful** (a real burst-of-attention POST, a manual prestige).
- They're noise when applied uniformly to **passive** events (tick-by-tick production accumulating).
- Distinct feedback for **distinct actions** is signal; identical feedback for everything is noise.

---

## What we do today (audit)

| Effect | Verdict |
|---|---|
| Resource meter fill bars | Signal — shows progress at a glance. Keep. |
| Charge bar fill | Signal — shows when post is ready. Keep. |
| Event banner pulse animation | Signal — calls attention to time-bounded effect. Keep. |
| Ticker scroll | Signal at default; could become noise if more facts are added without pacing changes. Watch. |
| POST button color shift on ready | Signal — green = clickable. Keep. |
| Card hover border shift | Subtle signal. Keep. |
| Disabled button opacity drop | Signal — clear "not available." Keep. |

**Missing juice (defensible):**
- No click sound / haptic on buy
- No number-popup animation when a resource increments
- No scale pulse on the POST button when fired
- No screen flash on phase transition

The juice-problem position would say: that's fine if the underlying actions are clearly meaningful (which they are — costs and effects are visible). Add juice deliberately, per action, where it confirms an action's importance — not as decoration.

---

## Specific recommendation

When we add juice, do it for:
1. **POST click** — scale pulse on the button, brief number-popup of `+N att` floating up from the button
2. **Phase transition** — flash + log highlight, momentary slow + clear; this IS a big deal
3. **Prestige** — confirmation modal + animated star count + log entry

Don't do it for:
- Every passive tick of resource accumulation
- Every hover on a card
- Every visible-but-not-yet-affordable buy button

The rule: feedback strength should match action significance.

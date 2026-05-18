# UXPin — *Affordances in UX Design*

**Source:** https://www.uxpin.com/studio/blog/affordances-user-interaction/
**One-line summary:** The taxonomy of affordances — what makes an element communicate "I do this when you do that." Universal language; applies cleanly to game UI.

---

## Definition

Affordance, originally from psychologist James J. Gibson, popularized in design by Don Norman:

> "A property of an object that suggests how it can be used."

**Affordance** = the actual possibility of an action (a button *can* be clicked).
**Signifier** = the cue that communicates the affordance exists (the button *looks* clickable).

These often conflate but it's worth keeping separate: a thing can be clickable (affordance) without looking it (no signifier), or look clickable without being it (false affordance).

---

## Six types

### 1. Explicit affordances
Physical appearance or text makes the action obvious. High-contrast labeled buttons. Input fields with placeholders.

**Our use:** POST buttons with explicit text labels ("POST · +260 att") and color states (green ready / muted disabled).

### 2. Hidden affordances
Revealed only on user action (hover, tap, click). Dropdown menus, hover tooltips.

**Our use:** the precedent text rotates on click of an asset/upgrade card. The `title` attribute on cards is also a hidden affordance (tooltip on hover).

### 3. Pattern affordances
Leverage learned conventions. Logo top-left → home. Underlined text → link. Hamburger icon → menu.

**Our use:** topbar with brand-left and meters-center is a learned pattern. "Reset" button bottom-right is a learned pattern.

### 4. Metaphorical affordances
Real-world object metaphors. Magnifying glass → search. Envelope → email.

**Our use:** the ★ icon on prestige (achievement / persistent gold-medal metaphor). The ▶ pulse on active events (play button → "this is playing right now"). The ⚠ on burned platforms (warning sign).

### 5. Negative affordances
Signal unavailability. Greyed-out buttons. Disabled state.

**Our use:** disabled buy buttons when unaffordable. The opacity-0.55 treatment. The `:disabled` cursor change.

### 6. False affordances
Look interactive but aren't. Anti-pattern; cardinal sin.

**Our use:** ⚠ avoid. Worth auditing for accidental cases — e.g. the precedent text underneath blurb might look clickable (it's bordered with an accent stripe) but isn't.

---

## What makes a button *look* clickable

The article doesn't enumerate but the implied checklist:
- Distinct fill or border distinguishing it from background
- Cursor changes on hover (`cursor: pointer`)
- Hover state visibly different from idle
- Pressed/active state visibly different from hover
- Disabled state visibly different from idle
- Text label clearly stating the action

The four states a real button needs: **idle, hover, active (pressed), disabled.** Skipping any one of them weakens the affordance.

---

## How this maps to our UI

| Affordance type | Our use | Notes |
|---|---|---|
| Explicit | Buy/post buttons with labels | ✓ |
| Hidden | Title-attr tooltips, click-to-rotate precedents | ✓ |
| Pattern | Topbar layout, reset placement | ✓ |
| Metaphorical | ★ prestige, ▶ events, ⚠ burn warning | ✓ |
| Negative | Disabled buttons, opacity drops | ✓ |
| False (anti-pattern) | Precedent border-left looks like a clickable accent | TODO: verify it doesn't look like a link |

**Missing button states:** I'm not certain we have distinct **hover** and **active (pressed)** states on every button. Some show only idle + disabled. Audit needed.

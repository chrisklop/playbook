# Outlook Respawn — *Game UI and UX Guide: Menus, HUDs, and Feedback Systems*

**Source:** https://respawn.outlookindia.com/gaming/gaming-guides/ui-and-ux-in-games-building-menus-huds-and-feedback-systems
**One-line summary:** HUD architecture principles and feedback-timing windows. The key numeric: 80/20 attention split between gameplay area and HUD.

---

## HUD layout strategy

### The 80/20 attention split
> "Players direct around 80% of their visual attention to the gameplay area, leaving only 20% for HUD elements."

The implication: HUD elements compete for a small attention budget. Every element added subtracts from another. Edges and corners (peripheral vision) are the natural HUD homes; players are conditioned to glance there.

> "Health bars, ammo counts, and active objectives occupy the corners and edges of the screen because players have been conditioned to check those positions."

For The Playbook: the topbar (resources, prestige button) IS the equivalent. Always-visible peripheral data the player glances at without leaving the main interaction zone.

---

## Button design states

The guide is light on specific button states (refer to source 06 for the numeric specifics), but emphasizes:
- Hover animations and scale shifts on button selection
- Slide and fade transitions between screens
- Audio clicks on navigation

The combined effect: button interactions feel acknowledged and tactile.

---

## Feedback timing

### Screen shake
> "Displace the camera for 0.1 to 0.3 seconds on significant impacts."

For idle games specifically, screen shake should be **rare** and reserved for genuine "milestone" moments (prestige, phase transition, viral cascade trigger). Routine actions don't shake the screen.

### Moment-of-impact pause
> "A fraction-of-a-second game pause at the moment of major impact."

Used in action games to amplify weight of a hit. In idle: a brief 200–500ms "freeze" when a phase transition fires would amplify the moment without disrupting flow.

---

## Color hierarchy

> "Never use color as the sole carrier of information. Pair it with icons, text labels, or patterns."

Multi-modal hierarchy. A red bar isn't enough — pair with a text "HOT" label or a ⚠ icon so colorblind players (and players with red-anxiety overflow) still understand.

**Our use:** mostly compliant — heat percentage shown as text alongside the gradient bar, currency labels accompany the colored values, etc.

---

## How this maps to our UI

| Principle | The Playbook |
|---|---|
| 80/20 attention split | Topbar always visible; cards in main area get the focus when active. ✓ |
| HUD at edges and corners | Topbar (top edge), log strip (bottom edge), Bulk-buy in topbar. ✓ |
| Audio clicks on interaction | ❌ Missing — no audio anywhere |
| Hover animations on buttons | ✓ Card hover → accent border |
| Color paired with text/icon | ✓ mostly — heat shows % text + gradient bar |
| Screen shake reserved for big events | N/A — we don't use shake at all |
| Moment-of-impact pause | N/A — we don't use this either |

**Gaps:** no audio feedback layer at all. For an idle game that's defensible (idle games often play silently in background tabs) but a future-features audit should weigh: cost = adding a sound engine + assets; benefit = clearer tactile feedback per source 06.

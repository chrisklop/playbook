# Interaction Design Foundation — *Visual Hierarchy*

**Source:** https://ixdf.org/literature/topics/visual-hierarchy
**One-line summary:** The six tools for arranging visual importance, plus Gestalt principles. Universal — applies to any UI surface.

---

## Definition

> "Visual hierarchy is the practice of arranging elements so that people instantly recognize their order of importance on a screen or page."

The goal: a glanceable interface where the **eye knows where to land first** without conscious effort.

---

## The six tools

### 1. Size
> "Larger elements command more attention than smaller ones can."

The single strongest signal. Primary actions should be visibly larger than secondary actions.

### 2. Color
> "Bright or saturated colors draw the eye more than muted ones will."

Bright/saturated = attention. Muted = background. Use sparingly — every saturated color is a "look here" signal; too many simultaneous signals = noise.

### 3. Contrast
> "Strong light–dark differences or bold versus thin weights make elements stand out."

Pair with size: a bigger, bolder, higher-contrast element is unmissable.

### 4. Alignment
> "When elements align well, a single off-axis element stands out."

Negative space + alignment is signal-by-omission. Most things on a grid → the one thing off-grid catches the eye.

### 5. Repetition
> "Repeated shapes, colors, or styles suggest that content is related."

Visual rhythm communicates structure. Buy buttons that look the same suggest "all these are the same kind of action."

### 6. White space
> "Empty space is powerful; the right amount of 'nothing' can frame and emphasize what matters."

Density-without-padding = chaos. Around a key element, breathing room amplifies it.

---

## Gestalt principles for UI

### Law of proximity
> "Items that are close together appear grouped."

The strongest grouping signal — stronger than color or border. Card-style UI exploits this: everything inside the card is one logical unit.

---

## Signal vs noise

> "Equal visual weight across all elements creates problematic visual noise."

The trap: making everything look important. Cure: deliberately scale down less-important content. The player should be able to ignore 80% of the UI at any given moment and still know what to do.

---

## How this maps to our UI

| Tool | The Playbook today |
|---|---|
| Size | Topbar resource meters are large, prominent. Cards are medium. Log strip is small. ✓ |
| Color | Currency colors (attention=warm, engagement=blue, etc.) used consistently. ✓ |
| Contrast | Affordable buttons high-contrast; disabled low-contrast. ✓ Could be sharper. |
| Alignment | 3-column grid; cards within columns align. ✓ |
| Repetition | All buy buttons share visual treatment. ✓ |
| White space | Card padding consistent. ✓ But card density gets crowded with precedent + effect + cost rows. |
| Proximity | Cost+badge grouped at bottom of card. ✓ |

Weakest area: **density mid-late game.** Once trees + projects + synergies + patrons are all visible, the left column is a wall of cards. No visual hierarchy among them — every card looks equally important.

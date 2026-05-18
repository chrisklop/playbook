# Nielsen Norman Group — *10 Usability Heuristics Applied to Video Games*

**Source:** https://www.nngroup.com/articles/usability-heuristics-applied-video-games/
**Authority:** Nielsen Norman Group — the canonical source for usability heuristics. Jakob Nielsen's original 10 heuristics (1994) applied here to games specifically.
**One-line summary:** The ten universal usability heuristics, each illustrated with a game-specific example. Treat this as the bedrock checklist.

---

## The 10 Heuristics

### 1. Visibility of system status

> "The system should always keep users informed about what is going on, through appropriate feedback within reasonable time."

**Game example (NN/G):** Breath of the Wild's heart-container HP meter — instant feedback on damage/healing decisions.

**Idle-game application:** production rates (`+260 att/s`), charge bars, ETA-to-cap text, multiplier breakdowns. The player should never wonder "is this thing working?"

### 2. Match between system and the real world

> "The system should speak the users' language, with words, phrases and concepts familiar to the user."

**Game example:** PUBG names guns after real-world weapons (Beretta 686 Silver Pigeon); Apex's fictional "G7 Scout" requires extra cognition.

**Idle-game application:** name buyable things after recognizable real-world archetypes. Our "Sock Puppet" / "Pseudo-News Site" / "Doppelganger Cluster" naming follows this — each maps to a documented real-world thing the player can intuit.

### 3. User control and freedom

> Users need a "clearly marked emergency exit" and "undo and redo."

**Idle-game application:** confirmation before destructive actions (prestige, reset). Bulk-buy mode toggle is an "accelerator" but should be reversible (×1 button exists).

### 4. Consistency and standards

> "Users should not have to wonder whether different words, situations, or actions mean the same thing."

**Game example:** Xbox standardized A=jump across titles; Mirror's Edge breaking this rule caused complaints.

**Idle-game application:** same currency-color across the whole UI. Same affordance for buy buttons regardless of section. Same disabled-state visual treatment.

### 5. Error prevention

> Design should "prevent a problem from occurring in the first place" through "confirmation option before they commit."

**Game example:** Smash Bros prompts before quitting an in-progress match.

**Idle-game application:** confirm prestige (resets the run). Confirm reset-everything (wipes legacy). The default state of a destructive action should be "cancel."

### 6. Recognition rather than recall

> "Minimize the user's memory load by making objects, actions, and options visible."

**Game example:** RDR2 shows horse-controls only when near a horse — context-relevant affordance.

**Idle-game application:** show the current cost on every card. Don't make the player remember "I think Wedge Issue costs around 7K." Show "+1 — 7.2K attention." Always-visible state ≠ memory load.

### 7. Flexibility and efficiency of use

> Provide "accelerators — unseen by the novice user — may often speed up the interaction for the expert user."

**Idle-game application:** bulk-buy (×1/×10/×100/Max). Auto-poster. Keyboard shortcuts. These are the "expert mode" of the same buy actions.

### 8. Aesthetic and minimalist design

> "Dialogues should not contain information which is irrelevant or rarely needed."

**Game example:** Mario Kart 8 keeps essential info at the screen's corners; gameplay-area stays uncluttered.

**Idle-game application:** progressive disclosure (we already do this). Cards only show their precedent on hover or after click. Tooltip rich content stays out of the default view.

### 9. Help users recognize, diagnose, and recover from errors

> "Error messages should be expressed in plain language (no codes), precisely indicate the problem, and constructively suggest a solution."

**Game example:** Subway Surfers' "Not enough keys! Get more keys" — names the problem, names the fix.

**Idle-game application:** when a buy fails, say why. "Not enough attention — need 2.4K more." Don't fail silently with a disabled button + no explanation. (We do this implicitly via the affordability fill bar; explicit text would be stronger.)

### 10. Help and documentation

> "Help and documentation should be easy to search, focused on the user's task."

**Game example:** PUBG Mobile's contextual Help with searchable hot topics.

**Idle-game application:** the precedent strings on cards ARE in-game help. The codex (when we ship it) is documentation. Both should be discoverable but not in-your-face.

---

## How these map to our current UI

Quick mental check against The Playbook today:

| Heuristic | We do | We don't |
|---|---|---|
| 1 Visibility | ✓ resource meters, charge bars, +rate displays | Multiplier breakdown not visible (just shipped a backend `computeMultiplierBreakdown` — no UI surface yet) |
| 2 Real-world match | ✓ Sock Puppet / Doppelganger / Wedge Issue naming | — |
| 3 Control & freedom | ✓ reset confirm | No "undo last buy" — but that's an idle-game convention |
| 4 Consistency | ✓ currency colors, card affordances unified | Some card types render slightly differently (asset vs node vs synergy vs patron) — could be tightened |
| 5 Error prevention | ✓ disabled buttons when unaffordable | No confirm on Auto-Poster purchase, which mechanically changes posting forever |
| 6 Recognition not recall | ✓ live cost on every card, +N badge | Achievement progress isn't visible — player can't see "you're 47/100 sock puppets toward 'Hundred Hands'" |
| 7 Flexibility | ✓ bulk-buy, auto-poster | No keyboard shortcuts |
| 8 Minimalist | ✓ progressive reveal pattern | Card density gets crowded mid/late game when many items reveal at once |
| 9 Error recovery | Partial — disabled buttons signal "can't afford" but don't say why | No tooltip or status line "you need X more of Y" |
| 10 Help | Partial — precedents on hover | No codex / no settings panel / no glossary |

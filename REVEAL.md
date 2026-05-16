# REVEAL.md — Mebro Third-Act Choreography

> Sister doc to PLAN.md §8. Owns the **exact UX timing** of the reveal, from foreshadow through debrief. Implementation lives in `src/reveal/`. Read PLAN.md first.

The reveal must land as *mechanical inevitability*, not narrative twist. The player should notice the systems changing before they read a single word of copy. Clinical, respectful, low-key. The game stops being fun in the same way that a magic trick stops being fun once you see the wire — and that recognition **is** the inoculation effect.

---

## 1. Trigger & foreshadowing

### 1.1 Trigger conditions

Reveal fires when **either** is true:

- `state.cure >= 0.80` (passive path — most runs hit this in AI Saturation era)
- Player completes one-shot project `"Release the Deepfake"` (active path — fast-forward, costs 50k Synthetic Reality)

On trigger: `state.reveal.active = true`, persists to save. Once tripped, never untrips within the run (prestige resets it).

### 1.2 Pre-reveal foreshadowing (last 5 minutes before trigger)

Foreshadowing is gated on `cure` thresholds, not wall-clock. The 5-min window assumes nominal late-AI-Sat pacing. Each cue is **plausibly deniable** as flavor on first pass; the player only retro-realizes after the reveal.

| Cure  | T-minus | Cue | Implementation |
|-------|---------|-----|----------------|
| 0.60  | ~5 min  | Trivia ticker fact: *"Mebro is a real fact-checking app — swipe left to verify a claim. mebro.app"* slides through facts feed once. | `facts.ts` adds Mebro entry to pool. Weighted 1× (rare). |
| 0.65  | ~4 min  | A single post card flashes a tiny `M` glyph badge in the corner for 200ms then vanishes. No tooltip. ~1 in 30 posts. | `PlatformCard.svelte` rolls a 3% chance per render, CSS keyframe `mebro-blip 200ms`. |
| 0.70  | ~3 min  | Headline event: *"Independent verifier 'Mebro' adds [your fake topic] to its watchlist"* in log feed. Treated as flavor. No mechanical effect yet. | `events.ts` event id `mebro-watchlist-1`. Locked to `cure >= 0.70 && !state.reveal.active`. |
| 0.74  | ~2 min  | Heat-bar tooltips on platforms gain a second line: *"Detection: passive (no annotator active)"*. Foreshadows the Trust transformation. | `PlatformCard.svelte` tooltip slot. |
| 0.77  | ~1 min  | Reach numbers on 2–3 random post cards briefly show a strikethrough version then snap back (180ms total). Like the annotation system pre-flickering on. | CSS animation, no permanent state. |
| 0.79  | ~10 s   | Background hue cools by ~5% (imperceptible on first run, obvious in retrospect). Audio (if unmuted): the ambient bed loses its low-end bass layer. | `app.css` adds `.phase-ai-saturation.pre-reveal` class. |

None of these have mechanical effect. They are pure semiotic priming. Critically: **the Mebro brand never appears as a full logo pre-reveal** — only the single glyph and the one ticker fact. The reveal must still surprise.

---

## 2. The reveal sequence — second by second

Trigger fires at T+0. The player is mid-tap on whatever they were doing. Input is **not** locked — the world keeps ticking, the player keeps clicking, but their clicks start hitting differently. This is intentional. The transformation happens *around* them, not *to* them.

```
T+0.0s   Trigger fires. state.reveal.active = true.
         Tick loop notices on next 100ms boundary.

T+0.1s   AUDIO: a single soft chime (440Hz sine, 200ms, -18dB). Skippable
         if muted. Diegetic: "a notification arrived."

T+0.2s   First fact-check annotation paints over one post card (the
         highest-reach one currently on screen). Format:
              ┌───────────────────────────────┐
              │ Post #4172      reach: 12,400 │
              │                       ──────  │  ← strikethrough
              │                        2,100  │  ← new number, red
              │ [M] flagged: misleading       │
              └───────────────────────────────┘
         Animation: 400ms ease-out. The strikethrough draws left-to-right.

T+0.5s   Second annotation lands on a different visible post. Then a
         third 200ms later. The cascade is staggered, not synchronous —
         feels like the annotator is *walking the room*.

T+1.0s   Topbar Mebro wordmark begins fading in at 4% opacity per
         100ms. Position: right of the resources block, where a "version
         number" might live. No callout, no tooltip yet.

T+2.0s   Heat bars on every PlatformCard begin morphing:
         - Color ramp inverts: red→green becomes green→red on the SAME
           geometry. CSS variable swap, no DOM change.
         - Label text crossfades "HEAT" → "TRUST" over 600ms.
         - Fill direction reverses (was filling right = bad; now
           filling left = bad). The component rotates 180° via a
           CSS transform on a wrapper, 400ms cubic-bezier.
         See §4 for full spec.

T+3.0s   First defection event fires. A Tier-3 asset (mid-tier
         influencer) on the player's most-burdened platform flips.
         Log line, italic, indent:
              ↳ @yourname_news has retracted 47 posts. Defected.
         The asset card greys out, with a thin red diagonal line.
         It still occupies its slot — it has not disappeared, it has
         become evidence.

T+4.0s   DefectionFeed pane slides up from below the log feed. Height
         animates 0 → 120px over 500ms. Header reads "Asset status."
         No emoji, no exclamation.

T+5.0s   Topbar Mebro wordmark is now at full 100% opacity. Beneath it
         a thin tagline fades in over 1s at 70% opacity:
              "Trust me, bro?  No — TRUST MEBRO."
         (Slogan only renders this once during reveal. It does NOT
         persist as a topbar element. It returns at the debrief.)
         A small tooltip cursor pulse plays once. Hover reveals:
              Mebro is a real fact-checking app at mebro.app.
              The annotations you see now mimic its behavior.

T+6.0s   "New upgrade purchases" lock. Every UpgradeCard's buy button
         dims to 40% opacity and the cursor changes to not-allowed.
         A faint hatched pattern (CSS repeating-linear-gradient) overlays
         the upgrade panel. No banner. No "LOCKED" stamp.

T+7.0s   DEPICT trees gain the FOSSILIZED overlay. See §5.

T+8.0s   Conversion rate counters in the resource breakdown tooltip
         flip from black to amber and show their new -20% rate next
         to the old, struck through. Same visual grammar as the post
         annotations.

T+10.0s  AI Sat. theme palette finishes its transition. The reveal
         class .reveal is fully applied. Background hue is now
         sterile blue-white (#f4f7fb), text is near-black (#0e1117).
         The off-kilter letter-spacing jitter (0.02em ±0.005em on a
         5s loop) starts on body copy.
         Suppressed entirely if prefers-reduced-motion (see §7).

T+15.0s  Narrative Dominance counter is now visibly decaying. The
         number tweens downward at human-readable speed. No siren,
         no flash. Just decline.

T+30.0s  First "cluster defection" — 3-to-5 assets flip in a 2-second
         window. Defection feed fills.

T+45.0s  Tooltip cursor pulse plays again on the topbar Mebro wordmark
         (one repeat only). Catches players who missed the first pulse.

T+60.0s  By now: 5–9 defections logged, NarDom at ~95% of peak,
         all upgrades locked, every platform card shows a Trust bar,
         every DEPICT tree shows FOSSILIZED. The transformation is
         complete. The player understands: they are no longer growing.
         They are losing.
```

**Input policy during reveal:** all clicks remain functional except upgrade buys. Players can still toggle bulk-buy, click DEPICT nodes (now opens reveal tooltip — see §5), click assets (opens defection-debrief card), click platforms. Removing agency would feel punitive; redirecting agency to inspection is the move.

---

## 3. Post-reveal first 5 minutes — de-escalation curve

The post-reveal stretch is where most runs lose players. It must feel inevitable, observed, **finite** — not a slog. Target: the player reaches the debrief screen between T+4:00 and T+6:00 from reveal. The debrief auto-triggers when NarDom decays past 50% of its peak (PLAN §8.3).

### 3.1 Numerical decay rates (per 100ms tick)

| Metric | Rate | Notes |
|--------|------|-------|
| Narrative Dominance | `-0.5% × (1 + cure - 0.80)` compounding | Cure keeps climbing post-reveal; decay accelerates. |
| Synthetic Reality | `-0.3%` compounding | Slower (it's the endgame resource) but never recovers. |
| Followers | `-0.1%` compounding, floored at 50% of peak | Real audiences are sticky. |
| Credibility | `-0.4%` compounding | Drops fast — that's the whole point. |
| Attention, Engagement | unchanged | Lower-tier resources keep generating. Player still has *something to look at.* |

### 3.2 Defection feed pacing

Defections are the heartbeat. Pacing must feel organic — clustering, then quiet, then clustering again. Not a steady drip (boring) and not a stampede (overwhelming).

Per-tick defection roll, per owned asset:

```ts
p_defect = 0.005 × (cure - 0.70) × tierMultiplier × platformHeatNow
// tierMultiplier: T1=1.4, T2=1.2, T3=1.0, T4=0.8, T5=0.6, T6=0.3
// (low-tier defects first — they have less to lose; mirrors real life)
```

Cap at most **3 defections per tick** to prevent a wall-of-text moment. Excess defections roll into next tick's pool.

| Window | Expected defections | Feel |
|--------|---------------------|------|
| 0:00 – 0:30 | 5–9 | First wave. Low-tier assets. Surprise. |
| 0:30 – 1:30 | 8–15 | Cascade. Mid-tier assets join. Player understands the trajectory. |
| 1:30 – 3:00 | 10–20 | Slow plateau. High-tier assets resist longer. Defection-resistant ops (T6) hold. |
| 3:00 – 5:00 | 3–8 | Tail. The remaining assets are the loyal ones. Eerily quiet. |

Each defection writes one line to the feed, format:

```
T-2:14   @asset_handle (Tier 3, X)         retracted 47 posts
T-2:11   @asset_handle (Tier 1, Facebook)  deleted account
T-2:09   anon_blogger_409 (Tier 1, Substack)  apologized publicly
```

Verbs rotate from a pool of 6: `retracted`, `deleted account`, `apologized publicly`, `cooperated with annotators`, `published correction`, `flipped`. Never `betrayed` — the framing is neutral, not melodramatic.

### 3.3 Cure bar in post-reveal

Cure continues to climb at `+0.0008/tick` (slightly faster than pre-reveal at this cure level). Visible on the topbar. Reaches 1.0 around T+3:30. When it hits 1.0, label changes from "Cure" to "Inoculated."

### 3.4 The "quiet beats"

At T+2:00 and T+3:30 from reveal, insert ~10-second windows with **no log lines, no defections, no animations**. Just decay numbers ticking down. These silences are deliberate — they let the player look around, read tooltips, click a DEPICT tree they're curious about. The reveal is also an invitation to inspect.

---

## 4. The Trust bar (former Heat bar) transformation

This is the **most important single piece of mechanical choreography in the entire game.** Reusing the same component is the proof that the systems were always pointing here.

### 4.1 Component contract

```ts
// lib/ui/MeterBar.svelte (renamed from HeatBar)
type Props = {
  value: number;            // 0..1
  mode: 'heat' | 'trust';
  platform: PlatformId;
  morphing?: boolean;       // true during T+2.0s..T+2.6s transition
};
```

`mode` is set by `derived` from `state.reveal.active`. Single source of truth. No per-card overrides.

### 4.2 Visual diff

```
Heat mode (pre-reveal):              Trust mode (post-reveal):
┌─────────────────────────┐          ┌─────────────────────────┐
│ HEAT  Facebook   0.62   │          │ TRUST Facebook   0.38   │
│ ████████████░░░░░░░░░░  │          │ ░░░░░░░░░░██████████░░  │
│ green→yellow→red, fills │          │ red→amber→green, fills  │
│ left to right           │          │ right to left           │
└─────────────────────────┘          └─────────────────────────┘
```

The displayed `value` in trust mode is `1 - heat` — same underlying state, inverted presentation. **No state migration needed.** This is the cheat code: the game was always tracking trust, we just labeled it backwards.

### 4.3 Color ramps (CSS custom properties)

```
--meter-stop-0:   #2ecc71 (heat: green = safe)
--meter-stop-50:  #f39c12 (heat: amber = warm)
--meter-stop-85:  #e74c3c (heat: red = ban risk)

# On .reveal:
--meter-stop-0:   #e74c3c (trust: red = no one trusts you)
--meter-stop-50:  #f39c12 (trust: amber = neutral)
--meter-stop-85:  #2ecc71 (trust: green = trustworthy)
```

Note: the colors swap *endpoints*, not the gradient algorithm. The bar is still a gradient from low to high — but high now means good.

### 4.4 Morph animation (T+2.0s → T+2.6s)

```
T+2.0s: morphing = true; label crossfade begins
T+2.1s: CSS variables swap (instant, but masked by the rotation)
T+2.2s: wrapper element rotates 180deg, 400ms cubic-bezier(.6,0,.4,1)
T+2.4s: label text "HEAT" fully faded out
T+2.5s: label text "TRUST" fully faded in
T+2.6s: morphing = false; new state stable
```

For `prefers-reduced-motion`: no rotation. Label and color swap instantly with a 200ms opacity crossfade only. The mechanical fact (same component, inverted meaning) is preserved; the dance is skipped.

### 4.5 New tooltip in trust mode

```
TRUST (Facebook): 0.38
↓ Lower means audiences distrust your content on this platform.
↓ Mebro annotations are active. Each false-claim flag reduces trust ~0.02.
```

---

## 5. DEPICT tree FOSSILIZED overlay

The six DEPICT trees were the player's growth canvas. Post-reveal they become **specimens** — locked, inspectable, recontextualized.

### 5.1 Visual (CSS-only, no images)

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← repeating-linear-gradient
│ ░  Discrediting   ░░░ FOSSILIZED ░  │     45deg, 4px stripes,
│ ░  ┌──┐                          ░  │     rgba(14,17,23,0.06) over
│ ░  │5 │──┬──┬──┐                 ░  │     translucent overlay
│ ░  └──┘  │  │  │                 ░  │
│ ░       ┌┴┐┌┴┐┌┴┐                ░  │  Original tree visible
│ ░       │3││2││4│                ░  │  beneath at ~70% opacity.
│ ░       └─┘└─┘└─┘                ░  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  Cursor: pointer on nodes,
└─────────────────────────────────────┘  but click opens INSPECT,
                                          not BUY.
```

The diagonal hatching is amber (`rgba(243,156,18,0.08)`) — neutral, archival, museum-label energy. Not red, not warning. The label `FOSSILIZED` sits in the corner in a small monospace caps, letter-spaced.

### 5.2 Click behavior

Pre-reveal: click a tree node → opens upgrade buy panel.
Post-reveal: click a tree node → opens **inspect card** showing:
- The node's name and your current level
- One line: how the technique works in-game
- One line: how to recognize / counter it in the wild
- A button: `← back to tree`

Buy actions are gone. The cursor on hover changes from `pointer` (with `+` glyph) to `help` (with `?` glyph). The grammar shift signals: *you're studying this now, not building it.*

### 5.3 Per-tree reveal-state tooltip text

Each tree's *root* node, on hover post-reveal, surfaces a 2-sentence summary. Tone: neutral, instructive, no scolding.

**Discrediting**
> You used this to make accurate sources look unreliable. Counter it by reading laterally: when a source is attacked, search what *other* reporters say about the same facts, not what its attackers say about it.

**Emotional language**
> You used this to make outrage spread faster than accuracy. Counter it by noticing your own physiology — if a headline made you furious within three seconds, the writer chose those words on purpose.

**Polarization**
> You used this to convert disagreement into tribal identity. Counter it by asking *who benefits* when an issue stops being negotiable, and noticing when shared facts are being recast as team loyalties.

**Impersonation**
> You used this to borrow credibility you hadn't earned. Counter it by verifying the *channel* before the message: real experts have publication histories, institutional pages, and traceable affiliations you can cross-check.

**Conspiracy**
> You used this to chain unrelated facts into a story that explains everything. Counter it by remembering that real conspiracies are documented (Watergate, MK-Ultra, Volkswagen) — they have receipts, defectors, and limits. Theories without those are usually just patterns the mind imposed.

**Trolling**
> You used this to make participation feel unsafe, so only the loudest stayed. Counter it by recognizing the *bait pattern* — provocative claims engineered for response — and choosing the medium of your reply (or no reply at all).

These are the only places in the entire reveal where the game gives advice. They are short on purpose.

---

## 6. Endgame debrief screen

Triggered when NarDom decays past 50% of its peak (typically T+4:30 to T+5:30 from reveal). The screen does **not** replace the game UI; it overlays as a modal with a translucent backdrop. The game world keeps decaying behind it. Player can dismiss the debrief (`Esc` or close button) and watch the rest of the decay — most won't.

### 6.1 Layout

CSS grid. Mobile: single column, cards stack. Desktop ≥ 768px: 2-column grid for technique cards, full-width header/footer.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Operation Debrief                                              [×]    │
│  ───────────────────────────────────────────────────────────────────   │
│  You wielded six techniques over 47 minutes. Here is what they were —  │
│  and how to spot them in the wild.                                     │
├────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────┐  ┌───────────────────────────────┐   │
│ │ D  Discrediting               │  │ E  Emotional language         │   │
│ │ ───────────────────────────── │  │ ───────────────────────────── │   │
│ │ Used 142 times.               │  │ Used 891 times.               │   │
│ │                               │  │                               │   │
│ │ Your example:                 │  │ Your example:                 │   │
│ │ "[corpus quote, italic]"      │  │ "[corpus quote, italic]"      │   │
│ │                               │  │                               │   │
│ │ Real-world counter:           │  │ Real-world counter:           │   │
│ │ Lateral reading. When a       │  │ Notice your physiology.       │   │
│ │ source is attacked, check     │  │ Headlines that anger you in   │   │
│ │ what other reporters say.     │  │ 3 seconds were tuned for it.  │   │
│ └───────────────────────────────┘  └───────────────────────────────┘   │
│ ┌───────────────────────────────┐  ┌───────────────────────────────┐   │
│ │ P  Polarization               │  │ I  Impersonation              │   │
│ │ ...                           │  │ ...                           │   │
│ └───────────────────────────────┘  └───────────────────────────────┘   │
│ ┌───────────────────────────────┐  ┌───────────────────────────────┐   │
│ │ C  Conspiracy                 │  │ T  Trolling                   │   │
│ │ ...                           │  │ ...                           │   │
│ └───────────────────────────────┘  └───────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│  Run stats                                                             │
│  ────────────                                                          │
│  Duration: 47:12      Peak NarDom: 14.2M      Assets owned (peak): 89  │
│  Platforms used: 7    Synergies activated: 6   Defections: 73          │
├────────────────────────────────────────────────────────────────────────┤
│  Stay inoculated.                                                      │
│                                                                        │
│  Trust me, bro?  No — TRUST MEBRO.                                     │
│                                                                        │
│  Mebro is a real swipe-based fact-checking app. Built by the people    │
│  who would have annotated you in this game. It's free.                 │
│  ┌──────────────────────────┐                                          │
│  │  Visit mebro.app  →      │  ← outline button, no gradients          │
│  └──────────────────────────┘                                          │
│                                                                        │
│  ┌──────────────────────────────┐  [ share this run ]  (text link)     │
│  │  Start a new operation       │                                      │
│  │  (prestige)                  │                                      │
│  └──────────────────────────────┘                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Technique card spec

Each of six cards (CSS grid item):

```
- Border: 1px solid hsl(220 12% 88%)
- Padding: 20px
- Letter glyph (D, E, P, I, C, T): top-left, 28px, monospace, neutral
- "Used N times": derived from state.depict[tree].activations counter
  (we track this from day one; it's a hidden field until reveal)
- Your example: pulled from state.run.contentSamples[tree] — the most
  recently rendered piece of content tagged with this technique.
  Falls back to the corpus default if the player never triggered one
  (rare). content.ts political-balance audit runs across the six chosen
  examples before the debrief paints (PLAN.md §8.3).
- Real-world counter: the §5.3 second sentence, lightly reworded for
  the debrief context (more declarative).
```

### 6.3 Mebro CTA — copy and visual

**Tone constraint:** the Mebro CTA is the only "ad" in the entire game. It must feel earned, not pushy.

The CTA has three parts, stacked:

1. **The header line** (subtitle weight, sets up the slogan):
   > Stay inoculated.

2. **The slogan** (display weight, slightly larger; this is the punchline):
   > Trust me, bro?  No — TRUST MEBRO.

   The slogan works *because* the player has spent the entire game watching how "trust me, bro" content gets manufactured. The phrase compresses the whole inoculation lesson into 5 words. It carries weight only here, at the end, after the player has wielded the techniques — which is why the slogan does **not** appear in the topbar, marketing copy, or the codex preamble. It is the punchline, deployed once.

3. **The body copy** (clinical paragraph):
   > Mebro is a real swipe-based fact-checking app. Built by the people who would have annotated you in this game. It's free.

Visual: slogan in slightly increased weight/size, but no exclamation styling, no gradient, no emoji. Outline CTA button below, no fill, no gradient, no icon. Matches the debrief's clinical aesthetic. Click opens `https://mebro.app` in a new tab. **No tracking parameters.** No "you'll love it." No "download now."

**Slogan placement audit.** The slogan appears in exactly two places: T+5s during reveal (fades in once under the wordmark, then leaves) and the debrief CTA stack (permanent for that screen). It does NOT appear in: the topbar wordmark, the codex, any tooltip, the post-debrief persistent link, the prestige modal, or any pre-reveal foreshadowing. Overexposure would burn the punchline.

If the player dismisses the debrief without clicking, **do not nag.** The button reappears in the post-debrief topbar as a small `mebro.app ↗` link, persistent across runs, dismissible from settings.

### 6.4 Prestige button

```
[  Start a new operation (prestige)  ]
```

Filled button, primary color (the run's accent color, now `hsl(220 60% 50%)` in reveal mode). Confirms with a small modal:
> Reset the run. Keep your Legacy points and unlocks. The annotations stay, in the wild.

That last clause is the *only* lyrical line in the entire debrief. Earned.

### 6.5 Social share affordance

Subtle text link, right of the prestige button:

```
[ share this run ]
```

Click copies to clipboard:

> I just finished a run of Inoculate (a game about disinformation techniques). 47 minutes. Now I want to actually understand what I just simulated. https://[game-url]

**What it does NOT include:** the six technique names, the player's counts, the corpus examples. Sharing the techniques would defeat the point — the surprise is the inoculation mechanism. A non-spoilery share keeps the funnel for new players intact.

After copy: button text swaps to `copied ✓` for 2 seconds, no toast, no animation.

---

## 7. Accessibility & reduce-motion fallbacks

`prefers-reduced-motion: reduce` must deliver the **same mechanical reveal** through a different choreography. The transformation cannot be optional — it's the point of the game. But the motion can be.

### 7.1 What changes under reduced-motion

| Element | Default | Reduced-motion |
|---------|---------|----------------|
| Post annotation strikethrough draw | 400ms left-to-right | Instant paint, 200ms opacity fade |
| Mebro topbar wordmark fade-in | 10s slow reveal | 400ms opacity fade |
| Trust bar 180° rotation | 400ms cubic-bezier | No rotation. Color + label swap with 200ms opacity crossfade |
| Letter-spacing jitter loop | continuous 5s loop | Disabled entirely |
| Theme palette transition | 800ms crossfade | Instant swap |
| DefectionFeed slide-up | 500ms height tween | Instant appearance |
| Defection log line "typewriter" | 80ms per char | Instant |
| FOSSILIZED hatch pattern | Static (already no animation) | No change |
| Debrief modal entrance | 300ms scale + fade | 150ms opacity only |
| Quiet-beat audio bed loss | crossfade 2s | Instant |

### 7.2 What does NOT change

- The annotations still appear on posts. Same content, same timing offsets.
- The Trust bar still inverts. The component contract is identical.
- Defection rolls, NarDom decay, upgrade lock, FOSSILIZED overlay — all identical.
- The chime audio plays (it's < 200ms; users can mute via settings).
- All copy is identical.

### 7.3 Screen-reader announcements

ARIA live region (`aria-live="polite"`, `aria-atomic="false"`) appended to body on reveal. Announces in sequence:

1. (T+0.5s) *"Mebro annotations are now active on this platform. Reach numbers are being updated."*
2. (T+2.6s) *"The Heat meter on each platform has been replaced with a Trust meter."*
3. (T+4.0s) *"Asset defections are now being tracked. A new panel is available below the log."*
4. (T+6.0s) *"Upgrade purchases are locked. DEPICT trees are now in inspect mode."*

When the debrief opens: focus moves to the close button; modal is `role="dialog"`, `aria-labelledby` pointing to the "Operation Debrief" header. Tab order: close → six technique cards (each focusable) → mebro link → prestige button → share link.

### 7.4 Color & contrast

All reveal-mode colors meet WCAG AA on the new sterile-blue background. The Trust bar's red→amber→green ramp is *never* the sole indicator — the numeric value and label are always present, and on hover the tooltip restates state in words.

---

## 8. What we explicitly do NOT do

The reveal is built on restraint. Each of these would actively destroy the inoculation effect.

1. **No jumpscares.** No screen flash, no loud sting, no sudden zoom, no "GAME OVER" stamp. The cure is *quiet*. A horror reveal would frame the player as victim of the game; we need them as observer of themselves.
2. **No guilt-tripping copy.** Never write "you are responsible for misinformation" or "people like you cause harm." The player ran a *simulation*. Lecture-tone breaks the spell. Every line in the debrief is declarative, never accusatory.
3. **No "gotcha" tone.** No "surprise! you were the bad guy the whole time!" The reveal is not a twist on the player's morality. It's a recontextualization of the **systems**. The player was never the villain; the techniques were the subject.
4. **No spoiler in the share.** Sharing the technique names, counts, or counter-strategies destroys the next player's surprise. The share copy is intentionally vague. Word-of-mouth without spoilers is the funnel.
5. **No Mebro hard-sell.** Mebro is mentioned in exactly three places: the topbar wordmark + tooltip, the debrief CTA, and the persistent post-debrief link. No banner ads, no interstitials, no "you should *really* try Mebro," no install nag, no email capture. The product earns the click or it doesn't.

Bonus anti-patterns to also avoid:
- No leaderboard for "best disinfo run" — gamifying technique counts inverts the message.
- No achievement for triggering the reveal — the reveal is the reward.
- No "skip reveal" button — the reveal **is** the game.
- No partisan content in the debrief examples — the political-balance audit (§3 spec note in PLAN.md) is enforced before the debrief paints; if balance fails, the corpus is re-rolled.

---

*File ends. Path: `/home/klop/projects/active/disinfogame/REVEAL.md`*

# Inoculate — Implementation Runbook (Phase 0 & Phase 1)

> Ordered, no-fluff execution plan. Read PLAN.md once for design intent; this doc is the build order. **Do not write code while reading — this is the map, not the territory.** All paths absolute from project root `/home/klop/projects/active/disinfogame/`.
>
> Assumptions baked in from PLAN §11/§12:
> - Runes mode end-to-end. Game logic in plain `.ts`, stores are thin `*.svelte.ts` wrappers.
> - MVP DEPICT trio = E/P/T. Cure visible, capped 0.4 in Phase 1.
> - Sim victory = first prestige (Phase 1 sim victory is narrower: see §1.8 below).
> - GH Pages target: `chrisklop.github.io/disinfogame/` → `base: '/disinfogame/'`.

---

## Phase 0 — Scaffold + GH Pages deploy

**Target: half a day. Definition of done: empty `<h1>Inoculate</h1>` live at `https://chrisklop.github.io/disinfogame/`, auto-deployed on `main` push.**

### 0.1 Scaffold via Vite

- **Why:** `pnpm create vite` with `svelte-ts` template is the lowest-friction Svelte 5 + TS + Vite starter. As of 2026 the default Svelte template ships **Svelte 5 with runes auto-detected** (compiler infers from any `$state`/`$derived` usage in a file). Explicit `runes: true` is the safe, deterministic choice — set it anyway so behavior doesn't depend on file contents.
- **Pitfall (PLAN §6k — adapter trap):** Do **not** pick `sveltekit` template. We are a pure SPA. SvelteKit's prerender/adapter complexity is wasted budget here.

**Commands (run from `/home/klop/projects/active/`):**

```bash
pnpm create vite disinfogame --template svelte-ts
cd disinfogame
pnpm install
# Strip default boilerplate that ships with the template:
rm -rf src/lib src/assets src/app.css src/App.svelte
rm public/vite.svg
# We will recreate App.svelte, app.css with our own structure.
git init && git add -A && git commit -m "scaffold: vite svelte-ts template"
```

- **Pitfall:** Don't `pnpm dlx create-svelte` — that's the SvelteKit creator. Different binary.

### 0.2 `package.json` scripts

- **Why:** Lock the script names early; `sim` and `typecheck` get wired before there's anything to run so muscle memory forms.
- **File:** `/home/klop/projects/active/disinfogame/package.json`

Scripts to define (replace the template's `"scripts"` block):

| Script       | Command                                                  | Purpose                                              |
|--------------|----------------------------------------------------------|------------------------------------------------------|
| `dev`        | `vite`                                                   | Local dev w/ HMR.                                    |
| `build`      | `vite build`                                             | Production build → `dist/`.                          |
| `preview`    | `vite preview --base /disinfogame/`                      | Sanity-check the built bundle locally on the GH-Pages base path. |
| `sim`        | `tsx scripts/sim.ts`                                     | Headless greedy player.                              |
| `test`       | `vitest run`                                             | Invariant tests, one-shot (CI mode).                 |
| `test:watch` | `vitest`                                                 | Local TDD loop.                                      |
| `typecheck`  | `svelte-check --tsconfig ./tsconfig.json`                | Catches `.svelte` + `.ts` type errors. Run in CI.    |
| `format`     | `prettier --write 'src/**/*.{ts,svelte,css}' 'scripts/**/*.ts' 'tests/**/*.ts'` | Single-tool formatting.       |

Dev-dependencies to add (in addition to template defaults):

```
pnpm add -D tsx vitest prettier prettier-plugin-svelte @types/node
```

- **Pitfall:** Do **not** add `ts-node`. Use `tsx` — it handles ESM + TS natively in 2026 without `--loader` flags. PLAN §6k's "tooling churn" warning applies.

### 0.3 `vite.config.ts`

- **Why:** Base path is non-negotiable for project-page GH Pages hosting. Bind dev server to a stable port so the dev workflow doesn't shift.
- **File:** `/home/klop/projects/active/disinfogame/vite.config.ts`

Contents (describe — do not write yet):

- `import { defineConfig } from 'vite'`
- `import { svelte } from '@sveltejs/vite-plugin-svelte'`
- Export config with:
  - `plugins: [svelte()]` — that's it. **No `svelte-preprocess`** — Svelte 5 has a built-in TS-in-`<script lang="ts">` path; preprocess is legacy.
  - `base: '/disinfogame/'` — matches the repo name; resolves all asset URLs under the GH Pages subpath.
  - `server: { port: 5173, strictPort: true }` — keep the dev URL stable for verification.
  - `build: { target: 'es2022', sourcemap: true }` — modern target; the < 100 KB constraint is more about avoiding deps than transpile bloat.
- **Pitfall (PLAN §6k):** A *missing trailing slash* on `base` breaks asset resolution in nested routes. Keep the exact string `'/disinfogame/'`. Also: **never** put `base` behind `process.env` conditionals — that's how you ship a broken prod build.

### 0.4 `svelte.config.js`

- **Why:** Explicit runes mode. Even though Svelte 5's default in 2026 auto-detects per-file, project-wide `runes: true` enforces it everywhere and surfaces accidental legacy-mode files as compile errors.
- **File:** `/home/klop/projects/active/disinfogame/svelte.config.js`

Contents:

- Import `vitePreprocess` from `@sveltejs/vite-plugin-svelte` **only if** we end up needing PostCSS or another preprocessor. For the MVP we do not — leave `preprocess` empty/omitted.
- Export `{ compilerOptions: { runes: true } }`.
- **Pitfall:** Don't add the `@sveltejs/adapter-*` field. That's SvelteKit's config shape. Plain Svelte's config is a much smaller surface.

### 0.5 `tsconfig.json`

- **Why:** Strict mode catches the invariant violations that bite incremental games hardest (NaN propagation, `undefined` resource keys, off-by-one in cost curves).
- **File:** `/home/klop/projects/active/disinfogame/tsconfig.json`

Settings to lock:

- `"strict": true`
- `"noUncheckedIndexedAccess": true` — *critical* — forces `state.resources[id]` to be typed as `Resource | undefined`, surfacing the typo class of bug that ruins playtest sessions.
- `"noImplicitOverride": true`
- `"exactOptionalPropertyTypes": true`
- `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`
- `"lib": ["ES2022", "DOM", "DOM.Iterable"]`
- `"verbatimModuleSyntax": true` — keeps the `import type` boundary explicit (matters for the sim, which must not pull in `.svelte.ts`).
- `"types": ["vite/client", "node"]`
- `"isolatedModules": true`
- `"skipLibCheck": true`
- Add a sibling `tsconfig.node.json` for `vite.config.ts` + `scripts/sim.ts` if `svelte-check` complains about Node globals.
- **Pitfall:** Do not enable `useDefineForClassFields`-quirky downgrades; they create surprises with runes' under-the-hood class instances.

### 0.6 GitHub Actions deploy workflow

- **Why:** Pages-native deploy via `actions/deploy-pages` is the 2026 standard — no `gh-pages` branch hackery, no `peaceiris/actions-gh-pages`. Two-job pipeline (build → deploy) is the official template.
- **File:** `/home/klop/projects/active/disinfogame/.github/workflows/deploy.yml`

Sections to include (described):

1. **`name`**: `Deploy to GitHub Pages`.
2. **`on`**: `push` to `main`, plus `workflow_dispatch` for manual reruns.
3. **`permissions`** (top-level): `contents: read`, `pages: write`, `id-token: write`. The `id-token: write` is what `deploy-pages` uses for OIDC; missing it is the #1 reason first-time setups fail.
4. **`concurrency`**: `group: "pages"`, `cancel-in-progress: false`. We never want two deploys racing; never want a deploy to die mid-upload.
5. **`jobs.build`**:
   - `runs-on: ubuntu-latest`.
   - Steps:
     - `actions/checkout@v4`.
     - `pnpm/action-setup@v4` with `version: 9` (or current).
     - `actions/setup-node@v4` with `node-version: 22` and `cache: 'pnpm'`.
     - `pnpm install --frozen-lockfile`.
     - `pnpm typecheck` — fail fast on type errors before building.
     - `pnpm test` — invariants gate the deploy (once Phase 1 lands).
     - `pnpm build`.
     - `actions/configure-pages@v5` — picks up the repo's Pages base path; OK to be after the build because it only emits metadata for the next step.
     - `actions/upload-pages-artifact@v3` with `path: dist`.
6. **`jobs.deploy`**:
   - `needs: build`.
   - `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`.
   - `runs-on: ubuntu-latest`.
   - Single step: `actions/deploy-pages@v4` with `id: deployment`.
- **Pitfall (PLAN §6k — "first deploy 404"):** GH Pages must be set in repo Settings → Pages → **Source: GitHub Actions** (not "Deploy from branch"). Workflow can't switch this — do it once manually on the repo before pushing.
- **Pitfall:** Don't commit a `CNAME` file. We're on the default `*.github.io` host, no custom domain.

### 0.7 `README.md`

- **Why:** Two-screen smoke doc. Future-you (and anyone else) needs to know how to run, build, deploy, and what the project is.
- **File:** `/home/klop/projects/active/disinfogame/README.md`

Sections, kept tight:

1. **What it is** — one paragraph: "Incremental disinfo-media-empire sim with a third-act inoculation reveal. Built with Svelte 5 + Vite. Deployed to GH Pages."
2. **Local dev** — `pnpm install`, `pnpm dev`.
3. **Scripts** — bulleted list mirroring §0.2.
4. **Architecture pointer** — one line: "See `PLAN.md` for design intent; `RUNBOOK.md` for build order."
5. **Deploy** — "Push to `main`; GH Actions does the rest. Live at https://chrisklop.github.io/disinfogame/."

- **Pitfall:** Don't drop screenshots in until v0.2 — they go stale within a day during heavy iteration.

### 0.8 `.gitignore` + `.editorconfig`

- **File:** `/home/klop/projects/active/disinfogame/.gitignore`

Entries:

```
node_modules
dist
.vite
.svelte-kit
.DS_Store
*.log
.env
.env.*
!.env.example
coverage
```

- **File:** `/home/klop/projects/active/disinfogame/.editorconfig`

Entries: UTF-8, LF, 2-space indent for `ts/svelte/json/css/yml`, final-newline, trim-trailing-whitespace.

- **Pitfall:** **Do not** ignore `pnpm-lock.yaml`. CI's `--frozen-lockfile` depends on it.

### 0.9 First-deploy smoke test

- **Why:** Prove the pipeline works on an empty payload before adding engine code — that way, if a future deploy breaks, we know it's the code, not the infra.
- **Files:**
  - `/home/klop/projects/active/disinfogame/index.html` — minimal HTML with `<div id="app"></div>` and `<script type="module" src="/src/main.ts">`. Title: "Inoculate".
  - `/home/klop/projects/active/disinfogame/src/main.ts` — imports `App.svelte`, mounts via Svelte 5's `mount(App, { target: document.getElementById('app')! })`. (Note: `new App({ target })` is the Svelte 4 API — gone in 5.)
  - `/home/klop/projects/active/disinfogame/src/App.svelte` — literally `<h1>Inoculate</h1>` inside `<main>`. No script block needed.

**Smoke checklist:**

- [ ] `pnpm dev` renders the `<h1>` at `http://localhost:5173/disinfogame/`.
- [ ] `pnpm build` produces `dist/index.html` with the correct `/disinfogame/` asset prefixes.
- [ ] `pnpm preview` serves it locally and the `<h1>` is visible.
- [ ] Create GitHub repo `disinfogame`. Repo Settings → Pages → Source = GitHub Actions.
- [ ] `git push -u origin main`. Watch the Actions tab.
- [ ] After successful run, https://chrisklop.github.io/disinfogame/ shows the heading. **No 404, no MIME-type errors in console** (a sign `base` is wrong).

- **Pitfall (PLAN §6k):** If you see `Failed to load module script ... MIME type "text/html"`, that's almost always `base` mismatched against the actual subpath. Don't guess — open `dist/index.html` and confirm asset URLs start with `/disinfogame/`.

---

## Phase 1 — Engine: store, tick, save, offline

**Target: 2–3 days. Definition of done: tick loop runs at 100 ms, save round-trips, offline catch-up correct, sim drives state to a Phase-1 (Grassroots) victory headlessly, invariants test green.**

> Architectural commitment (per PLAN §12.1): **all game logic lives in plain `.ts` files** under `src/game/`. The Svelte runes wrappers (`*.svelte.ts`) hold the reactive cell and call into the pure logic. `scripts/sim.ts` imports only the plain `.ts` modules — never `.svelte.ts`. This is non-negotiable; violating it means the sim won't run.

### 1.1 `src/game/types.ts` — `GameState` shape

- **Why:** Centralize the type. Every other module imports it. Defining it first is the cheapest way to surface design ambiguities (PLAN §2's resource set is the source of truth).
- **File:** `/home/klop/projects/active/disinfogame/src/game/types.ts`

Fields to define on `GameState` (specific to Phase 1 Inoculate; reserve room for Phase 2+):

- `version: 1` — literal type, gates `save.ts` migrations.
- `startedAt: number` — epoch ms; for total-playtime stat.
- `lastTick: number` — epoch ms; offline calc uses this.
- `phase: 'grassroots' | 'blog' | 'social' | 'influencer' | 'cable' | 'aisaturation'` — start `'grassroots'`. Phase 1 only ever sees this stay `'grassroots'`, but the union is forward-compatible.
- `resources: Record<ResourceId, number>` where `ResourceId = 'attention' | 'engagement' | 'followers' | 'credibility' | 'narrativeDominance' | 'syntheticReality'`. Phase 1 only mutates `attention` and (gated) `engagement`, but the full set exists from day one — zeros for unused.
- `caps: Record<ResourceId, number>` — per-resource cap, computed from upgrades. Snapshot here so save/load is self-contained; tick refreshes it.
- `upgrades: Record<UpgradeId, { level: number }>` — `UpgradeId` is a string-literal union exported alongside; Phase 1 ships ~5 IDs (`sockPuppet`, `bloggerHire`, `cms`, `handler`, `rssAggregator`).
- `assets: Record<AssetId, { count: number }>` — Phase 1: `anonymousBlogger`, `sockPuppet`, plus Phase-2 placeholders zeroed.
- `platforms: Record<PlatformId, { heat: number; burned: boolean; burnedUntil: number }>` — `PlatformId = 'facebook' | 'x'` for MVP. `heat ∈ [0, 1]`. Phase 1 wires the field but heat stays ~0; the heat tick still runs to validate the math.
- `cure: number` — `[0, 1]`, soft-capped at `0.4` in Phase 1 (PLAN §12.4).
- `handlers: { hired: number; demandedLastTick: number; laborFraction: number }` — the §3.3 capacity gate.
- `flags: { offlineBuffUntil: number; offlineBuffMultiplier: number }` — return-buff state (§1.5).
- `log: Array<{ t: number; msg: string; tag?: string }>` — bounded ring buffer (cap ~200), oldest dropped on push.
- `stats: { totalTicks: number; totalAttentionEver: number }` — sim victory checks read these.

Also export:

- `ResourceId`, `UpgradeId`, `AssetId`, `PlatformId` string-literal unions.
- `type Phase = GameState['phase']`.
- `RESOURCE_IDS: readonly ResourceId[]` const — used by tick loops to iterate deterministically.
- **Pitfall (PLAN §6k — number drift):** Every numeric field starts at exactly `0`, not `undefined`. With `noUncheckedIndexedAccess` on, any `Record<K, number>` indexed by a runtime string returns `number | undefined`, so the loops must use the typed `RESOURCE_IDS` array, not `Object.keys`.

### 1.2 `src/game/state.svelte.ts` — runes container

- **Why:** This is the only file that wraps the plain logic with Svelte reactivity. Keeping it thin means future renderer swaps (or the sim) don't touch logic.
- **File:** `/home/klop/projects/active/disinfogame/src/game/state.svelte.ts`

Contents (described):

- `import { initialState } from './init'` (plain `.ts`, see 1.2a).
- `import type { GameState } from './types'`.
- `export const game = $state<GameState>(initialState())`.
- `export function hydrate(snapshot: GameState) { Object.assign(game, snapshot); }` — re-uses the same reactive cell rather than reassigning the export binding (which would break consumers).
- No tick logic, no save logic — those import `game` and mutate it.

**1.2a** Create a sibling `src/game/init.ts` (plain TS) that exports `initialState(): GameState`. The sim and the runes container both import it. Keeps the shape's source of truth out of the `.svelte.ts` file.

- **Pitfall (PLAN §6k — "stale closure on hydrate"):** **Never** do `export let game = $state(...)` then later `game = newSnapshot`. Reassigning the binding does not propagate to importers in Svelte 5. Always mutate in place via `Object.assign` or per-key writes.

### 1.3 `src/game/save.ts` — versioned localStorage

- **Why:** Lock the storage key + version *now*. Cheap to define a migration scaffold; ruinous to retrofit one after v0.1 ships and real saves exist.
- **File:** `/home/klop/projects/active/disinfogame/src/game/save.ts`

Responsibilities:

- Export `const SAVE_KEY = 'inoculate:save:v1'` — exact string from PLAN §1.
- `serialize(state: GameState): string` — `JSON.stringify`; nothing exotic (no `Date`, no `Map` — types §1.1 are all JSON-safe by construction).
- `deserialize(raw: string): GameState | null` — `try/catch`, schema-version check, return `null` on any failure (let caller fall back to `initialState()`).
- `migrate(parsed: unknown): GameState | null` — switch on `parsed.version`. For Phase 1 the only valid version is `1` → return as-is. Scaffold a `case 0:` placeholder that throws "no v0 saves exist" so we have the migration shape in muscle memory.
- `write(state: GameState): void` — `localStorage.setItem(SAVE_KEY, serialize(state))`. Wrap in `try/catch` (quota exceeded, private-mode Safari, etc.); on failure, push a log line into `game.log` and disable further writes for the session (avoid stacking errors).
- `read(): GameState | null` — `localStorage.getItem(SAVE_KEY)` → `deserialize`.
- `clear(): void` — for the eventual "wipe save" UI affordance and tests.
- **Throttling lives in `tick.ts`, not here.** Save module is pure I/O.
- **Pitfall (PLAN §6k — save corruption):** Always check `typeof window !== 'undefined' && 'localStorage' in window` at module init; the sim runs under Node and must not crash on import. Export a no-op fallback when storage is absent.
- **Pitfall:** Never log the full state to console on save failure — saves contain enough state to be huge by v0.2.

### 1.4 `src/game/tick.ts` — 100 ms loop

- **Why:** Single source of game-time. The 100 ms cadence (10 ticks/sec) is the PLAN §1 data-flow contract; cost/cap math is sized around it.
- **File:** `/home/klop/projects/active/disinfogame/src/game/tick.ts`

Responsibilities:

- Export `start(): () => void` — kicks off `setInterval`, returns a stop fn (used by tests and HMR cleanup).
- Internal `tick(nowMs: number)` function does, **in this exact order** (per PLAN §1 cascade + §6d):
  1. Compute `dt` in seconds from `game.lastTick`. Clamp `dt` to `[0, 30]` to defend against tab-throttling spikes (anything bigger → route through `offline.ts` on resume instead).
  2. Run phase tick (`grassroots` only in Phase 1). Phase modules live in `src/game/phases/grassroots.ts` — pure functions `(state, dt) => void` that mutate.
  3. Resource conversions cascade in the PLAN §2.5 order: Attention → Engagement → Followers → … . Phase 1 only Attention→Engagement actually has nonzero rate; the rest no-op due to zero `level` on their conversion buildings, but the calls happen.
  4. Per-platform heat tick (`heat.ts`). Phase 1 sources are ~zero, but the decay math runs to keep the per-platform field in [0,1].
  5. Cure tick (`cure.ts`). Soft-clamped to `0.4` in Phase 1.
  6. Handler labor calc: recompute `handlers.laborFraction` from current asset counts.
  7. Stats: `state.stats.totalTicks++`, `totalAttentionEver += producedAttentionThisTick`.
  8. Save throttle: if `nowMs - lastSaveMs >= 5000`, call `save.write(game)` and update `lastSaveMs`. (PLAN §1 contract.)
  9. Set `game.lastTick = nowMs`.
- The `setInterval` callback is just `tick(Date.now())`.
- **Pitfall (PLAN §6k — "double-tick on HMR"):** Every `start()` must remember the interval handle and `clearInterval` it on the returned cleanup fn. In `main.ts`, call `start()` once; under Vite HMR, dispose the previous tick before re-mounting. Otherwise dev sessions accumulate ghost intervals and the game runs at 2×, 4×, 8×… real time.
- **Pitfall:** Do **not** use `requestAnimationFrame`. Background tabs throttle it to 1 Hz; you want a deterministic 10 Hz that the offline-catchup logic can reason about. `setInterval` with the spike-clamp in step 1 is correct.

### 1.5 `src/game/offline.ts` — catch-up + return buff

- **Why:** Idle games stand or fall on offline UX. PLAN §6f spec: when the player returns after a gap, simulate the gap up to a 30-min cap, then grant a 2-minute buff at +25% production on resume.
- **File:** `/home/klop/projects/active/disinfogame/src/game/offline.ts`

Responsibilities:

- `applyOffline(state: GameState, nowMs: number): { simulatedSec: number; buffApplied: boolean }` — called once on `main.ts` startup (and after a long `dt` clamp in `tick.ts`).
- Compute `elapsedSec = (nowMs - state.lastTick) / 1000`. If `< 30`, no-op.
- Cap `elapsedSec` at `30 * 60 = 1800` seconds (PLAN §6f hard cap).
- Simulate by running the same per-tick logic in a tight loop at a coarser step (e.g., 1 s steps to keep it fast — 1800 iterations max). **Re-use** the same conversion fns; do not write a parallel offline formula or the two will drift.
- Skip side effects that don't belong offline: no log spam (push one summary line at the end), no save write (the tick loop will pick it up).
- Set `state.flags.offlineBuffUntil = nowMs + 2 * 60 * 1000` and `state.flags.offlineBuffMultiplier = 1.25`. The tick's production fns read these and multiply.
- Buff expires automatically when `nowMs > offlineBuffUntil`; production code treats expired buff as `1.0`.
- **Pitfall (PLAN §6k — "offline exploit"):** Do **not** apply the 25% buff to the *offline simulation itself* — only to the live ticks after return. Otherwise players close the tab to compound it. The buff is a UX nudge to come back, not a mechanic to optimize.
- **Pitfall:** Coarse-stepping the offline sim means cap clamping must run *inside* the loop, not once at the end — else a fast-producing resource overflows its cap mid-loop and we lose the lossy-conversion behavior.

### 1.6 `scripts/sim.ts` — headless greedy player

- **Why:** The sim is the engine's regression test. It must run on plain Node, import only `.ts` (never `.svelte.ts`), and prove the loop closes. PLAN §12.9 says full-loop victory = first prestige; for Phase 1 we relax to "reach the Phase 1 exit predicate" since prestige doesn't land until later in Phase 1's scope.
- **File:** `/home/klop/projects/active/disinfogame/scripts/sim.ts`

Architecture:

- Imports: `initialState` from `src/game/init.ts`; pure tick step from `src/game/tick.ts` (refactor: extract `stepTick(state, dt)` as a pure function, and have the runes tick loop call it — the sim calls it directly in a `while` loop).
- Imports `chooseGreedyAction(state): Action | null` from `src/game/sim/greedy.ts` (new plain-TS module). Returns the highest-payback-per-cost upgrade/asset the state can currently afford, or `null` if no action improves expected rate.
- Main loop:
  - `let state = initialState()`.
  - `let simSec = 0; const dt = 0.1; // 100ms ticks`.
  - `while (!phase1Victory(state) && simSec < 10 * 60)` — 10-minute wall-clock-equivalent ceiling; if it exceeds, exit non-zero (regression).
  - Each iteration: `stepTick(state, dt); simSec += dt;` plus every ~1 sim-second, try `chooseGreedyAction` and apply.
- `phase1Victory(state)` predicate: `state.resources.attention >= 500 && state.upgrades.editorialCalendar?.level >= 1` (the PLAN §7 Grassroots → Blog gate). Sim exits *after* purchasing the paradigm-shift project that unlocks Blog.
- Print: peak rates per resource, total sim-seconds, total real-time-equivalent (sim-sec / 1.0), wall-clock ms spent. Exit `0` on victory, `1` on timeout.
- **Pitfall (PLAN §6k — sim/live drift):** The sim must call the *same* `stepTick` the live game does. If you find yourself writing a "sim-only" version of a conversion, stop and refactor — the moment those two paths diverge, the sim stops being a regression test.
- **Pitfall:** Do not import `state.svelte.ts` from the sim, even by accident via a barrel `index.ts`. `tsx` will try to parse `$state` and fail. The strict `verbatimModuleSyntax` + module structure makes this surface fast.

### 1.7 `tests/invariants.test.ts` — Vitest invariants

- **Why:** Cheap, fast assertions that catch the four numeric bugs that ruin incremental games (PLAN §6k): negative resources, NaN propagation, cap violations, conversion over-spend.
- **File:** `/home/klop/projects/active/disinfogame/tests/invariants.test.ts`

Assertions to write (each as its own `it(...)`):

1. **No resource ever goes negative.** Run `stepTick` 1000 times from `initialState()` with no input. Assert `RESOURCE_IDS.every(id => state.resources[id] >= 0)`.
2. **No NaN anywhere.** After 1000 ticks, assert no value in `state.resources`, `state.caps`, `state.platforms.*.heat`, `state.cure`, or `state.handlers.laborFraction` is `NaN`.
3. **Caps respected.** For each resource, `state.resources[id] <= state.caps[id] + ε` (ε ~ 1e-6).
4. **Conversion conservation.** Construct a synthetic state with attention=100, run one conversion tick, assert `attentionConsumed === producedEngagement / ratio` within ε.
5. **Cost curve monotonicity (Invariant 1, PLAN §2.4).** For each upgrade, `cost(L+1) > cost(L)` for L in `[0, 50]`.
6. **Cap growth ≥ cost growth after paradigm shift.** Once the paradigm project flag is set, assert `capGrowth >= g` for the affected resource.
7. **Save round-trip.** `deserialize(serialize(state))` deep-equals `state`.
8. **Offline buff caps at 30 minutes.** Call `applyOffline` with a 2-hour gap; assert simulated time is exactly 1800s.
9. **Offline buff does not apply to the offline sim.** Run two parallel sims, one with `applyOffline(state, now + 30min)` and one stepping live for 30 min — within a tolerance, end states match (no compounding from the buff on the offline portion).
10. **Heat stays in [0,1].** After 1000 ticks under adversarial asset config, every platform `heat ∈ [0, 1]`.
11. **Cure monotonic in Phase 1.** `cure` only ever increases or stays equal across consecutive ticks (PLAN §6.3). And never exceeds `0.4` in Phase 1 (the soft cap).

- **Pitfall:** Use `vitest`'s `expect(...).toBeCloseTo(..., 6)` for any float comparison — strict `===` will bite within 100 ticks.

### 1.8 Phase 1 Acceptance Criteria

A skilled dev should be able to check off every box below before declaring Phase 1 done.

- [ ] **AC-1: Tick cadence.** `setInterval` fires every 100 ms ±10 ms (measure via `performance.now()` deltas over 100 samples in dev console).
- [ ] **AC-2: Tick order.** Ordered cascade from §1.4 is implemented; `stepTick` is a pure function callable from the sim.
- [ ] **AC-3: Save throttle.** `localStorage` write occurs at most once per 5 s during continuous play. Verify by spying `localStorage.setItem` in a dev session for 30 s — expect ≤ 7 writes.
- [ ] **AC-4: Save round-trip.** Reload the page; `game.resources`, `upgrades`, `assets`, `platforms`, `cure`, `phase`, `stats.totalTicks` all restore to within 1-tick of pre-reload values.
- [ ] **AC-5: Offline catch-up.** Set `lastTick` 10 minutes in the past via DevTools, reload — resources advance by ~10 minutes' worth of production, capped at 30 min. Log line confirms offline duration.
- [ ] **AC-6: Return buff.** Within 2 minutes after an offline-triggered resume, production rates are 1.25× the steady-state rate; revert exactly at 120 s.
- [ ] **AC-7: Sim victory.** `pnpm sim` completes a Phase-1 victory (Attention ≥ 500 + Editorial Calendar purchased) in **< 5 s of wall time** and exits `0`. Print includes `victory=true` + sim-sec count.
- [ ] **AC-8: Invariants green.** `pnpm test` runs `tests/invariants.test.ts`; all 11 assertions pass.
- [ ] **AC-9: No NaN, no negatives.** Open dev console after 5 min of idle play; manually inspect `game` — no `NaN`, no negative values.
- [ ] **AC-10: HMR sane.** Editing `src/game/tick.ts` during `pnpm dev` does not produce ghost intervals (tick rate stays ~10 Hz after 5 edits — measure via console).
- [ ] **AC-11: Sim/live parity.** The same initial state + same actions, run for 60 sim-sec headless and 60 wall-sec live, yields identical final `state.resources` within ε=1e-6. (One-off manual test; lock as a vitest case if time permits.)
- [ ] **AC-12: GH Pages deploy passes type + test gates.** Push to `main` — Actions runs `typecheck`, `test`, `build`, `deploy-pages` in sequence. The live site is reachable and `localStorage` keys are namespaced `inoculate:save:v1`.

When all twelve are checked, Phase 1 is done and Phase 2 (UI primitives + DEPICT tree wiring) can start on top of a known-good engine.

---

## Appendix: cross-cutting reminders pulled from PLAN §6k

- **Adapter trap** — never reach for SvelteKit.
- **Stale closure on hydrate** — mutate, don't reassign, the `$state` cell.
- **Sim/live drift** — one `stepTick`, two callers.
- **Offline exploit** — buff applies only post-resume, never inside the offline sim.
- **Tooling churn** — `tsx` for Node-side TS; no `ts-node`, no `--loader` flags.
- **First-deploy 404** — Settings → Pages → Source = GitHub Actions, set once.
- **Number drift** — iterate via typed `RESOURCE_IDS` const, not `Object.keys`.
- **Double-tick on HMR** — dispose the interval on cleanup; one `start()` per session.
- **Save corruption** — guard `localStorage` access; never crash on import under Node.

# Vibe Coder — Developer's Guide

This guide covers the toolchain setup, directory layout, architectural
boundaries, and contribution conventions for the Vibe Coder codebase.

For the product thesis, simulation design, and domain model, see
`docs/vibe-coder-high-level-design.md`. For per-decision rationale, see the
ADRs in `docs/adr-*.md`. For the delivery roadmap, see `docs/roadmap.md`.

______________________________________________________________________

## Toolchain requirements

<!-- markdownlint-disable MD013 MD060 -->

| Tool              | Minimum version | Purpose                                              |
| ----------------- | --------------- | ---------------------------------------------------- |
| Bun               | 1.3.0           | Package runner, bundler, and test runner.            |
| Node.js           | 20 LTS          | Required by some build plugins.                      |
| Python 3 via `uv` | any             | Runs `semgrep` through `uvx semgrep`.                |
| `uv`              | 0.4+            | Python package runner; installs `semgrep` on demand. |

<!-- markdownlint-enable MD013 MD060 -->

Install `uv` from <https://docs.astral.sh/uv/>. All other dependencies are
managed by Bun.

```sh
# Install project dependencies
bun install

# Build the design-token pipeline (required before running the dev server)
bun tokens:build
```

The `tokens/dist/` directory is not tracked in git. Rebuild it whenever
`tokens/src/themes/*.json` changes.

ADR 001 records Bun as the accepted package runner and the Vite PWA plugin as
the initial service-worker strategy. Service-worker implementation work should
start from plugin-managed app-shell precaching, manifest integration,
installability checks, and standard update handling. Custom worker code is a
later extension only when required runtime behaviour cannot be expressed
through plugin configuration.

______________________________________________________________________

## Development workflow

### Starting the dev server

```sh
bun dev
```

### Running all commit gates

Gates must pass before every commit. Run them sequentially — the codebase uses
build caching that benefits from sequential execution.

```sh
make check-fmt   # Format check (Biome formatter)
make lint        # Biome lint + stylelint
make typecheck   # tsc --noEmit
make test        # bun test (unit + component tests)
bun semantic     # Full semantic lint pass
```

### What `bun semantic` does

`bun semantic` runs a six-stage semantic lint pipeline:

1. **Biome CI** — enforces import ordering, unused-variable rules, and style.
2. **Class list length check** — rejects Tailwind class stacks that are too
   long to maintain; extract these to a CSS component class instead.
3. **Near-duplicate class check** — detects Tailwind class stacks that appear
   in multiple files with only minor variation; these are candidates for shared
   CSS component classes.
4. **Hardcoded-string check** — flags user-visible string literals that should
   be internationalized via the i18n pipeline.
5. **Semgrep** — runs the custom rule set in `tools/semgrep-semantic.yml`
   against TypeScript source and test files. Requires `uvx` (provided by `uv`).
6. **Stylelint** — validates CSS files against `tools/stylelint.config.cjs`.

______________________________________________________________________

## Directory structure and boundary rules

### High-level layout

```text
src/
  app/           # React shell, routing, providers, layout (inbound adapter)
  domain/        # Domain model, pure simulation rules, driven-port interfaces
    model/
    services/
    rules/
    ports/
  application/   # XState machines, application services, selectors
    machines/
    commands/
    selectors/
  adapters/      # Concrete driven-adapter implementations
    persistence/
    rng/
    audio/
    render/
    assets/
  i18n.ts        # i18next initialization and locale loading
  global.d.ts    # Module augmentations (SVG, CSS, i18next namespace)
  index.css      # Root stylesheet (design tokens + Tailwind base)
  main.tsx       # Application entry point

tests/
  *.test.tsx     # Unit and component tests
  e2e/           # Playwright end-to-end tests
  utils/         # Shared test utilities
  support/       # Test environment helpers (i18n harness, etc.)
  setup-*.ts     # Bun test preload files

tokens/
  src/themes/    # Design-token source JSON (day and night themes)
  scripts/       # Token build scripts
  dist/          # Generated CSS and TS token output (not tracked in git)

tools/           # Semantic lint scripts, semgrep rules, stylelint config
docs/            # HLD, ADRs, roadmap, user and developer guides
public/          # Static assets: locale files, fonts, icons
```

The `src/adapters/` tree above lists the current 1.2.1 skeleton. The adapter
matrix below also names planned adapter families such as `clock/` and
`telemetry/`; add those directories when their corresponding ports are
implemented.

### Path aliases

Use repository-local aliases when adding new imports across package boundaries:

<!-- markdownlint-disable MD013 MD060 -->

| Alias            | Target              | Intended use                                  |
| ---------------- | ------------------- | --------------------------------------------- |
| `@domain/*`      | `src/domain/*`      | Domain model, rules, services, and ports      |
| `@application/*` | `src/application/*` | Application machines, commands, and selectors |
| `@adapters/*`    | `src/adapters/*`    | Concrete adapter implementations              |

<!-- markdownlint-enable MD013 MD060 -->

`tools/path-aliases.ts` is the source of truth for the alias tuple. The
TypeScript configuration, Vite resolver, custom import-boundary guard, and
Biome configuration tests all validate against that tuple. Do not add an alias
directly to only one consumer.

Existing relative imports were deliberately left in place when the aliases were
introduced. Migrate imports opportunistically with the feature work that
touches the files; avoid a standalone churn-only rewrite.

### The three domain layers

The codebase follows hexagonal architecture. Import direction is strictly
one-way:

```text
adapters  →  application  →  domain
                           ↑
                     (ports defined here)
```

<!-- markdownlint-disable MD013 MD060 -->

| Layer       | File path          | May import from     | Must not import from                                |
| ----------- | ------------------ | ------------------- | --------------------------------------------------- |
| Domain      | `src/domain/`      | nothing (pure)      | application, adapters, app, React, Dexie, Web Audio |
| Application | `src/application/` | domain only         | adapters, app, React DOM, Dexie                     |
| Adapters    | `src/adapters/`    | domain, application | React component tree (use ports instead)            |
| App shell   | `src/app/`         | all layers          | must not contain business rules                     |

<!-- markdownlint-enable MD013 MD060 -->

Boundary enforcement has two layers:

- Biome `noRestrictedImports` overrides provide fast feedback for literal
  alias, `src/`-relative, and bare layer-package imports in `src/domain/**` and
  `src/application/**`.
- The custom TypeScript import guard remains authoritative. It resolves
  relative imports, understands the path aliases, and runs through
  `bun run lint:imports` and `bun semantic`.

If Biome and the custom guard disagree, treat the Biome configuration as the
bug. The AST guard is the canonical boundary rule because it resolves the
actual import graph.

`src/app/` remains the inbound-adapter shell and may import every layer. It
must not accumulate business rules; that gap is tracked for later architecture
work rather than enforced by the 1.2.1 boundary skeleton.

### Domain layer contents

The domain layer contains:

- **Value types**: `RunState`, `Resources`, `TechDebtVector`,
  `AllocationPolicy`, `EthicsPolicy`, and the remaining aggregates from the HLD.
- **Pure simulation functions**: `simulateTick` and its constituent rule
  functions. These must not import React, Dexie, Web Audio, or any browser API.
- **Port interfaces**: The six driven ports —
  `GameStateRepository`, `Clock`, `RandomSource`, `AudioEventSink`,
  `AssetCatalogue`, and `TelemetrySink`. Interfaces live in `domain/ports/`.
  Adapters implement them in `src/adapters/`.

### Application layer contents

- **XState machines**: `app.machine`, `run.machine`, `policy.machine`,
  `event.machine`, `progression.machine`, and `audio.machine`. All machines
  live in `src/application/machines/`. ADR 003 accepts this centralized
  placement because these machines coordinate application workflows that cross
  feature UI boundaries.
- **Machine model tests**: the first machine harness uses XState v5 graph
  utilities from `xstate/graph` under Bun tests. Prefer graph-generated path
  coverage for reachability and impossible-state checks before wiring machines
  into React views. App machines may expose named XState action IDs for
  observability, but logging and metrics implementations must be provided at
  the app shell or adapter composition boundary, not imported into
  `src/application/machines/`.
- **Application services**: `startRun`, `applyPolicy`, `resolveEvent`, and
  similar use-case entry points. These orchestrate ports and machines but do
  not contain domain equations.
- **Selectors**: Read-only projections of `RunState` into UI-friendly shapes.

### Adapter layer contents

Concrete implementations of the driven ports:

<!-- markdownlint-disable MD013 MD060 -->

| Port                  | Adapter location                                 |
| --------------------- | ------------------------------------------------ |
| `GameStateRepository` | `adapters/persistence/dexie-*.ts`                |
| `Clock`               | `adapters/clock/browser-clock.ts`                |
| `RandomSource`        | `adapters/rng/sfc32.ts` (planned; roadmap 1.3.3) |
| `AudioEventSink`      | `adapters/audio/web-audio-engine.ts`             |
| `AssetCatalogue`      | `adapters/assets/manifest-loader.ts`             |
| `TelemetrySink`       | `adapters/telemetry/local-analytics.ts`          |

<!-- markdownlint-enable MD013 MD060 -->

Stub in-memory adapters (for tests) live alongside their real counterparts.

______________________________________________________________________

## Ports and adapters — conventions

### Defining a port

Ports are TypeScript interfaces in `src/domain/ports/`. They describe what the
application needs from infrastructure — not how that infrastructure works.

```typescript
// src/domain/ports/game-state-repository.ts
export interface GameStateRepository {
  save(run: RunState): Promise<void>;
  load(id: RunId): Promise<RunState | undefined>;
  list(): Promise<readonly RunSummary[]>;
}
```

A port must:

- Contain only types, interfaces, and type aliases.
- Not import from `adapters/`, `application/`, or any browser API.
- Use async return types only when the operation genuinely requires I/O.

### Implementing an adapter

Adapters implement port interfaces and live in `src/adapters/`.

```typescript
// src/adapters/persistence/dexie-game-state-repository.ts
import type { GameStateRepository } from "../../domain/ports/game-state-repository";

export class DexieGameStateRepository implements GameStateRepository {
  // ...
}
```

An adapter:

- Must implement one port interface per class.
- May import from domain and application layers.
- Must not contain domain rules or business logic.
- Must be independently testable against its port contract using the in-memory
  stub as the reference implementation.

### In-memory stubs

Every port must have an in-memory stub alongside the real adapter. Stubs are
used in unit tests and in the self-play runner (which runs without a browser).

Name the stub `<port-name>-stub.ts` and place it adjacent to the real adapter.

______________________________________________________________________

## Test conventions

### Unit and component tests

Tests live in `tests/`. The file convention is `<subject>.test.tsx` or
`<subject>.test.ts`.

All tests use `bun:test`. The test runner preloads `tests/setup-happy-dom.ts`,
which:

- Sets up a happy-dom window environment.
- Stubs asset imports (PNG, SVG, etc.) so component tests do not require a
  bundler.
- Initializes i18next via `tests/support/i18n-test-runtime.ts` so components
  that use `useTranslation` work without network access.

The `renderWithProviders` helper in `tests/utils/render-with-providers.tsx`
wraps the component under test in `DisplayModeProvider` and `ThemeProvider`.
Use it for any component that reads theme or display-mode context.

### Snapshot tests

Snapshot files are stored next to the test in a `__snapshots__/` directory
managed by Bun. Snapshot strings (e.g., `main.innerHTML`) are preferred over
DOM element snapshots.

Run `bun test --update-snapshots` to regenerate stale snapshots after an
intentional DOM change.

### End-to-end tests

Playwright tests live in `tests/e2e/`. Run them with:

```sh
bun test:e2e          # requires a running dev server
bun test:e2e:container  # headless, no network
```

### Accessibility tests

Component accessibility checks use `@axe-core/playwright`. The
`tests/setup-vitest-a11y.ts` file registers the axe runner. Run:

```sh
bun test:a11y
```

______________________________________________________________________

## i18n conventions

User-visible strings must not be hardcoded in source files. The `bun semantic`
hardcoded-string check enforces this.

Translation keys follow kebab-case and are namespaced by feature:

```typescript
const { t } = useTranslation();
t("home-title");   // correct
t("homeTitle");    // avoid camelCase keys
```

Locale files are Fluent (`.ftl`) files in `public/locales/<locale>/`. The
default locale is `en`. Add new locales by adding a directory and registering
the locale in `src/app/i18n/supported-locales.ts`.

______________________________________________________________________

## Theme and token conventions

### Theme identifiers

The two built-in themes are `vibe-coder-night` and `vibe-coder-day`. Do not use
the legacy `vibecoder-*` form.

### localStorage key

The active theme is persisted under the key `vibe-coder.theme`. The provider
performs a one-time migration from the legacy `vibecoder.theme` key on mount.

### Rebuilding tokens

Token source files live in `tokens/src/themes/`. After editing them, rebuild:

```sh
bun tokens:build
```

This generates CSS custom properties and TypeScript token exports in
`tokens/dist/`. The output directory is not tracked in git.

### Visual design references

The [in-game design system](in-game-design-system.html) documents the component
palette, colour grammar, and layer composition that inform interface
implementation. The [game HUD mockup](vibe-coder-game-hud-mockup.html) is an
example of the in-game visuals showing the main dashboard layout and player
controls; treat it as the primary visual reference for run-screen
implementation.

______________________________________________________________________

## Determinism, randomness, and parameter packs

The simulation is deterministic. Given the same seed, parameter pack, command
sequence, and tick ordering, a run must reproduce. Two engineering rules follow
from this contract:

- The seeded pseudo-random number generator is **sfc32** (Chris
  Doty-Humphrey, in the bryc-2022 JavaScript reference port). Seeds are hashed
  with `xmur3` when supplied as strings, expanded to the 128-bit sfc32 state
  via four `SplitMix32` steps, and warmed with 12 discarded outputs.
  Independent substreams derive per feature; sfc32 has no jump-ahead by design.
  See ADR 005 for the rationale, the runner-up algorithm (`xoshiro128++`), and
  the golden-vector test discipline.
- Domain and application code must obtain randomness through the
  `RandomSource` port (introduced in roadmap item 1.2.2 and implemented in
  1.3.3). Direct calls to `Math.random`, `crypto.getRandomValues`,
  `crypto.randomUUID`, and `Date.now` are forbidden in those layers; the
  import-boundary linter will be tightened to enforce this when the port and
  adapter land. The property-test framework's own random number generator (RNG),
  `pure-rand` via `fast-check`, is intentionally decoupled from the game
  stream.

Every saved run carries pinned parameter-pack identity (`id`, `version`,
`contentHash`) and PRNG identity (`prngName`, `prngVariant`, `prngVersion`,
`prngState`) alongside the schema version, simulation-tick contract version,
seed, and event-log tail digest. The migration policy refuses silent
advancement: PATCH-only metadata edits may rebind silently when the
canonicalized numeric subset is byte-identical, MINOR bumps require an explicit
player-initiated upgrade prompt, and MAJOR bumps quarantine existing runs as
read-only and archive-only. Any PRNG change forces a parameter-pack MAJOR bump.
JSON exports embed the full pack body so that imports on another machine can
validate the hash. See ADR 005 for the full policy.

______________________________________________________________________

## CI pipeline

The CI workflow runs the same gate sequence as local development:

```text
check-fmt → lint → typecheck → test → spelling → bun semantic
```

The semantic lint job (`semantic-lint.yml`) uses `astral-sh/setup-uv@v8.2.0` to
install `uv`. It runs `make spelling` before the existing `bun semantic` gate,
without requiring a separate persistent Python environment.

The repository-owned Linux CI, semantic-lint, Pages build, and Pages deployment jobs
use the uncached shared Namespace profile `namespace-profile-default` (Ubuntu
22.04, amd64, 4 vCPU, 16 GB). The profile has no cache volume.

______________________________________________________________________

## ADR index

| ADR | Decision                                                    |
| --- | ----------------------------------------------------------- |
| 001 | Build an offline-first React PWA.                           |
| 002 | Adopt hexagonal architecture for domain boundaries.         |
| 003 | Use XState for workflow orchestration.                      |
| 004 | Persist runs with Dexie snapshots and event logs.           |
| 005 | Use deterministic simulation and parameter packs.           |
| 006 | Use adversarial self-play for parameter tuning.             |
| 007 | Keep the runtime interface authoritative and deterministic. |
| 008 | Use development-time image generation with asset promotion. |
| 009 | Use semantic audio events for reactive sound.               |
| 010 | Run fixed-tick simulation outside React rendering.          |
| 011 | Use TLA+ for self-play promotion safety.                    |

______________________________________________________________________

## Spelling conventions

The project uses Oxford -ize throughout:

- civilization
- visualization
- quantization
- optimization

Run `make spelling` to verify the generated `typos.toml` and scan tracked
Markdown. Use `make spelling-config-write` to regenerate the file from the
shared estate dictionary and `typos.local.toml` overlay. The shared
`typos-config-builder` CLI refreshes its untracked cache only when the remote
authority is newer. Never edit generated `typos.toml` by hand.

Design documents must use neutral phrasing — avoid first-person pronouns (`we`,
`our`, `I`, `us`).

# Vibe Coder — Developer's Guide

This guide covers the toolchain setup, directory layout, architectural
boundaries, and contribution conventions for the Vibe Coder codebase.

For the product thesis, simulation design, and domain model, see
`docs/vibe-coder-high-level-design.md`. For per-decision rationale, see the
ADRs in `docs/adr-*.md`. For the delivery roadmap, see `docs/roadmap.md`.

---

## Toolchain requirements

| Tool               | Minimum version | Purpose                                         |
| ------------------ | --------------- | ----------------------------------------------- |
| Bun                | 1.3.0           | Package runner, bundler, and test runner.        |
| Node.js            | 20 LTS          | Required by some build plugins.                 |
| Python 3 via `uv`  | any             | Runs `semgrep` through `uvx semgrep`.           |
| `uv`               | 0.4+            | Python package runner; installs `semgrep` on demand. |

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

---

## Development workflow

### Starting the dev server

```sh
bun dev
```

### Running all commit gates

Gates must pass before every commit. Run them sequentially — the codebase
uses build caching that benefits from sequential execution.

```sh
make check-fmt   # Format check (Biome formatter)
make lint        # Biome lint + stylelint
make typecheck   # tsc --noEmit
make test        # bun test (unit + component tests)
bun semantic     # Full semantic lint pass
```

### What `bun semantic` does

`bun semantic` runs a four-stage semantic lint pipeline:

1. **Biome CI** — enforces import ordering, unused-variable rules, and style.
2. **Class list length check** — rejects Tailwind class stacks that are too
   long to maintain; extract these to a CSS component class instead.
3. **Near-duplicate class check** — detects Tailwind class stacks that appear
   in multiple files with only minor variation; these are candidates for shared
   CSS component classes.
4. **Hardcoded-string check** — flags user-visible string literals that should
   be internationalized via the i18n pipeline.
5. **Semgrep** — runs the custom rule set in `tools/semgrep-semantic.yml`
   against TypeScript source and test files. Requires `uvx` (provided by
   `uv`).
6. **Stylelint** — validates CSS files against `tools/stylelint.config.cjs`.

---

## Directory structure and boundary rules

### High-level layout

```text
src/
  app/           # React shell, routing, providers, layout (inbound adapter)
  domain/        # Domain model, pure simulation rules, driven-port interfaces
  application/   # XState machines, application services, selectors
  adapters/      # Concrete driven-adapter implementations
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

### The three domain layers

The codebase follows hexagonal architecture. Import direction is strictly
one-way:

```
adapters  →  application  →  domain
                           ↑
                     (ports defined here)
```

| Layer         | File path         | May import from     | Must not import from      |
| ------------- | ----------------- | ------------------- | ------------------------- |
| Domain        | `src/domain/`     | nothing (pure)      | application, adapters, app, React, Dexie, Web Audio |
| Application   | `src/application/`| domain only         | adapters, app, React DOM, Dexie |
| Adapters      | `src/adapters/`   | domain, application | React component tree (use ports instead) |
| App shell     | `src/app/`        | all layers          | must not contain business rules |

Violations of these boundaries will be caught by Biome import rules once
import-boundary lint is configured (roadmap step 1.1.2).

### Domain layer contents

The domain layer contains:

- **Value types**: `RunState`, `Resources`, `TechDebtVector`,
  `AllocationPolicy`, `EthicsPolicy`, and the remaining aggregates from
  the HLD.
- **Pure simulation functions**: `simulateTick` and its constituent rule
  functions. These must not import React, Dexie, Web Audio, or any browser
  API.
- **Port interfaces**: The six driven ports —
  `GameStateRepository`, `Clock`, `RandomSource`, `AudioEventSink`,
  `AssetCatalogue`, and `TelemetrySink`. Interfaces live in
  `domain/ports/`. Adapters implement them in `src/adapters/`.

### Application layer contents

- **XState machines**: `app.machine`, `run.machine`, `policy.machine`,
  `event.machine`, `progression.machine`, and `audio.machine`. All machines
  live in `application/machines/`.
- **Application services**: `startRun`, `applyPolicy`, `resolveEvent`, and
  similar use-case entry points. These orchestrate ports and machines but do
  not contain domain equations.
- **Selectors**: Read-only projections of `RunState` into UI-friendly shapes.

### Adapter layer contents

Concrete implementations of the driven ports:

| Port                  | Adapter location                         |
| --------------------- | ---------------------------------------- |
| `GameStateRepository` | `adapters/persistence/dexie-*.ts`        |
| `Clock`               | `adapters/clock/browser-clock.ts`        |
| `RandomSource`        | `adapters/rng/mulberry32.ts`             |
| `AudioEventSink`      | `adapters/audio/web-audio-engine.ts`     |
| `AssetCatalogue`      | `adapters/assets/manifest-loader.ts`     |
| `TelemetrySink`       | `adapters/telemetry/local-analytics.ts`  |

Stub in-memory adapters (for tests) live alongside their real counterparts.

---

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

---

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

---

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

---

## Theme and token conventions

### Theme identifiers

The two built-in themes are `vibe-coder-night` and `vibe-coder-day`. Do not
use the legacy `vibecoder-*` form.

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

---

## CI pipeline

The CI workflow runs the same gate sequence as local development:

```
check-fmt → lint → typecheck → test → bun semantic
```

The semantic lint job (`semantic-lint.yml`) uses `astral-sh/setup-uv@v4` to
install `uv`, then runs `uvx semgrep` without a separate Python environment.
No other Python installation is required.

---

## ADR index

| ADR  | Decision                                                         |
| ---- | ---------------------------------------------------------------- |
| 001  | Build an offline-first React PWA.                                |
| 002  | Adopt hexagonal architecture for domain boundaries.              |
| 003  | Use XState for workflow orchestration.                           |
| 004  | Persist runs with Dexie snapshots and event logs.                |
| 005  | Use deterministic simulation and parameter packs.                |
| 006  | Use adversarial self-play for parameter tuning.                  |
| 007  | Keep the runtime interface authoritative and deterministic.      |
| 008  | Use development-time image generation with asset promotion.      |
| 009  | Use semantic audio events for reactive sound.                    |
| 010  | Run fixed-tick simulation outside React rendering.               |
| 011  | Use TLA+ for self-play promotion safety.                         |

---

## Spelling conventions

The project uses Oxford -ize throughout:

- civilization (not civilisation)
- visualization (not visualisation)
- quantization (not quantisation)
- optimization (not optimisation)

Design documents must use neutral phrasing — avoid first-person pronouns
(`we`, `our`, `I`, `us`).

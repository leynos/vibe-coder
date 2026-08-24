# Define the driven-port interfaces (roadmap 1.2.2)

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: DRAFT

## Purpose / big picture

Vibe Coder has a compilable hexagonal source tree (roadmap 1.2.1) but no
contracts that connect the simulation core to the outside world. This plan
defines the six **driven ports** — the interfaces the domain requires from
infrastructure — so that every later task (in-memory stubs 1.2.3, the seeded
random source 1.3.3, the Dexie repository 1.4.x, the audio bus 7.2.x, the asset
loader 8.3.x, self-play telemetry) converges on one stable set of seams instead
of reworking interfaces repeatedly.

The six ports are `GameStateRepository`, `Clock`, `RandomSource`,
`AudioEventSink`, `AssetCatalogue`, and `TelemetrySink`. They live in
`src/domain/ports/` per HLD §"Module layout" and
`docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
§"Decision outcome".

What an observer can verify after this change:

1. `bun check:types` compiles all six port files and their supporting value
   types under strict TypeScript.
2. `bun run lint:imports` reports no boundary violation, and a new guard proves
   no file under `src/domain/ports/` or `src/domain/model/` imports an adapter,
   an application module, or any third-party runtime package.
3. `bun test` passes a new suite that (a) proves each port is *implementable*
   (a trivial in-line fake satisfies it), (b) proves the barrel re-exports all
   six ports, (c) pins the strict-mode behaviours the ports depend on, and
   (d) proves the placeholder-honesty guard fires when a placeholder is made
   permissive or left behind.
4. `bun ff` (the full-fidelity gate: lint, types, unit, a11y, semantic lints,
   e2e) succeeds with no errors, failures, or violations.

This slice writes **no simulation equations and no runtime behaviour**. It is a
types-and-tooling change only.

## Constraints

Hard invariants. Violation requires escalation, not a workaround.

- **Boundary purity.** Files under `src/domain/ports/` and `src/domain/model/`
  must not import from `src/application/`, `src/adapters/`, `src/app/`, any
  browser API (React, React DOM, Dexie, Web Audio, IndexedDB, Canvas,
  service-worker APIs), or any third-party runtime package. Type-only imports
  must stay within `src/domain/`. Enforced by `bun run lint:imports` (extended)
  and Biome `noRestrictedImports`.
- **Ports contain only types.** Each port file contains only `interface`,
  `type`, and type-alias declarations — no classes, functions, constants, or
  runtime values. (Branded-type *constructors* are runtime helpers and belong in
  `src/domain/model/`, not in port files.)
- **No new dependencies.** Do not add `neverthrow`, `pure-rand`, `zod`/`valibot`,
  or any package. `pure-rand` is prior-art *inspiration* for the immutable RNG
  shape only; it must never be imported into domain code (ADR-005
  §"Property-test separation").
- **Determinism contracts hold.** `RandomSource` must be a pure, immutable,
  snapshot-serialisable contract consistent with the accepted sfc32 PRNG
  (ADR-005). `Clock` must not be reachable from the pure tick.
- **Roadmap placement is fixed.** All six interfaces live in
  `src/domain/ports/`, one file per port, per the explicit roadmap 1.2.2
  instruction and HLD §"Module layout".
- **Do not pre-empt task 1.3.1.** The rich domain aggregates (`RunState`,
  `Resources`, `TechDebtVector`, `AllocationPolicy`, `EthicsPolicy`,
  `AlignmentState`, `ProgressionState`, `UnlockLedger`, `ParameterPack`) are
  owned by roadmap 1.3.1 and its Valibot work. This plan introduces only
  *opaque, un-constructable placeholders* for the aggregates the ports must
  reference; it must not define their real shape.
- **`bun ff` must pass fully.** No errors, failures, or violations. Non
  negotiable.

## Tolerances (exception triggers)

Stop and escalate when any of these is breached:

- **Scope.** If implementation requires touching more than ~20 files or more
  than ~700 net lines (production + tests + tooling), stop and escalate.
- **Dependencies.** If any task seems to require a new runtime or dev
  dependency, stop and escalate.
- **Interface conflict.** If a port signature cannot be expressed without either
  (a) importing an adapter/browser type, or (b) leaking a storage detail
  (Dexie compound keys, schema-version integers, IndexedDB cursors) into the
  domain, stop and escalate.
- **Aggregate ownership.** If compiling a port appears to require defining the
  *real* shape of a 1.3.1 aggregate (more than an opaque brand), stop and
  escalate — that is 1.3.1's work.
- **Iterations.** If `bun ff` still fails after 5 focused attempts on the same
  milestone, stop and escalate.
- **CodeRabbit.** If a CodeRabbit review raises a concern that cannot be
  resolved without exceeding another tolerance, stop and escalate.

## Risks

- Risk: A permissive placeholder aggregate (`type RunState = unknown` /
  `Record<string, unknown>` / `{}`) lets downstream code compile against a lie,
  detonating when 1.3.1 lands the real shape.
  Severity: high. Likelihood: medium.
  Mitigation: placeholders are **opaque branded dead-ends** (`{ readonly
  __placeholder: "RunState@1.3.1" }`); a new guard bans `any`/`unknown`/bare
  `Record<string, unknown>` as types in `domain/model` and `domain/ports`.
- Risk: Placeholders silently survive into production because `@placeholder`
  is just a comment that nothing enforces.
  Severity: high. Likelihood: medium.
  Mitigation: a marker-budget guard (`scripts/check-domain-placeholders.ts`)
  counts markers against a checked-in budget and validates their format; each
  downstream task must drive its markers to zero. A forward-reference is added
  to roadmap 1.3.1's success criteria.
- Risk: The import-boundary guard's package ban is an allow-list-by-omission, so
  a port could import an arbitrary npm package (e.g. `pure-rand`) and pass.
  Severity: high. Likelihood: low.
  Mitigation: extend the guard so `domain/ports` and `domain/model` permit no
  external-package imports at all.
- Risk: `GameStateRepository` is shaped from intuition rather than ADR-004,
  causing rework when the Dexie adapter (1.4.x) lands.
  Severity: medium. Likelihood: medium.
  Mitigation: shape it from ADR-004; segregate into `RunIndex` / `SnapshotStore`
  / `EventLog`; keep only domain concepts (run id, tick index, monotonic
  sequence, opaque snapshot, `since(sequence)` cursor); write a compile-only
  contract test proving "save snapshot → append events → load latest → replay
  since N" is expressible without storage vocabulary.
- Risk: Strict-mode flags (`verbatimModuleSyntax`, `isolatedModules`,
  `exactOptionalPropertyTypes`) break a "trivial" types-only file in
  non-obvious ways.
  Severity: low. Likelihood: medium.
  Mitigation: mandate `export type`/`import type` in all new files and barrels;
  add a test that pins `exactOptionalPropertyTypes` behaviour.
- Risk: A `ports → model → ports` import cycle if shared value types are placed
  in `ports/`.
  Severity: medium. Likelihood: low.
  Mitigation: branded primitives, `RandomSourceSnapshot`, `AudioEvent`, and all
  cross-cutting value types live in `domain/model/`; ports depend on model,
  never the reverse.

## Progress

- [ ] M0. Tooling guardrails: placeholder-honesty guard + import-guard
  extension, with their own unit tests. (red → green)
- [ ] M1. Domain model seam: branded primitives + constructors,
  `RandomSourceSnapshot`, `AudioEvent` tag union, opaque aggregate placeholders,
  model barrel. (red → green)
- [ ] M2. The six port interfaces + `Flushable` capability + ports barrel, with
  implementability, barrel, and strict-mode tests. (red → green)
- [ ] M3. Documentation: amend ADR-002 with resolved port-contract decisions;
  update `docs/developers-guide.md` port conventions; confirm `docs/users-guide.md`
  needs no change. Add forward-reference to roadmap 1.3.1.
- [ ] M4. Full `bun ff` green; `coderabbit review --agent` clean; finalise plan
  status and outcomes.

(Timestamps to be filled in during execution.)

## Surprises & discoveries

- Observation: ADR-005 already fully specifies the `RandomSourceSnapshot`
  shape (`prngName`, `prngVariant`, `prngVersion`, `prngState: [a,b,c,d]`), and
  the HLD fixes the `AudioEvent` discriminant set. These are seam types this
  task can define *completely* now, not placeholders.
  Evidence: `docs/adr-005-...md` §"Save-identity fields for the PRNG";
  HLD §"Browser implementation".
  Impact: smaller placeholder surface than first assumed; lower churn into
  1.3.1.
- Observation: the HLD/ADR-002 list a *seventh* outbound seam (an optimisation /
  report sink for self-play). Task 1.2.2 deliberately scopes to six.
  Evidence: HLD §"Module layout" mentions optimisation reports; ADR-002
  §"Migration plan" item 3 lists "optimization reports".
  Impact: recorded as **deferred, not forgotten** (see Decision Log) so a
  later reader does not treat the boundary as incomplete.

## Decision log

- Decision: Aggregates the ports reference are introduced as **opaque branded
  placeholders**, not minimal-structural or permissive types.
  Rationale: structural typing means any non-opaque placeholder becomes a
  de-facto published contract that downstream code couples to, producing a
  silent breakage cascade when 1.3.1 lands. An opaque dead-end makes premature
  field access a compile error and turns every premature dependency into a
  greppable `as` cast. (Panel consensus: Telefono, Pandalump, Wafflecat,
  Doggylump.)
  Date/Author: 2026-06-14, planning agent.

- Decision: Seam types the ports genuinely own (`RandomSourceSnapshot`,
  `AudioEvent` tag union, branded IDs, repository key tuples) are defined
  **fully now**; only the 1.3.1 aggregates are placeholders.
  Rationale: ADR-002/004/005/009 already paid the design cost for the seams;
  defining them minimally would force re-opening ports as each adapter lands.
  "ADR-complete seams, opaque aggregates" minimises total churn across
  1.2.2 → 1.3.1 → 1.3.3 → 1.4.x. (Wafflecat.)
  Date/Author: 2026-06-14.

- Decision: Branded primitives and all cross-cutting value types live in
  `src/domain/model/`; ports import from model, never the reverse.
  Rationale: 1.3.1 aggregates reference both the branded IDs and the RNG
  snapshot; placing those in `ports/` would create a `ports → model → ports`
  cycle. (Pandalump.)
  Date/Author: 2026-06-14.

- Decision: `GameStateRepository` is segregated into `RunIndex`,
  `SnapshotStore`, and `EventLog`, composed via
  `type GameStateRepository = RunIndex & SnapshotStore & EventLog`.
  Rationale: the three concerns have different access patterns and evolution
  rates (ADR-004). Interface segregation lets the event-log API evolve without
  forcing a version bump on run-index consumers; one Dexie adapter can still
  implement all three. (Telefono, Doggylump.)
  Date/Author: 2026-06-14.

- Decision: `RandomSource` is a pure, immutable port whose methods return
  `[value, nextRandomSource]`; the serialisable `RandomSourceSnapshot` value
  (consumed by the pure tick) lives in `domain/model`. Seeding/rehydration is an
  adapter concern (1.3.3). The RNG shape is *inspired by* `pure-rand` but binds
  to the accepted sfc32 contract and imports nothing.
  Rationale: byte-identical replay (ADR-005/007) requires snapshotting and
  substreaming, which a mutating generator cannot provide. The HLD tick consumes
  the snapshot *value*, so the value lives in the model; the port covers
  stepping and forking. `pure-rand` must stay dev-only (fast-check). (Pandalump,
  Wafflecat, Telefono.)
  Date/Author: 2026-06-14.

- Decision: `RandomSource.fork` takes a branded `SubstreamLabel`, not a raw
  `string`; same label derives the same substream deterministically (ADR-005
  §"Substream derivation").
  Rationale: a raw `string` lets a typo silently select a valid-but-wrong
  stream with no compile error. (Telefono.)
  Date/Author: 2026-06-14.

- Decision: `AudioEventSink.emit` and `TelemetrySink.record` return `void`
  (fire-and-forget); both carry the documented invariant **"a sink never
  throws"**; an optional `Flushable` capability interface is provided for
  PWA drain on `pagehide`/`visibilitychange`. Sinks are *defined* in
  `domain/ports/` per the roadmap, but are drained by the application layer from
  the arrays in `SimTickOutput`.
  Rationale: a throw inside the tick's event-drain loop would corrupt the tick;
  async sinks would leak backpressure into the domain; flush is a
  backward-compatible capability. (Telefono.)
  Date/Author: 2026-06-14.

- Decision: `AssetCatalogue` exposes only `get(id): Promise<LoadedAsset |
  undefined>`; the sync `has(id): boolean` is dropped.
  Rationale: a sync membership check bakes a sync-readable index assumption into
  the port; `get` already encodes absence via `undefined`. Re-add an async `has`
  only when a real call site needs it (YAGNI). (Telefono.)
  Date/Author: 2026-06-14.

- Decision: Ports use **property-style** members (`readonly save: (run:
  RunState) => Promise<void>`) uniformly, and the documented example in
  `docs/developers-guide.md` is updated to match.
  Rationale: property-typed function members are checked contravariantly in
  their parameters under `strictFunctionTypes`, catching unsound adapter
  overrides that method-style (bivariant) signatures would allow. (Telefono.)
  Date/Author: 2026-06-14.

- Decision: No `Result<T, E>` type at the port layer; `undefined` means
  *absence*, a rejected `Promise` means *I/O failure*. This is a deliberate
  divergence from the `Result<T>` sketch in ADR-002, and is noted in the port
  doc comments.
  Rationale: error *policy* belongs in the application layer; keeping ports
  dependency-free is the point of the hexagon. (Pandalump, Telefono, Wafflecat.)
  Date/Author: 2026-06-14.

- Decision: The seventh outbound seam (self-play optimisation/report sink) is
  **deferred**, not part of 1.2.2, and recorded as such.
  Rationale: self-play telemetry arrives in phase 5; scoping to six matches the
  roadmap. (Pandalump.)
  Date/Author: 2026-06-14.

- Decision: Cross-cutting UI requirements (i18n/translatable strings, card-model
  data, WCAG 2.2, Playwright + css-view validation) are **not applicable** to
  this types-only slice, which renders no DOM and carries no user-visible
  strings. The existing a11y suite (`bun test:a11y`, part of `bun ff`) must
  still pass green to prove no regression.
  Rationale: port interfaces are internal type contracts; translatable strings
  and accessible markup live in React adapters, which this slice does not touch.
  This scoping is surfaced in the PR for the approver to confirm.
  Date/Author: 2026-06-14.

## Outcomes & retrospective

To be completed at M4. Compare against the four observable outcomes in
"Purpose / big picture"; note any port signature that proved awkward for the
1.2.3 stub authors and any churn forced on 1.3.1.

## Context and orientation

Read these before starting:

- **Skills.** Load `leta` (semantic navigation; prefer `leta show`/`leta refs`
  over file reads), `hexagonal-architecture` (the dependency rule: domain
  defines ports, adapters implement them; domain stays pure), and `execplans`
  (this document's format and the approval gate).
- **Roadmap.** `docs/roadmap.md` item 1.2.2 (requires 1.2.1; success: "all six
  port types compile; no port file imports from an adapter module").
- **Architecture.** `docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
  §"Decision outcome" (the `GamePorts` sketch and the source-tree decision);
  HLD `docs/vibe-coder-high-level-design.md` §"Module layout" (the
  `domain/ports/` file list) and §"Domain model".
- **Per-port source ADRs.** ADR-004 (persistence — `GameStateRepository`),
  ADR-005 (deterministic simulation/PRNG — `RandomSource` and the
  `RandomSourceSnapshot` shape; read §"Save-identity fields for the PRNG" and
  §"Substream derivation"), ADR-009 (semantic audio — `AudioEventSink`,
  `AudioEvent` union in HLD §"Browser implementation"), ADR-008 (assets —
  `AssetCatalogue`), ADR-006/ADR-007 (self-play and runtime authority —
  `TelemetrySink`), ADR-010 (fixed-tick outside React — `Clock`).
- **Developer conventions.** `docs/developers-guide.md` §"Domain layer contents",
  §"Ports and adapters — conventions" (the port/adapter/stub pattern and the
  current `GameStateRepository` example to be updated), and §"Test conventions".

Current state (after 1.2.1):

- Layers: `src/domain/` (pure), `src/application/`, `src/adapters/`, `src/app/`
  (inbound shell). `src/domain/ports/index.ts` and `src/domain/model/index.ts`
  exist as JSDoc-only barrels (no exports yet).
- Boundary enforcement: `scripts/import-boundaries.ts` (core logic),
  `scripts/import-boundary-paths.ts`, `scripts/lint-import-boundaries.ts` (CLI),
  run via `bun run lint:imports`; plus Biome `noRestrictedImports` overrides in
  `biome.jsonc`. Path aliases (`@domain`, `@application`, `@adapters`) derive
  from `tools/path-aliases.ts` (the single source of truth, which also
  demonstrates the branded-type convention `T & { readonly __brand: "Name" }`
  with a small branding constructor).
- TypeScript (`tsconfig.json`): `strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`,
  `noPropertyAccessFromIndexSignature`. `check:types` runs
  `tsc --noEmit --skipLibCheck`.
- Tests: `bun:test`, files under `tests/` named `<subject>.test.ts(x)`. The
  established type-level test pattern uses `@ts-expect-error` plus
  helper-function assignment checks (see `tests/path-aliases.types.test.ts`).
  Existing custom guards (`scripts/check-fluent-vars.ts` and friends) are the
  template for the new placeholder guard.
- Commands: `make check-fmt`/`make typecheck`/`make lint`/`make test` map to
  `bun fmt`/`bun check:types`/`bun lint`/`bun test`; `bun ff` runs the full
  gate; `bun run semantic` runs the custom lint chain. Prefer Makefile targets;
  log long output via `tee` to `/tmp/$ACTION-...out`.

Definitions:

- **Driven (secondary) port.** An interface the domain *requires* from the
  outside world (storage, time, randomness, audio, assets, telemetry). Adapters
  implement it; the dependency points inward.
- **Seam type.** A value type that exists because a port exists (e.g.
  `RandomSourceSnapshot`). Owned here permanently; not a placeholder.
- **Opaque placeholder.** A nominal type with no usable structure, standing in
  for a 1.3.1 aggregate so ports compile, deliberately un-constructable.

## Interfaces and dependencies

Prescriptive target state at the end of M2. New files under `src/domain/`.
All members are property-style and `readonly`; all imports/exports are
type-only (`import type` / `export type`).

### `src/domain/model/` (seam values, branded primitives, placeholders)

`src/domain/model/branded.ts` — the shared brand helper, branded primitives, and
their constructors (constructors are the only runtime values introduced by this
plan, and they live in the model, not in ports):

```typescript
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type RunId = Brand<string, "RunId">;
export type Seed = Brand<number, "Seed">;
export type TickIndex = Brand<number, "TickIndex">;
export type StageId = Brand<string, "StageId">;
export type AssetId = Brand<string, "AssetId">;
export type IsoTimestamp = Brand<string, "IsoTimestamp">;
export type MonotonicMillis = Brand<number, "MonotonicMillis">;
export type SubstreamLabel = Brand<string, "SubstreamLabel">;

export const runId = (value: string): RunId => value as RunId;
export const seed = (value: number): Seed => value as Seed;
export const tickIndex = (value: number): TickIndex => value as TickIndex;
export const stageId = (value: string): StageId => value as StageId;
export const assetId = (value: string): AssetId => value as AssetId;
export const isoTimestamp = (value: string): IsoTimestamp => value as IsoTimestamp;
export const monotonicMillis = (value: number): MonotonicMillis => value as MonotonicMillis;
export const substreamLabel = (value: string): SubstreamLabel => value as SubstreamLabel;
```

`src/domain/model/random-source-snapshot.ts` — fully specified now (ADR-005):

```typescript
/** Serialisable sfc32 state plus PRNG identity (ADR-005). */
export type RandomSourceSnapshot = {
  readonly name: "sfc32";
  readonly variant: "bryc-2022";
  readonly version: 1;
  /** Four uint32 words: [a, b, c, d]. */
  readonly state: readonly [number, number, number, number];
};
```

`src/domain/model/audio-event.ts` — discriminant set fixed now (HLD); payloads
deferred:

```typescript
export type AudioEventTag =
  | "commit"
  | "incident"
  | "policyCommitted"
  | "alignmentWarning"
  | "stageUnlocked"
  | "powerShortage"
  | "endingTriggered";

/**
 * @placeholder:7.2.1 payload fields. The discriminant set is fixed by HLD
 * §"Browser implementation"; widen the union only via ADR. Adding a tag is a
 * backward-compatible widening that breaks consumer `switch` exhaustiveness
 * (the desired safety).
 */
export type AudioEvent = { readonly tag: AudioEventTag };
```

`src/domain/model/placeholders.ts` — opaque, un-constructable stand-ins for
later aggregates. Each is a nominal dead-end carrying a task-tagged marker:

```typescript
/** @placeholder:1.3.1 Replace with the Valibot-backed aggregate. Opaque on purpose. */
export type RunState = { readonly __placeholder: "RunState@1.3.1" };
/** @placeholder:1.3.1 */
export type RunSummary = { readonly __placeholder: "RunSummary@1.3.1" };
/** @placeholder:2.1.1 Domain event emitted by simulateTick. */
export type DomainEvent = { readonly __placeholder: "DomainEvent@2.1.1" };
/** @placeholder:5.3.1 Per-run telemetry record drained to a TelemetrySink. */
export type TelemetryEvent = { readonly __placeholder: "TelemetryEvent@5.3.1" };
/** @placeholder:8.3.4 Runtime asset returned by the AssetCatalogue. */
export type LoadedAsset = { readonly __placeholder: "LoadedAsset@8.3.4" };
```

(Marker tags name the task that will replace each placeholder. The guard in M0
validates their format and budget. Do **not** define `RunState`'s real fields
here — that is 1.3.1's work; the Tolerances forbid it.)

`src/domain/model/index.ts` — extend the existing barrel with type-only
re-exports of the four new modules.

### `src/domain/ports/` (the six interfaces + one capability)

`src/domain/ports/clock.ts`:

```typescript
import type { IsoTimestamp, MonotonicMillis } from "@domain/model/branded";

/**
 * Time as a driven capability. The pure simulation tick must NOT read the
 * Clock; it receives `dtSeconds`. Scheduling (setInterval) belongs to the
 * TickService driving adapter, not this port. No Result type (ADR-002 divergence).
 */
export interface Clock {
  /** Wall-clock instant for stamping saves and events. */
  readonly now: () => IsoTimestamp;
  /** Monotonic reading for measuring durations; never goes backwards. */
  readonly monotonicMillis: () => MonotonicMillis;
}
```

`src/domain/ports/random-source.ts`:

```typescript
import type { RandomSourceSnapshot } from "@domain/model/random-source-snapshot";
import type { SubstreamLabel } from "@domain/model/branded";

/**
 * Pure, immutable, deterministic random source (sfc32; ADR-005). Each draw
 * returns a value and the NEXT source; the source is never mutated in place.
 * Seeding/rehydration from a seed or snapshot is an adapter concern (1.3.3).
 * Inspired by pure-rand's immutable generator, but imports nothing.
 */
export interface RandomSource {
  /** Draw a uint32 and the advanced source. */
  readonly nextUint32: () => readonly [value: number, next: RandomSource];
  /** Draw a float in [0, 1) and the advanced source. */
  readonly nextUnitInterval: () => readonly [value: number, next: RandomSource];
  /**
   * Derive an independent substream. The SAME label yields the SAME substream
   * deterministically (ADR-005 §"Substream derivation").
   */
  readonly fork: (label: SubstreamLabel) => RandomSource;
  /** Serialise the current state for persistence/replay. */
  readonly snapshot: () => RandomSourceSnapshot;
}
```

`src/domain/ports/audio-event-sink.ts`:

```typescript
import type { AudioEvent } from "@domain/model/audio-event";

/**
 * Outbound, one-way audio sink. INVARIANT: a sink never throws. Fire-and-forget;
 * rate-limiting/aggregation is the adapter's job. The application layer drains
 * `SimTickOutput.audioEvents` into this sink; the domain does not call it.
 */
export interface AudioEventSink {
  readonly emit: (event: AudioEvent) => void;
}
```

`src/domain/ports/telemetry-sink.ts`:

```typescript
import type { TelemetryEvent } from "@domain/model/placeholders";

/**
 * Outbound, one-way telemetry sink. INVARIANT: a sink never throws.
 * Best-effort; the domain cannot observe drops. No remote telemetry by default
 * (HLD §"Security and privacy").
 */
export interface TelemetrySink {
  readonly record: (event: TelemetryEvent) => void;
}
```

`src/domain/ports/asset-catalogue.ts`:

```typescript
import type { AssetId, LoadedAsset } from "@domain/model/...";

/**
 * Read-only runtime asset catalogue. `undefined` means "not in catalogue".
 * A rejected Promise means "load failed" (distinct concerns; see ADR-008,
 * 8.3.4 enforces approved-runtime status at load time).
 */
export interface AssetCatalogue {
  readonly get: (id: AssetId) => Promise<LoadedAsset | undefined>;
}
```

`src/domain/ports/game-state-repository.ts` — segregated, ADR-004-shaped, domain
concepts only:

```typescript
import type { IsoTimestamp, RunId, TickIndex } from "@domain/model/branded";
import type { DomainEvent, RunState, RunSummary } from "@domain/model/placeholders";

export type SnapshotKey = readonly [runId: RunId, tick: TickIndex];
export type EventLogKey = readonly [runId: RunId, tick: TickIndex, sequence: number];

export type RunSnapshot = {
  readonly runId: RunId;
  readonly tick: TickIndex;
  readonly createdAt: IsoTimestamp;
  /** Opaque to the port until 1.3.1 defines RunState; persisted as a blob. */
  readonly state: RunState;
};

export type EventLogEntry = {
  readonly runId: RunId;
  readonly tick: TickIndex;
  readonly sequence: number;
  readonly event: DomainEvent;
};

/** Small, stable run index. */
export interface RunIndex {
  readonly save: (run: RunState) => Promise<void>;
  readonly load: (id: RunId) => Promise<RunState | undefined>;
  readonly list: () => Promise<readonly RunSummary[]>;
}

/** Point-read snapshot store keyed by [runId, tick]. */
export interface SnapshotStore {
  readonly putSnapshot: (snapshot: RunSnapshot) => Promise<void>;
  readonly latestSnapshot: (runId: RunId) => Promise<RunSnapshot | undefined>;
  readonly snapshotAt: (key: SnapshotKey) => Promise<RunSnapshot | undefined>;
}

/** Append-only event log; ordered by monotonic `sequence`. */
export interface EventLog {
  /** INVARIANT: append-only and monotonic in `sequence`. No update/delete. */
  readonly appendEvents: (entries: readonly EventLogEntry[]) => Promise<void>;
  readonly eventsSince: (
    runId: RunId,
    fromSequence: number,
  ) => Promise<readonly EventLogEntry[]>;
}

/** One adapter (e.g. the Dexie repository, 1.4.x) implements all three. */
export type GameStateRepository = RunIndex & SnapshotStore & EventLog;
```

`src/domain/ports/flushable.ts` — optional capability for shutdown/background
drain (composed by adapters that can flush, e.g. `AudioEventSink & Flushable`):

```typescript
/** Optional capability: drain buffered work (PWA pagehide/visibilitychange). */
export interface Flushable {
  readonly flush: () => Promise<void>;
}
```

`src/domain/ports/index.ts` — extend the existing barrel with type-only
re-exports of all six ports, the repository sub-interfaces and key/entry types,
and `Flushable`.

(Note: the exact import specifiers above — e.g. `@domain/model/...` for the
asset types — are finalised during implementation to match where each type
lands; the rule is fixed: ports import value/seam types from `@domain/model`,
never the reverse.)

### Tooling

`scripts/check-domain-placeholders.ts` (new, modelled on
`scripts/check-fluent-vars.ts`): scans `src/domain/model/**` and
`src/domain/ports/**` and fails (exit 1) if any of these hold:

1. A `@placeholder:` marker is malformed (must match `@placeholder:<dotted
   task id>`), or the total marker count differs from a checked-in budget
   constant (forcing a conscious update whenever placeholders are added or
   removed).
2. A file declares a type using `any`, `unknown`, or a bare
   `Record<string, unknown>` (the opaque-brand string literals are allowed).
3. (Import hygiene) any non-type import, or any import whose specifier is not
   relative or `@domain/...` — i.e. no third-party runtime package may enter
   `domain/ports` or `domain/model`. (If cleaner, add this third check to
   `scripts/import-boundaries.ts` instead; either home is acceptable provided
   `bun ff` runs it.)

Wire it into `package.json` as `lint:domain-placeholders` and add it to the
`semantic:lint` chain so it runs under `bun run semantic` and therefore
`bun ff`.

## Plan of work

Stage A is understanding (done in this draft). Stages B–D are executed
**after approval**, milestone by milestone, each ending with validation.

### M0 — Tooling guardrails (red → green)

1. Write `tests/check-domain-placeholders.test.ts` first: assert the guard
   flags a permissive type (`unknown`), a malformed marker, a budget mismatch,
   and a forbidden third-party import — using small in-memory fixtures or temp
   files. Run it; expect failure because the script does not yet exist (red).
2. Implement `scripts/check-domain-placeholders.ts` and the import-hygiene rule;
   wire `lint:domain-placeholders` into `semantic:lint`. Run the test (green).
3. Gate: `make typecheck`, `make lint`, `make test` for the new files; then
   `bun run lint:domain-placeholders` against the (still empty) domain — expect
   a clean pass with budget 0.

### M1 — Domain model seam (red → green)

1. Write `tests/domain-model-seams.test.ts` first: branded constructors produce
   values assignable to their brands; a raw `string`/`number` is **not**
   assignable to a branded type (`@ts-expect-error`); `RandomSourceSnapshot`
   has a 4-tuple `state` and the literal identity fields; opaque placeholders
   cannot be constructed from `{}` and their fields cannot be read
   (`@ts-expect-error`). Run; expect red (modules absent).
2. Add `branded.ts`, `random-source-snapshot.ts`, `audio-event.ts`,
   `placeholders.ts`, and extend `model/index.ts`. Run the test (green). Update
   the placeholder budget constant.
3. Gate: `make check-fmt`, `make typecheck`, `make lint`, `make test`,
   `bun run lint:imports`, `bun run lint:domain-placeholders`.

### M2 — The six ports (red → green)

1. Write `tests/domain-ports.contract.test.ts` first:
   - **Implementability:** a trivial in-line fake satisfies each of the six
     ports (and `Flushable`), using opaque casts for aggregate values. This
     compiles only if the interfaces are coherent.
   - **Repository segregation:** a compile-only assertion that the sequence
     "putSnapshot → appendEvents → latestSnapshot → eventsSince(n)" type-checks
     against `GameStateRepository` without any storage vocabulary.
   - **Barrel:** `import type` each of the six ports from `@domain/ports` and
     assert (via assignment helpers) they are all present.
   - **Strict-mode pin:** one test that fixes `exactOptionalPropertyTypes`
     behaviour for an optional member (so a future flag change is caught).
   Run; expect red.
2. Add the seven port files and extend `ports/index.ts`. Run the test (green).
3. Gate: full `make check-fmt`/`typecheck`/`lint`/`test`, `bun run lint:imports`,
   `bun run lint:domain-placeholders`.

### M3 — Documentation

1. Amend `docs/adr-002-...md` with a short "Resolved port-contract decisions"
   subsection capturing: opaque-placeholder strategy, repository segregation,
   `RandomSource` purity + snapshot ownership, sink "never throws" invariant +
   `Flushable`, dropped `AssetCatalogue.has`, property-style members, the
   no-`Result` divergence from the ADR's own sketch, and the deferred seventh
   port.
2. Update `docs/developers-guide.md` §"Ports and adapters — conventions":
   replace the method-style `GameStateRepository` example with the segregated,
   property-style version; add a short "Placeholder types and the 1.3.x seam"
   note describing the opaque-brand convention and the
   `lint:domain-placeholders` guard.
3. Confirm `docs/users-guide.md` needs no change (no user-facing behaviour) and
   record that confirmation in the Decision Log.
4. Add a forward-reference to `docs/roadmap.md` item 1.3.1: a success criterion
   "zero `@placeholder:1.3.1` markers remain in `src/domain/model/`".

### M4 — Full gate, review, finalise

1. Run `bun ff` via `tee` to `/tmp/ff-vibe-coder-<branch>.out`; resolve every
   error/failure/violation. This includes `bun test:a11y` and `bun test:e2e`
   (must remain green — no regression).
2. Run `coderabbit review --agent`; clear all concerns. (Run all deterministic
   gates green *before* invoking CodeRabbit.)
3. Set this plan's Status to COMPLETE, fill `Outcomes & retrospective`, and tick
   `Progress`.

## Concrete steps

Work from the repository root
`/home/leynos/.lody/repos/github---leynos---vibe-coder/worktrees/33c9d4a7-4db5-44ae-b100-b77e6e17c23c`.
Branch: `1-2-2-define-driven-port-interfaces`. Commit after each milestone with
a gated commit (run the relevant `make` targets first). Capture long output via
`tee`, e.g.:

```sh
bun ff 2>&1 | tee "/tmp/ff-vibe-coder-$(git branch --show-current).out"
```

Per-milestone gate (sequential — do not run gates in parallel; the build cache
rewards sequential runs):

```sh
make check-fmt 2>&1 | tee "/tmp/fmt-vibe-coder-$(git branch --show-current).out"
make typecheck 2>&1 | tee "/tmp/types-vibe-coder-$(git branch --show-current).out"
make lint      2>&1 | tee "/tmp/lint-vibe-coder-$(git branch --show-current).out"
make test      2>&1 | tee "/tmp/test-vibe-coder-$(git branch --show-current).out"
bun run lint:imports
bun run lint:domain-placeholders
```

Expected at M2 completion: `make typecheck` passes; `make test` reports the new
suites passing; `bun run lint:imports` and `bun run lint:domain-placeholders`
exit 0.

## Validation and acceptance

Acceptance is behaviour a reviewer can reproduce:

- **Compiles.** `make typecheck` passes with all six ports, the repository
  sub-interfaces, `Flushable`, and the model seam types present.
- **Boundary clean.** `bun run lint:imports` exits 0; `bun run
  lint:domain-placeholders` exits 0; deliberately adding `import { x } from
  "pure-rand"` to a port file makes one of them exit 1 (demonstrable check).
- **Implementable.** `tests/domain-ports.contract.test.ts` passes: the in-line
  fakes satisfy every port; the repository sequence type-checks.
- **Honest placeholders.** Temporarily changing a placeholder to `type RunState
  = unknown` makes `bun run lint:domain-placeholders` exit 1; reading
  `run.tick` off a `RunState` placeholder is a compile error.
- **Full gate.** `bun ff` completes with no errors, failures, or violations,
  including `bun test:a11y` and `bun test:e2e`.

Red-Green-Refactor evidence to record at each milestone: the failing test
command and its expected reason (red), the minimal addition that makes it pass
(green), and the gate rerun after cleanup (refactor).

Quality criteria for "done":

- Tests: new unit/type suites pass under `bun test`; existing suites unaffected.
- Lint/typecheck: `make lint`, `make typecheck`, `bun run semantic` all clean.
- CodeRabbit: `coderabbit review --agent` reports no outstanding concern.

Not applicable to this slice (recorded in the Decision Log): translatable
strings / localisation, card-model data, WCAG 2.2 markup, and Playwright +
css-view visual validation — there is no DOM or user-visible string in a
types-only change. The a11y suite within `bun ff` must still pass to prove no
regression.

## Idempotence and recovery

Every step is additive (new files, barrel re-exports, one new script, doc
edits). Re-running gates is safe. To roll back a milestone, `git restore` the
new files and revert the barrel/`package.json`/budget edits; nothing is
destructive and no data migration is involved. Commit per milestone so any
milestone can be reverted independently via `git revert`.

## Artifacts and notes

- The community-of-experts (Logisphere) design review that shaped this plan
  produced a ⚠️ "Proceed with conditions" verdict; every condition is reflected
  in the Decision Log and Interfaces sections (opaque placeholders, repository
  segregation, `RandomSource` purity, the placeholder-honesty guard, dropped
  `has`, sink invariants, property-style members).
- Prior art consulted: `pure-rand` (dubzzz) for the immutable
  `next(): [value, next]` generator shape — used as inspiration only; not a
  dependency. `neverthrow` was evaluated and rejected for the port layer.

## Revision note

Initial draft (2026-06-14): authored from the roadmap, HLD, ADR-002/004/005/006/
007/008/009/010, and the existing 1.2.1 tooling, then revised after a focused
four-lens Logisphere design review. The main changes from the first sketch:
aggregates became opaque branded placeholders (not minimal-structural);
`GameStateRepository` was segregated into `RunIndex`/`SnapshotStore`/`EventLog`;
`RandomSource` was reframed as a pure immutable port with the snapshot value
owned by the model; a placeholder-honesty guard and an import-hygiene rule were
added; sync `AssetCatalogue.has` was dropped; sink "never throws" and an
optional `Flushable` were added; members became property-style; and the
no-`Result` divergence and deferred seventh port were documented. No
implementation has begun — this plan awaits approval per the execplans approval
gate.

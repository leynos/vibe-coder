# Define and validate the core domain value types (1.3.1)

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: DRAFT

## Purpose / big picture

Roadmap item 1.3.1 gives Vibe Coder its first domain content. After this
change, a developer can import the core run aggregates — `RunState`,
`Resources`, `TechDebtVector`, `AllocationPolicy`, `EthicsPolicy`,
`AlignmentState`, `ProgressionState`, and `UnlockLedger` — from
`@domain/model`, construct them, and pass untrusted data through a Valibot
schema that accepts valid objects and rejects invalid ones. The single
non-negotiable business rule introduced here is that an `AllocationPolicy`'s
eight allocation percentages must sum to exactly 100; the schema enforces this
at the validation boundary so no malformed policy can reach the simulation.

The user-visible outcome is indirect but foundational: every later vertical
slice — the simulation tick (2.1), the Dexie persistence schema (1.4), the
parameter pack (1.3.2), the policy sliders (2.3.3), and JSON import/export
(2.4.3) — depends on these types and their schemas existing, being immutable,
and round-tripping through validation. This item writes no simulation
equations, no persistence code, no XState machines, and no UI. It is pure
domain modelling.

A reviewer can observe success by running `bun test` and seeing the new
`tests/domain/*.test.ts` and `tests/domain/*.property.test.ts` suites pass:
valid objects parse, invalid objects are rejected with a readable issue, and a
property test confirms over hundreds of generated cases that the
`AllocationPolicy` schema accepts exactly the integer eight-tuples summing to
100 and rejects all others. The full gate `bun ff` must also pass with no
errors, failures, or violations.

This plan is the approval draft. Do not implement it until the user has
explicitly approved it.

## Constraints

- Do not begin implementation until this ExecPlan is explicitly approved.
- Keep the implementation scoped to roadmap item 1.3.1. Do not implement the
  `ParameterPack` type or the default pack (1.3.2), the seeded `RandomSource`
  adapter (1.3.3), the driven-port interfaces (1.2.2), the in-memory adapter
  stubs (1.2.3), the Dexie schema (1.4.x), or any XState machine (1.5.x).
- All new domain code lives under `src/domain/model/`. No file added by this
  item may import from `@application`, `@adapters`, `@app`, `react`,
  `react-dom`, `dexie`, Web Audio, Canvas, browser storage, or service-worker
  APIs. The custom import-boundary guard (`scripts/import-boundaries.ts`,
  `scripts/lint-import-boundaries.ts`) and the Biome `noRestrictedImports`
  override must continue to pass. `valibot` is permitted in the domain layer
  (it is a pure, side-effect-free validation library and is not on the
  disallowed-package list).
- The domain value types must be immutable. Inferred TypeScript types must be
  `readonly` at every level a consumer can reach. Construct objects through, or
  validate them with, the Valibot schema; never mutate a validated value.
- A branded scalar value (for example a `RunId` or `Percent`) may be created
  only by parsing through its schema, never by a bare `as` type assertion. The
  developer-guide subsection added by this item must state this rule, because a
  `value as RunId` coercion compiles but defeats the brand's round-trip
  guarantee (Telefono review).
- Valibot schemas are the single source of truth. Each TypeScript type is
  derived from its schema with `v.InferOutput<typeof Schema>`. Do not hand-write
  a type and a schema in parallel; that invites drift.
- Numeric fields must not silently admit `NaN` or `±Infinity`. `Decimalish`
  carries `v.finite()`, and every unbounded `v.number()` field
  (`AlignmentState.drift`) carries `v.finite()`. A `NaN` that passes validation
  becomes a simulation-correctness bug invisible at the boundary (Pandalump and
  Doggylump reviews).
- `RunState`'s referenced-but-not-owned aggregates (`QualityCoverageVector`,
  `MacroState`, `GameEvent`, `EventResolution`, `EndingState`) live in one
  isolated module `src/domain/model/placeholders.ts`. Their schemas are
  composed into `RunStateSchema` but are not re-exported from the public barrel
  `src/domain/model/index.ts`, so no external code can form a stable dependency
  on a shape that later items will reshape (Telefono and Pandalump reviews).
- Domain test files must assert with `toEqual` and explicit expected values, not
  with `toMatchSnapshot`. A stray snapshot would interact with the repository's
  snapshot guard and produce confusing, schema-unrelated gate failures
  (Doggylump pre-mortem).
- The `AllocationPolicy` schema must enforce that `ship`, `openSource`,
  `quality`, `security`, `researchUx`, `marketingSales`, `civicAction`, and
  `powerInfra` are non-negative integers that sum to exactly 100. This mirrors
  HLD "Core aggregates" (`AllocationPolicy`) and HLD "Non-negotiable business
  rules" (rule 4). The eight fields are integer percentage points so the
  sum-to-100 check is exact (see Risks: float summation).
- Match the repository's existing conventions: two-space indentation, double
  quotes, semicolons always, trailing commas everywhere (Biome config), a
  `/** @file ... */` header on every module, Oxford `-ize` spelling, and
  neutral phrasing (no first-person pronouns) in prose and comments.
- Do not hardcode user-facing English validation messages. Validation issues
  raised here are developer-facing (there is no UI in this item). Where a
  custom message is genuinely required — only the cross-field sum check — use a
  stable machine-readable code token (for example, `"allocation/sum-not-100"`),
  not a translated sentence, so the UI slice (2.3.3) can map it to localized
  text later by `(kind, type)` plus the token. Domain files are exempt from the
  hardcoded-string lint (`scripts/check-hardcoded-strings.ts` scans only
  `src/app/**/*.tsx`), but the i18n discipline still applies by intent.
- Update `docs/developers-guide.md` (a new "Domain value types and schemas"
  subsection documenting the schema-first pattern, the branded-scalar
  convention, and where the aggregates live) and append a Decision Log /
  amendment note to `docs/vibe-coder-high-level-design.md` only if the modelled
  shapes diverge from or extend the HLD sketches. Prefer recording divergences
  in this ExecPlan's Decision Log and the developer guide over editing the HLD
  body.
- `docs/users-guide.md` requires no change: 1.3.1 introduces no behaviour or
  interface a player can observe. State this explicitly in the plan's Outcomes
  rather than editing the users' guide.

## Tolerances (exception triggers)

- Scope: if implementation requires creating more than 18 files (production
  plus tests) or more than roughly 1,400 net lines, stop and escalate.
- Dependencies: if any new runtime or dev dependency appears necessary
  (for example `valibot-fast-check`, a `DeepReadonly` package, or
  `LemmaScript`), stop and escalate before adding it. `valibot` and
  `fast-check` are already present and are the only validation/property-test
  tools in scope.
- Interface: if a port interface, application module, or adapter must change to
  land these types, stop and escalate — that work belongs to 1.2.2 / 1.2.3 and
  is out of scope here.
- HLD divergence: if modelling a type forces a material departure from the HLD
  "Core aggregates" sketch (a renamed or removed field, a changed unit, or a
  new mandatory field on `RunState`), stop, record the proposed shape in the
  Decision Log, and escalate before encoding it.
- Provisional aggregates: `RunState` references aggregates this item does not
  own (`QualityCoverageVector`, `MacroState`, `GameEvent`, `EventResolution`,
  `EndingState`). If giving them a minimal placeholder shape grows beyond a
  single isolated `placeholders.ts` module, or if a later roadmap item's needs
  become unclear, stop and escalate rather than over-modelling them now.
- Iterations: if `bun ff` still fails after five focused attempts on the same
  failure, stop and escalate.
- Ambiguity: if a field's type or unit is genuinely ambiguous and the choice
  materially affects later simulation code, stop and present options with
  trade-offs rather than guessing.

## Risks

- Risk: float summation in the `AllocationPolicy` sum-to-100 check. Summing
  fractional percentages as IEEE-754 doubles can yield `100.00000000001`, so an
  exact `=== 100` check would spuriously reject.
  Severity: high. Likelihood: high if fields are fractional.
  Mitigation: constrain each field with `v.integer()` so the eight values are
  whole percentage points; integer addition is exact below 2^53, making the
  `=== 100` check sound. Record this as a ratified decision.
- Risk: shallow `readonly`. Valibot's `v.readonly()` marks only the level it
  wraps; `RunState` nests aggregates, so a single top-level `readonly()` would
  leave nested objects mutable in the inferred type.
  Severity: medium. Likelihood: high.
  Mitigation: wrap every object schema (each aggregate) in
  `v.pipe(v.object({...}), v.readonly())` so each nested type is itself
  `readonly`, and add a `DeepReadonly<T>` type-level assertion test that fails
  to compile if any reachable field is writable. Do not add a runtime deep-clone.
- Risk: `v.check` only runs when the object is fully typed. If any field is
  invalid, the cross-field sum check never executes, so a malformed-and-wrong-sum
  object is rejected for the field error, not the sum error.
  Severity: low. Likelihood: medium.
  Mitigation: this is acceptable — rejection still occurs. Tests assert
  rejection (`success === false`) for malformed inputs and assert the specific
  `type: "check"` issue only for well-typed-but-wrong-sum inputs.
- Risk: `valibot-fast-check` auto-generation chokes on `v.check`/`v.custom`
  constraints (it falls back to generate-and-filter and throws when the yield is
  low); the sum-to-100 constraint is exactly that low-yield case.
  Severity: medium. Likelihood: high if the bridge is used.
  Mitigation: do not add `valibot-fast-check`. Hand-write `fast-check`
  arbitraries that construct valid eight-tuples by distributing 100 across eight
  buckets, and a separate arbitrary that constructs deliberately non-100 sums.
- Risk: placeholder aggregates churn. Minimal placeholder schemas for
  `QualityCoverageVector`, `MacroState`, `GameEvent`, `EventResolution`, and
  `EndingState` will be reshaped by later items and could leak premature
  structure, especially if downstream code (1.4 Dexie persistence, 2.4.3 JSON
  export) serializes a `RunState` containing them before they are finalized.
  Severity: medium. Likelihood: medium.
  Mitigation: isolate them in one `src/domain/model/placeholders.ts` module with
  a header migration contract; do not re-export them from the public barrel so
  no external module can couple to their shapes directly; keep them as small as
  `RunState` compilation and round-trip require; and tag each with the owning
  roadmap item. The 1.4 persistence item must run a schema-migration sweep
  before any placeholder type is promoted.
- Risk: a naive `fast-check` arbitrary for the sum-to-100 property test fails
  silently. A "generate eight integers in [0,100], keep if the sum is 100"
  filter has a hit rate near 1-in-30-million, so `fast-check` exhausts
  `maxSkipsPerRun` and either throws "Too many skipped values" or, worse, runs
  zero effective iterations and reports a vacuous pass. The invalid arbitrary
  has the dual trap: if a field may exceed 100, rejection comes from a
  field-level `max_value` issue, not the cross-field `check`, so an assertion on
  `type: "check"` fails misleadingly.
  Severity: high. Likelihood: high if unspecified.
  Mitigation: the plan specifies the construction (see Artifacts). The valid
  arbitrary builds a composition of 100 across eight buckets directly (a
  stars-and-bars construction: seven sorted breakpoints in [0,100], then take
  successive differences) so every generated tuple is valid by construction with
  no filtering. The invalid arbitrary holds every field in [0,100] and adjusts so
  the sum is deliberately not 100, so the only failing rule is the cross-field
  check (Doggylump review and pre-mortem).
- Risk: ISO-timestamp offset handling. `createdAt` and `lastSimulatedAt` use
  `v.isoTimestamp()`. If the `Clock` port (1.2.2) later emits offset timestamps
  (`+01:00`) rather than UTC `Z`, and Valibot's timestamp validator is strict
  about the suffix, `RunState` round-trips could fail at that boundary.
  Severity: low. Likelihood: low.
  Mitigation: during Stage C, confirm what `v.isoTimestamp()` accepts in the
  installed Valibot version with a focused test, and record in the developer
  guide that the clock adapter must produce timestamps in the accepted form
  (UTC `Z` is the safe default). This binds 1.2.2 without changing scope here
  (Doggylump open question).
- Risk: `bun ff` runs the a11y and e2e suites, which are unrelated to this
  pure-domain change.
  Severity: low. Likelihood: low.
  Mitigation: those suites must still pass green because no UI changed; if they
  fail, the failure is pre-existing and must be escalated, not patched here.

## Progress

- [ ] Stage A: confirm shapes and decisions against the HLD; finalize this plan
  for approval.
- [ ] Stage B (Red): add failing unit and property tests for each aggregate and
  for the sum-to-100 rule; observe the expected failures.
- [ ] Stage C (Green): implement the schemas and inferred types until the red
  tests pass.
- [ ] Stage D (Refactor + docs): tidy the modules, add the `DeepReadonly`
  compile-time assertion, update `docs/developers-guide.md`, and run the full
  `bun ff` gate.
- [ ] CodeRabbit review (`coderabbit review --agent`) clear; roadmap 1.3.1
  marked done; draft PR updated.

## Surprises & discoveries

- Observation: the UI and design documents the roadmap brief lists as references
  (`docs/corbusier-design-language.md`, `docs/daisyui-v5-guide.md`,
  `docs/tailwind-v4-guide.md`, `docs/v2a-front-end-stack.md`,
  `docs/data-model-driven-card-architecture.md`, and the others) do not exist in
  the repository.
  Evidence: `find docs -type f` lists only the ADRs, the HLD, the roadmap, the
  developer and user guides, two HTML mockups, and the execplans directory.
  Impact: none for 1.3.1, which has no UI surface; those documents govern later
  UI slices. Their absence should be raised separately if UI items rely on them.
- Observation: only one locale bundle exists (`public/locales/en-GB/common.ftl`);
  the brief names `en-GB`, `ar`, `zh-CH`, `de`, and `es`.
  Evidence: `find . -name "*.ftl"`.
  Impact: none for 1.3.1 (no user-facing strings introduced). Relevant to UI
  slices that add translatable copy.
- (populate further during implementation with evidence.)

## Decision log

- Decision: Valibot schemas are the single source of truth; TypeScript types are
  derived with `v.InferOutput`.
  Rationale: the success criterion requires objects to round-trip through
  validation, and a derived type cannot drift from the schema that validates it.
  Date/Author: 2026-06-14, planning.
- Decision: brand scalar value types with Valibot's `v.brand(...)` (for example
  `RunId`, `Seed`, `IsoTimestamp`, `TickIndex`, `StageId`, `Percent`,
  `Decimalish`) rather than the hand-rolled `& { readonly __brand }` pattern used
  in `tools/path-aliases.ts`.
  Rationale: schema-first branding keeps the brand and its validation in one
  place and guarantees a branded value can only originate from a parse; the
  hand-rolled pattern in `tools/` exists for non-schema build tooling.
  Date/Author: 2026-06-14, planning.
- Decision: `AllocationPolicy` fields are non-negative integer percentage points
  (each `v.integer()`, `minValue(0)`, `maxValue(100)`) and the sum-to-100 rule
  is an exact integer `v.check`.
  Rationale: integers make the cross-field equality check numerically sound and
  match a percentage-slider UI that commits whole numbers.
  Date/Author: 2026-06-14, planning.
- Decision: achieve deep immutability by wrapping each aggregate schema in
  `v.readonly()` and proving depth with a `DeepReadonly<T>` compile-time
  assertion test, not with a runtime freeze or clone.
  Rationale: the domain stays allocation-light and the guarantee is enforced by
  the type checker, which is where immutability bugs are cheapest to catch.
  Date/Author: 2026-06-14, planning.
- Decision: do not adopt `valibot-fast-check`; hand-write `fast-check`
  arbitraries.
  Rationale: the bridge is young (v0.1.x, single maintainer) and degrades to
  filtering for `v.check` constraints, which the sum-to-100 rule would starve.
  Adding it would also trip the dependency tolerance.
  Date/Author: 2026-06-14, planning.
- Decision: do not adopt `LemmaScript` for an exhaustive proof of the
  sum-to-100 rule in 1.3.1. Verify the invariant with `fast-check` property
  tests plus a small bounded exhaustive enumeration test instead.
  Rationale: `LemmaScript` is a new external dependency (tolerance trigger), and
  the sum-to-100 invariant over integer eight-tuples is adequately and cheaply
  covered by property testing and bounded enumeration. If the user requires a
  formal proof, that is an explicit escalation and a separate, additive change.
  Date/Author: 2026-06-14, planning.
- Decision: model `RunState`'s referenced-but-not-owned aggregates
  (`QualityCoverageVector`, `MacroState`, `GameEvent`, `EventResolution`,
  `EndingState`) as minimal schemas in a single
  `src/domain/model/placeholders.ts`, not re-exported from the public barrel,
  each annotated with the roadmap item that will own its real shape, rather than
  omitting them (which would leave `RunState` uncompilable) or fully designing
  them (which belongs to later items). The module carries a header migration
  contract naming each type's target module and owning item, and stating that
  `placeholders.ts` is deleted (not retained as a forwarding alias) once the
  last type is promoted.
  Rationale: keeps `RunState` complete and round-trippable now while isolating
  and bounding the churn later items cause; not re-exporting blocks external
  coupling to throwaway shapes. The panel converged on this (Pandalump 🔴,
  Telefono 🔴, Wafflecat, Doggylump). The file was renamed from `provisional.ts`
  to `placeholders.ts` because the HLD already implies these minimal shapes
  (`MacroState` ≈ `{ marketIndex }`, `EndingState` ≈ `{ kind, score }`), so they
  are starting points to expand, not stubs to delete-and-restart.
  Date/Author: 2026-06-14, planning (revised after expert review).
- Decision: reject the alternative of deferring `RunState` entirely to a later
  item.
  Rationale: roadmap 1.3.1 explicitly lists `RunState` as an in-scope type to
  implement; deferring it would under-deliver the item. The isolated, bounded
  `placeholders.ts` is the accepted compromise (Wafflecat strongest-alternative
  analysis).
  Date/Author: 2026-06-14, planning.
- Decision: `SeedSchema` constrains the seed to a 32-bit unsigned integer
  (`v.integer()`, `v.minValue(0)`, `v.maxValue(4294967295)`), not an unbounded
  integer.
  Rationale: ADR 005 defines the seed as a 32-bit unsigned value (string seeds
  are hashed to one before reaching the PRNG); an unbounded `Seed` would accept
  `-1` or values above 2^32-1 that the sfc32 contract forbids (Telefono review).
  Date/Author: 2026-06-14, planning.
- Decision: `Decimalish` carries `v.finite()` (rejecting `NaN`/`±Infinity`) but
  no sign or range constraint in 1.3.1; per-field non-negativity (for `loc`,
  `cashPounds`, `powerWatts`) is deferred to the simulation item that defines
  those equations.
  Rationale: finiteness is a cheap, universally-correct guard; sign and range
  depend on simulation semantics not yet settled and on the fixed-point
  outstanding decision in ADR 005. The brand name `Decimalish` is retained for
  now; a rename to a fixed-point name is noted as a future possibility, not a
  blocker (Pandalump, Wafflecat).
  Date/Author: 2026-06-14, planning.
- Decision: the `TechDebtVector` categories are non-negative integers and the
  `EthicsPolicy` numeric fields carry ranges (`fossilEnergyCapPercent` in
  [0,100], `cveDisclosureDays` ≥ 0), tightening the HLD sketch which types them
  as bare `number`.
  Rationale: these reflect real domain invariants (debt counts are whole and
  non-negative; a fossil cap is a percentage; a disclosure window is a
  non-negative day count). Recorded here as deliberate HLD extensions per the
  divergence constraint (Telefono, Pandalump).
  Date/Author: 2026-06-14, planning.
- Decision: the `AllocationPolicy` sum-to-100 rule is enforced solely by
  `AllocationPolicySchema` via `v.check`; the "AllocationPolicy validation
  service" named in roadmap 2.1.2 must delegate to this schema and must not
  re-implement the invariant.
  Rationale: a single enforcement point prevents two divergent authorities. The
  cross-field issue carries the stable code token `"allocation/sum-not-100"`,
  which a test pins so 2.3.3's UI localization lookup cannot break silently
  (Telefono, Doggylump).
  Date/Author: 2026-06-14, planning.
- Decision: the ADR 005 run-identity envelope fields (`saveSchemaVersion`,
  `simTickContractVersion`, the parameter-pack pin, the PRNG pin including
  `prngState`, and `eventLogTailDigest`) are out of scope for `RunState`; they
  belong to the persistence save envelope / Dexie snapshot row defined in 1.4.x,
  not to the runtime `RunState`.
  Rationale: `RunState` carries the minimal runtime identity (`id`, `seed`,
  `createdAt`, `lastSimulatedAt`, `tick`); conflating storage identity into it
  would couple runtime and persistence concerns. `prngState` travels with the
  snapshot, per ADR 005's "carried inside the snapshot itself" (Telefono review).
  Date/Author: 2026-06-14, planning.
- Decision: `Decimalish` is a branded `number` in 1.3.1, documented as a
  candidate for a future fixed-point or big-number representation.
  Rationale: ADR 005 lists "Decide when fixed-point arithmetic becomes
  necessary" as an outstanding decision; deferring that here avoids premature
  commitment while giving large-magnitude resource fields a distinct type.
  Date/Author: 2026-06-14, planning.

## Outcomes & retrospective

- (to be completed at milestone boundaries and at completion. Must confirm:
  `bun ff` green; the eight named types exported from `@domain/model`; the
  sum-to-100 rule enforced and tested; `docs/users-guide.md` unchanged with a
  recorded reason; roadmap 1.3.1 marked done.)

## Context and orientation

Vibe Coder is an offline-first React progressive web application built with
Bun, TypeScript, Vite, XState, Dexie, and Valibot, organized as a hexagonal
(ports-and-adapters) architecture. The primary design document is
`docs/vibe-coder-high-level-design.md` ("HLD"). The relevant architecture
decision record is
`docs/adr-005-use-deterministic-simulation-and-parameter-packs.md` ("ADR 005").
Roadmap item 1.3.1 is defined in `docs/roadmap.md` under phase 1, step 1.3.

The source tree was created by roadmap item 1.2.1. The three layers are
`src/domain/`, `src/application/`, and `src/adapters/`, reachable through the
path aliases `@domain/...`, `@application/...`, and `@adapters/...`
(`tsconfig.json` `compilerOptions.paths`; `tools/path-aliases.ts` is the single
source of truth). Today `src/domain/model/index.ts` is an empty barrel
containing only a `/** @file ... */` header; no value types exist yet. This
item fills `src/domain/model/`.

Import boundaries are enforced two ways: a custom AST guard
(`scripts/import-boundaries.ts`, invoked by `scripts/lint-import-boundaries.ts`
and exercised by `tests/import-boundaries.test.ts`) and a Biome
`noRestrictedImports` override. Domain files must not import `application`,
`adapters`, `app`, `react`, `react-dom`, `react-dom/client`, or `dexie`.
`valibot` is not restricted.

Tests live centrally under `tests/` and run on Bun's test runner (`bun:test`),
invoked by `bun test` with the happy-dom and snapshot-guard preloads. Property
tests already exist (for example `tests/path-aliases.property.test.ts`) and use
`fast-check`. New domain tests for this item go under `tests/domain/`.

The relevant HLD shapes are in HLD "Domain model" → "Core aggregates": the
TypeScript sketches for `RunState`, `Resources`, `TechDebtVector`,
`AllocationPolicy`, and `EthicsPolicy`. `AlignmentState`, `ProgressionState`,
and `UnlockLedger` are named by `RunState` and the roadmap but not sketched in
the HLD; their shapes are proposed in this plan's Interfaces section and
recorded in the Decision Log if they extend the HLD.

Definitions of terms used below. A "branded scalar" is a primitive type tagged
with a unique marker so two structurally identical primitives (a `RunId` and a
plain `string`) are not interchangeable. A "value object" is an immutable type
identified by its contents, not by reference. "Round-trip" means a value parsed
by a schema is accepted, and re-parsing the parsed output is accepted again. A
"pipe" in Valibot is `v.pipe(schema, ...actions)`, a schema followed by
validation or transformation actions. `v.check(fn, message)` is a whole-object
validation action; `v.forward(action, path)` attaches an action's issue to a
named field. `v.InferOutput<typeof S>` extracts the TypeScript type a schema
produces.

### Documentation and skills to consult during implementation

- `docs/vibe-coder-high-level-design.md` — "Module layout", "Domain model" →
  "Core aggregates", "Simulation tick contract", "Non-negotiable business
  rules" (rule 4 for the allocation sum).
- `docs/adr-005-use-deterministic-simulation-and-parameter-packs.md` — pack and
  PRNG identity context; the `Decimalish`/fixed-point outstanding decision.
- `docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md` — the
  dependency rule the domain modules must honour.
- `docs/developers-guide.md` — "Domain layer contents" and "Test conventions";
  this item adds a "Domain value types and schemas" subsection.
- Skills: `hexagonal-architecture` (boundary discipline), `leta` (semantic
  navigation and any later rename), and the `zod4-typescript` skill only as a
  general schema-validation reference — the implementation uses Valibot, not
  Zod, so apply its concepts, not its API.
- The referenced UI and design documents in the roadmap brief
  (`docs/corbusier-design-language.md`, `docs/daisyui-v5-guide.md`,
  `docs/tailwind-v4-guide.md`, `docs/v2a-front-end-stack.md`, and the others)
  are not present in the repository and concern UI construction. They do not
  apply to this pure-domain item; their absence is recorded in Surprises and is
  relevant only to later UI slices.

### Applicability of the cross-cutting requirements to 1.3.1

The roadmap brief attaches standing requirements about translatability, WCAG
2.2, semantic classes, Playwright/`css-view` validation, and accessibility
testing. This item introduces no user interface, no strings a player sees, and
no DOM. Those requirements therefore have no surface to act on here and are
satisfied vacuously: the existing `bun test:a11y` and `bun test:e2e` suites,
run as part of `bun ff`, must remain green because nothing they cover changed.
The one cross-cutting concern that does apply is i18n discipline at the seam:
the schemas must not bake user-facing English so that the future policy UI
(2.3.3) can localize validation feedback. This is honoured by omitting custom
messages except for the sum-check code token, as the Constraints require.

## Plan of work

The work proceeds in four stages with go/no-go validation at each boundary,
following Red-Green-Refactor.

### Stage A: confirm shapes and decisions (no code)

Re-read HLD "Core aggregates" and reconcile each field with the proposed
schemas in this plan's Interfaces section. Confirm the provisional-aggregate
decision and the `AlignmentState` / `ProgressionState` / `UnlockLedger` shapes
with the reviewer through the approval gate. Output: this plan, approved. No
code changes.

### Stage B: red tests

Add `tests/domain/` test files that import the not-yet-existing schemas from
`@domain/model` and assert the intended behaviour. Note the precise nature of
the red: Bun's test runner strips TypeScript types and does not run `tsc`, and
`src/domain/model/index.ts` already exists as an empty barrel, so importing a
not-yet-exported `RunStateSchema` binds it to `undefined` at run time rather
than producing a module-not-found or compile error. The first
`v.safeParse(RunStateSchema, ...)` then throws `TypeError: ... is not a
function`. That is the intended runtime red for the schema tests; the go/no-go
check is to confirm the error is this `TypeError` (missing export), not an
unrelated typo or import error. The `DeepReadonly` assertion is instead a
type-level red observed through `make typecheck` (`tsc --noEmit` includes
`tests/`), which fails until the immutable types exist.

The red suite must cover, per aggregate: a representative valid object parses
(`v.safeParse(Schema, valid).success === true`); a representative invalid object
is rejected (`success === false`) with at least one asserted issue `type`; and
for `AllocationPolicy`, explicit edge cases — `{ ship: 100, rest: 0 }` (single
field at the maximum, sum 100, accepted); `{ ship: 100, openSource: 1, rest: 0 }`
(individually valid fields, sum 101, rejected with `type: "check"`); and a
sum-99 case — plus an assertion that the rejecting issue's `message` equals the
stable token `"allocation/sum-not-100"`. Add the property tests using the
arbitraries specified in Artifacts (the stars-and-bars valid arbitrary, the
all-fields-in-[0,100]-but-not-100 invalid arbitrary, and a parse-output-re-parses
round-trip) and the `DeepReadonly` compile-time assertion. Run `bun test` and
`make typecheck` and observe the expected failures. Go/no-go: every new test
fails for the intended reason, not for an unrelated error, and each property
test demonstrably executes its iterations (no vacuous pass from skip-exhaustion).

### Stage C: implementation (green)

Create the modules under `src/domain/model/` named per HLD "Module layout":
`scalars.ts` (branded scalars and shared numeric helpers), `resources.ts`,
`tech-debt.ts`, `policy.ts` (`AllocationPolicy` and `EthicsPolicy`),
`alignment.ts`, `progression.ts` (`ProgressionState` and `UnlockLedger`),
`placeholders.ts` (the minimal placeholder aggregates `RunState` references,
with the migration-contract header), and `run-state.ts` (`RunState`). Re-export
the eight named aggregate schemas and their inferred types, plus the branded
scalars, from `src/domain/model/index.ts`; do not re-export the placeholder
schemas (they reach consumers only through `RunState`'s composed type).
Implement each schema minimally to turn its red tests green, running the focused
test after each module. Go/no-go: `bun test` passes for the new suites.

### Stage D: refactor, documentation, and full gate

Tidy the modules for consistency (shared scalar helpers, consistent ordering of
fields to match the HLD sketches, `/** @file ... */` headers, JSDoc on exported
schemas). Confirm the `DeepReadonly` assertion compiles. Add the "Domain value
types and schemas" subsection to `docs/developers-guide.md`. Record any HLD
divergence in the Decision Log. Run the full gate `bun ff` and confirm it
passes with no errors, failures, or violations. Go/no-go: `bun ff` green;
`make check-fmt`, `make typecheck`, `make lint`, and `make test` each succeed.

## Concrete steps

Run all commands from the repository root. Use `tee` to a per-action log under
`/tmp` so truncated output can be reviewed, per the repository command
conventions.

1. Confirm the branch and a clean tree.

   ```bash
   git branch --show-current
   git status --short
   ```

   Expect the branch `1-3-1-immutable-types-with-valibot-schemas` (after the
   rename step in this task) and a clean tree before starting Stage B.

2. Stage B — add the red tests, then run the domain suite.

   ```bash
   bun test tests/domain 2>&1 | tee "/tmp/test-vibe-coder-$(git branch --show-current).out"
   ```

   Expect failures: modules under `@domain/model` do not yet export the
   schemas. Confirm the failure reason is the missing export or unmet
   assertion, not a typo or unrelated import error.

3. Stage C — implement the schemas, re-running the focused suite until green.

   ```bash
   bun test tests/domain 2>&1 | tee "/tmp/test-vibe-coder-$(git branch --show-current).out"
   ```

   Expect all new domain tests to pass.

4. Stage D — run the formatting, type, lint, and full gates in sequence (never
   in parallel, to benefit from build caching). Ensure the gitignored `tmp/`
   directory exists first, because the `ff` script's Tailwind CLI step writes
   `tmp/tailwind.css` and a clean checkout has no `tmp/`.

   ```bash
   mkdir -p tmp
   make check-fmt 2>&1 | tee "/tmp/fmt-vibe-coder-$(git branch --show-current).out"
   make typecheck 2>&1 | tee "/tmp/typecheck-vibe-coder-$(git branch --show-current).out"
   make lint      2>&1 | tee "/tmp/lint-vibe-coder-$(git branch --show-current).out"
   make test      2>&1 | tee "/tmp/test-vibe-coder-$(git branch --show-current).out"
   bun ff         2>&1 | tee "/tmp/ff-vibe-coder-$(git branch --show-current).out"
   ```

   Expect each to exit zero. `bun ff` runs the full `test:all` suite (lint,
   types, unit tests, a11y, fluent-vars, semantic lint, and e2e) and must
   report no errors, failures, or violations.

5. Request a CodeRabbit review only after all deterministic gates are green.

   ```bash
   coderabbit review --agent 2>&1 | tee "/tmp/coderabbit-vibe-coder-$(git branch --show-current).out"
   ```

   Clear every concern before proceeding. Commit frequently across Stages B–D
   so each green state is an easy rollback point.

## Validation and acceptance

Acceptance is behavioural and observable through the test suite.

Red-Green-Refactor evidence to record in Progress and Outcomes:

- Red: `bun test tests/domain` fails because `@domain/model` does not export the
  schemas (or because the assertions are unmet). Capture the failing output.
- Green: after Stage C, `bun test tests/domain` passes; capture the pass count.
- Refactor: after Stage D, `bun ff` passes end to end; capture the summary.

Quality criteria (what "done" means):

- Tests: the new `tests/domain/*.test.ts` and `tests/domain/*.property.test.ts`
  suites pass. For each of the eight named aggregates, a valid object parses and
  a representative invalid object is rejected. The `AllocationPolicy` unit tests
  cover the explicit edge cases (single field at 100; sum 101 with individually
  valid fields; sum 99) and pin the rejecting issue's `message` to
  `"allocation/sum-not-100"` so the 2.3.3 UI localization key cannot drift. The
  `AllocationPolicy` property test confirms across many generated cases that
  integer eight-tuples summing to 100 are accepted and all non-100 sums are
  rejected with a `type: "check"` issue, and each property test is shown to
  execute its iterations (no vacuous skip-exhaustion pass). A round-trip property
  test confirms parsed output re-parses. The `DeepReadonly` compile-time
  assertion compiles, proving the inferred types are deeply immutable.
- Types: `make typecheck` (`tsc --noEmit`) passes; every aggregate type is
  derived via `v.InferOutput`; the branded scalars are nominally distinct.
- Lint and format: `make check-fmt`, `make lint`, and `bun semantic` pass; the
  import-boundary guard reports no domain violation.
- Full gate: `bun ff` exits zero with no errors, failures, or violations.
- Documentation: `docs/developers-guide.md` gains the "Domain value types and
  schemas" subsection; `docs/users-guide.md` is unchanged with the reason
  recorded in Outcomes; any HLD divergence is in the Decision Log.

Quality method: run the gates in the order in Concrete Steps, review the `tee`
logs, then request the CodeRabbit review and clear all concerns.

## Idempotence and recovery

All steps are safe to repeat. The work only adds files under
`src/domain/model/` and `tests/domain/`, edits `src/domain/model/index.ts`
(barrel re-exports), and edits `docs/developers-guide.md`. Re-running the test
and gate commands is non-destructive. If a stage half-completes, the Progress
section records "completed" versus "remaining"; resume from the first unchecked
item. Commit at each green boundary so a failed refactor can be reset with
`git restore` to the last good commit. No data migration, no destructive
operation, and no external service is involved.

## Artifacts and notes

Research confirming the Valibot 1.x and fast-check v4 idioms used by this plan
(verified against valibot.dev and fast-check.dev during planning):

- Object schema and inference: `import * as v from "valibot"`; `v.object({...})`;
  type via `v.InferOutput<typeof Schema>` (1.x uses `InferOutput`/`InferInput`,
  not the historical `Output`/`Input`).
- Literal unions: `v.picklist(["forbid", "allow"])` is preferred over a union of
  `v.literal(...)` for a set of string literals.
- Number bounds: `v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100))`
  — the action names are `minValue`/`maxValue`, not `min`/`max`.
- Branding: `v.pipe(v.string(), v.brand("RunId"))` yields `string & Brand<"RunId">`.
- Readonly: `v.pipe(v.object({...}), v.readonly())` marks the wrapped level
  readonly; apply per nesting level for deep immutability.
- Cross-field check: `v.pipe(v.object({...}), v.check(predicate, "code"))`, runs
  only when the object is fully typed; `v.forward(check, ["field"])` attaches the
  issue to a field. The cross-field issue has `type: "check"`.
- parse vs safeParse: `v.parse` throws `ValiError`; `v.safeParse` returns
  `{ success, output, issues }`; read `issues[0].type` in rejection tests.
- fast-check v4: `fc.assert(fc.property(arb, predicate))`, `fc.integer({min,max})`,
  `fc.record(model, { noNullPrototype: true })`, `fc.constantFrom(...)`. Avoid
  `valibot-fast-check`; hand-write arbitraries for constrained types.

The allocation arbitraries must be constructed so they never rely on rejection
sampling against the sum constraint (which would exhaust `fast-check`'s skip
budget and risk a vacuous pass). The valid arbitrary uses a stars-and-bars
composition of 100 into eight non-negative integer parts; the invalid arbitrary
keeps every field within [0,100] and forces a non-100 sum, so the only failing
rule is the cross-field check:

```ts
// example only — eight field keys in declaration order
const KEYS = ["ship","openSource","quality","security","researchUx","marketingSales","civicAction","powerInfra"] as const;

// Valid: compose 100 into 8 parts via 7 sorted breakpoints in [0,100].
const validPolicy = fc
  .array(fc.integer({ min: 0, max: 100 }), { minLength: 7, maxLength: 7 })
  .map((cuts) => {
    const b = [...cuts].sort((x, y) => x - y);
    const parts = [b[0], b[1]-b[0], b[2]-b[1], b[3]-b[2], b[4]-b[3], b[5]-b[4], b[6]-b[5], 100-b[6]];
    return Object.fromEntries(KEYS.map((k, i) => [k, parts[i]]));
  }); // every part is in [0,100] and the eight sum to exactly 100

// Invalid: all fields in [0,100], then nudge so the sum is provably not 100.
const invalidPolicy = fc
  .record(Object.fromEntries(KEYS.map((k) => [k, fc.integer({ min: 0, max: 100 })])), { noNullPrototype: true })
  .filter((p) => KEYS.reduce((s, k) => s + p[k], 0) !== 100);
// the filter rejects only the measure-zero exact-100 case, so skip pressure is negligible
```

The `DeepReadonly<T>` utility and its assertion live in `scalars.ts` and a
`tests/domain/immutability.test-d.ts`-style type test. The utility recurses
through objects and arrays; the assertion proves `RunState` is already deeply
readonly by requiring mutual assignability with its `DeepReadonly` image, so any
missed nested `v.readonly()` becomes a `tsc` error:

```ts
// example only
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type AssertTrue<T extends true> = T;

// Fails to compile if RunState is not already deeply readonly:
type _RunStateIsDeepReadonly = AssertTrue<Equals<RunState, DeepReadonly<RunState>>>;
```

## Interfaces and dependencies

All schemas use `import * as v from "valibot"`. Types are derived, not
hand-written. The following signatures must exist at the end of the milestone,
exported from `src/domain/model/index.ts`. Field shapes for `RunState`,
`Resources`, `TechDebtVector`, `AllocationPolicy`, and `EthicsPolicy` follow the
HLD "Core aggregates" sketch exactly; `AlignmentState`, `ProgressionState`, and
`UnlockLedger` are proposed here and subject to approval.

Branded scalars (`src/domain/model/scalars.ts`):

```ts
// example only — final messages omitted per i18n discipline
export const RunIdSchema = v.pipe(v.string(), v.brand("RunId"));
export type RunId = v.InferOutput<typeof RunIdSchema>;

// Seed: 32-bit unsigned integer, matching the sfc32 seeding contract (ADR 005).
export const SeedSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(4294967295), v.brand("Seed"));
export type Seed = v.InferOutput<typeof SeedSchema>;

export const IsoTimestampSchema = v.pipe(v.string(), v.isoTimestamp(), v.brand("IsoTimestamp"));
export type IsoTimestamp = v.InferOutput<typeof IsoTimestampSchema>;

export const TickIndexSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.brand("TickIndex"));
export type TickIndex = v.InferOutput<typeof TickIndexSchema>;

export const StageIdSchema = v.pipe(v.string(), v.brand("StageId"));
export type StageId = v.InferOutput<typeof StageIdSchema>;

export const PercentSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100), v.brand("Percent"));
export type Percent = v.InferOutput<typeof PercentSchema>;

// Decimalish: finite branded number now; candidate for fixed-point/big-number later (ADR 005).
// v.finite() rejects NaN/±Infinity so a simulation NaN cannot pass validation unseen.
export const DecimalishSchema = v.pipe(v.number(), v.finite(), v.brand("Decimalish"));
export type Decimalish = v.InferOutput<typeof DecimalishSchema>;
```

Core aggregates (one module each, all wrapped in `v.readonly()`):

```ts
// resources.ts
export const ResourcesSchema = v.pipe(v.object({
  loc: DecimalishSchema,
  valueLoc: DecimalishSchema,
  cashPounds: DecimalishSchema,
  karma: v.number(),
  brand: v.number(),
  powerWatts: DecimalishSchema,
  pmf: v.number(),
  humanCustomerIncome: DecimalishSchema,
  robotCustomerIncome: DecimalishSchema,
}), v.readonly());
export type Resources = v.InferOutput<typeof ResourcesSchema>;

// tech-debt.ts — eight non-negative integer categories
export const TechDebtVectorSchema = v.pipe(v.object({
  cyclomaticComplexity: NonNegIntSchema,
  cqrsViolations: NonNegIntSchema,
  configDrift: NonNegIntSchema,
  xss: NonNegIntSchema,
  sqlInjection: NonNegIntSchema,
  shellInjection: NonNegIntSchema,
  csrf: NonNegIntSchema,
  cves: NonNegIntSchema,
}), v.readonly());
export type TechDebtVector = v.InferOutput<typeof TechDebtVectorSchema>;

// policy.ts — AllocationPolicy with the sum-to-100 cross-field rule
export const AllocationPolicySchema = v.pipe(
  v.object({
    ship: PercentSchema,
    openSource: PercentSchema,
    quality: PercentSchema,
    security: PercentSchema,
    researchUx: PercentSchema,
    marketingSales: PercentSchema,
    civicAction: PercentSchema,
    powerInfra: PercentSchema,
  }),
  v.check(
    (p) => p.ship + p.openSource + p.quality + p.security + p.researchUx
      + p.marketingSales + p.civicAction + p.powerInfra === 100,
    "allocation/sum-not-100",
  ),
  v.readonly(),
);
export type AllocationPolicy = v.InferOutput<typeof AllocationPolicySchema>;

// policy.ts — EthicsPolicy
export const EthicsPolicySchema = v.pipe(v.object({
  darkPatterns: v.picklist(["forbid", "allow"]),
  fossilEnergyCapPercent: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)),
  cveDisclosureDays: v.pipe(v.number(), v.integer(), v.minValue(0)),
  trainingPiracy: v.picklist(["forbid", "allow"]),
  labourPolicy: v.picklist(["human-centred", "automation-first", "extractive"]),
  politicalInfluence: v.picklist(["civic", "backroom", "none"]),
}), v.readonly());
export type EthicsPolicy = v.InferOutput<typeof EthicsPolicySchema>;
```

Proposed aggregates not sketched in the HLD (subject to approval; recorded in
the Decision Log when encoded):

```ts
// alignment.ts — a bounded scalar plus drift, in human-centred terms
export const AlignmentStateSchema = v.pipe(v.object({
  // 0 = fully misaligned, 1 = fully human-centred; drift is per-tick signed change
  humanCentred: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  drift: v.pipe(v.number(), v.finite()), // finite guard; range deferred to the alignment simulation item
}), v.readonly());
export type AlignmentState = v.InferOutput<typeof AlignmentStateSchema>;

// progression.ts — current stage and a non-negative momentum toward the next gate
export const ProgressionStateSchema = v.pipe(v.object({
  stage: StageIdSchema,
  gateProgress: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
}), v.readonly());
export type ProgressionState = v.InferOutput<typeof ProgressionStateSchema>;

// progression.ts — the set of unlocked stage identifiers, as an immutable list
export const UnlockLedgerSchema = v.pipe(v.object({
  unlockedStages: v.pipe(v.array(StageIdSchema), v.readonly()),
}), v.readonly());
export type UnlockLedger = v.InferOutput<typeof UnlockLedgerSchema>;
```

Placeholder schemas for `RunState`'s other references
(`src/domain/model/placeholders.ts`). These are minimal starting shapes, NOT
re-exported from the public barrel, each tagged with the roadmap item that will
own its real definition. The module header records the migration contract: the
target module for each type and that `placeholders.ts` is deleted once the last
type is promoted.

```ts
// Minimal starting shapes — owned and expanded by later roadmap items.
// Not re-exported from index.ts: consumers reach these only via RunState.
export const QualityCoverageVectorSchema = v.pipe(v.object({ overall: v.pipe(v.number(), v.minValue(0), v.maxValue(1)) }), v.readonly()); // → quality, sim item
export const MacroStateSchema = v.pipe(v.object({ marketIndex: v.pipe(v.number(), v.finite()) }), v.readonly()); // → macro-economy item
export const GameEventSchema = v.pipe(v.object({ id: v.string(), kind: v.string(), tick: TickIndexSchema }), v.readonly()); // → events.ts (3.x)
export const EventResolutionSchema = v.pipe(v.object({ eventId: v.string(), choice: v.string(), tick: TickIndexSchema }), v.readonly()); // → events.ts (3.x)
export const EndingStateSchema = v.pipe(v.object({ kind: v.string(), score: v.pipe(v.number(), v.finite()) }), v.readonly()); // → endings.ts (7.x)
```

`RunState` (`src/domain/model/run-state.ts`) composes the above:

```ts
export const RunStateSchema = v.pipe(v.object({
  id: RunIdSchema,
  seed: SeedSchema,
  createdAt: IsoTimestampSchema,
  lastSimulatedAt: IsoTimestampSchema,
  tick: TickIndexSchema,
  stage: StageIdSchema,
  resources: ResourcesSchema,
  policy: AllocationPolicySchema,
  ethics: EthicsPolicySchema,
  techDebt: TechDebtVectorSchema,
  quality: QualityCoverageVectorSchema,
  alignment: AlignmentStateSchema,
  macro: MacroStateSchema,
  progression: ProgressionStateSchema,
  pendingEvents: v.pipe(v.array(GameEventSchema), v.readonly()),
  resolvedEvents: v.pipe(v.array(EventResolutionSchema), v.readonly()),
  unlocks: UnlockLedgerSchema,
  ending: v.optional(EndingStateSchema),
}), v.readonly());
export type RunState = v.InferOutput<typeof RunStateSchema>;
```

A shared `NonNegIntSchema` (`v.pipe(v.number(), v.integer(), v.minValue(0))`) and
the `DeepReadonly<T>` utility plus its `Equals`/`AssertTrue` assertion helpers
live in `scalars.ts` (see Artifacts for the assertion shape). The placeholder
schemas in `placeholders.ts` are consumed only by `run-state.ts` and are not
re-exported from the barrel. No new package dependency is introduced: `valibot`
and `fast-check` are already in `package.json`.

The developer-guide subsection added in Stage D must also record the
domain/application validation seam: the application layer (for example the
policy machine in 2.3.3) will call these domain schemas through
`v.safeParse` and therefore couples its error presentation to Valibot's `issues`
structure by design. That coupling is accepted, not accidental; it is the single
sanctioned place where a non-domain layer reads Valibot output (Pandalump
review).

## Revision note

- 2026-06-14 — Revised after a Logisphere community-of-experts design review
  (Telefono on contracts, Pandalump on structure, Doggylump on failure modes,
  Wafflecat on alternatives). Changes: tightened `Seed` to a 32-bit unsigned
  range; added `v.finite()` to `Decimalish` and `AlignmentState.drift`; renamed
  `provisional.ts` to `placeholders.ts`, made it un-exported from the barrel, and
  gave it a deletion/migration contract; specified the stars-and-bars valid
  arbitrary and the in-range invalid arbitrary to avoid skip-exhaustion;
  corrected the Stage B "red" description to the actual Bun runtime `TypeError`
  plus a `tsc` type-level red for the `DeepReadonly` assertion, and added that
  assertion's concrete shape; added explicit `AllocationPolicy` edge-case unit
  tests and a pin on the `"allocation/sum-not-100"` token; added `mkdir -p tmp`
  before `bun ff`; and recorded scoping decisions (identity-envelope and
  `prngState` out of `RunState`; the 2.1.2 validation service delegates to the
  schema; HLD numeric tightenings; the branded-scalars-via-parse-only rule; the
  accepted application/Valibot validation seam). The plan remains in DRAFT and
  these revisions do not change its scope. No remaining work is blocked.
- (append further revision notes here as the plan changes. Update the Status
  field when the plan's state changes.)

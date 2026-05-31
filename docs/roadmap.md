# Vibe Coder roadmap

This roadmap translates the high-level design and architecture decision record
pack into an outcome-oriented delivery sequence. It does not promise dates.
Each phase carries one testable idea at the GIST level. The steps underneath
that phase work toward validating or falsifying the idea, answering specific
sequencing questions, and leaving behind usable functionality rather than
another horizontal layer.

The primary design document is
`docs/vibe-coder-high-level-design.md` (hereafter "HLD"). Architecture
decision records live in `docs/adr-001-*.md` through `docs/adr-011-*.md`.
Tasks cite both sources using the `§` notation from this roadmap's
conventions.

The GIST hierarchy used here is: phase = idea (testable hypothesis), step =
workstream (a delivery objective that validates or falsifies some aspect of
the phase idea), task = execution unit (a concrete, measurable piece of build
work). Steps are sequenced so each one either unlocks the next or reduces a
specific delivery risk.

______________________________________________________________________

## 1. Foundational contracts and build spine

Idea: if Vibe Coder settles its hexagonal source boundaries, driven-port
contracts, Dexie schema, XState machine skeleton, parameter-pack shape, and
test scaffolding before feature work starts, later vertical slices can
converge on one coherent architecture instead of repeatedly reworking
interfaces and import graphs.

The repository already has a React PWA shell, routing, theme, i18n, and test
infrastructure. What it lacks is the domain core and adapter skeleton that
all six vertical slices will depend on. This phase closes that gap without
writing any simulation equations; equations arrive in phase 2.

### 1.1. Ratify outstanding decisions recorded in the ADRs

This step answers what contracts must be settled before the first simulation
line is written. Its outcome unblocks source-tree layout, import-boundary
rules, and adapter shapes. See
`adr-001-build-an-offline-first-react-pwa.md` §Outstanding decisions,
`adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
§Outstanding decisions, `adr-003-use-xstate-for-workflow-orchestration.md`
§Outstanding decisions, `adr-005-use-deterministic-simulation-and-parameter-packs.md`
§Outstanding decisions.

- [x] 1.1.1. Record the package runner choice (Bun) and confirm the service
  worker strategy (Vite PWA plugin or custom worker) as a short ADR amendment
  or decision log entry.
  - See `adr-001-build-an-offline-first-react-pwa.md` §Outstanding decisions.
  - Success: one accepted document records both choices; no open question
    remains in ADR 001.

- [x] 1.1.2. Record the TypeScript source-tree naming (`domain/` vs `core/`)
  and import-boundary lint rule strategy as a decision log entry.
  - See `adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
    §Outstanding decisions.
  - Success: the chosen layout matches the module map in HLD §"Module layout"
    and a lint rule (Biome or custom) guards the boundary.

- [x] 1.1.3. Record the XState machine collocation strategy (feature-colocated
  vs `application/machines/`) and the first model-test harness choice.
  - See `adr-003-use-xstate-for-workflow-orchestration.md` §Outstanding
    decisions.
  - Success: one accepted document confirms placement; the first machine test
    compiles and passes.

- [x] 1.1.4. Record the seeded pseudo-random number generator choice and the
  version migration policy for runs created under older parameter packs.
  - See `adr-005-use-deterministic-simulation-and-parameter-packs.md`
    §Outstanding decisions.
  - Success: one accepted document names the PRNG (e.g. Mulberry32 or
    Xoshiro128+); the migration policy is documented.

### 1.2. Create the hexagonal source-tree skeleton

This step answers whether the intended module layout can be expressed as a
compilable TypeScript tree with enforced import boundaries. It unblocks all
later domain and adapter work. See HLD §"Module layout" and
`adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`.

- [ ] 1.2.1. Create the `domain/`, `application/`, and `adapters/` package
  boundaries with index files and Biome/TSConfig path aliases.
  - Requires 1.1.2.
  - Mirror the directory tree in HLD §"Module layout".
  - Success: `bun check:types` passes on the empty skeleton; Biome rejects any
    file in `domain/` that imports from `adapters/`.

- [ ] 1.2.2. Define the driven-port interfaces: `GameStateRepository`,
  `Clock`, `RandomSource`, `AudioEventSink`, `AssetCatalogue`, and
  `TelemetrySink`.
  - Requires 1.2.1.
  - Place interfaces inside `domain/ports/` per HLD §"Module layout".
  - See `adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
    §Decision outcome.
  - Success: all six port types compile; no port file imports from an adapter
    module.

- [ ] 1.2.3. Implement stub in-memory adapters for every driven port.
  - Requires 1.2.2.
  - Stubs must satisfy the port interfaces and be usable in unit tests without
    a browser.
  - Success: a test harness can wire all stubs and call an empty application
    service without errors.

### 1.3. Define and validate the core domain value types

This step answers whether the domain model compiles, round-trips through
Valibot validation, and satisfies its invariants in isolation. Its outcome
informs the simulation contract in phase 2. See HLD §"Domain model" and
`adr-005-use-deterministic-simulation-and-parameter-packs.md`.

- [ ] 1.3.1. Implement `RunState`, `Resources`, `TechDebtVector`,
  `AllocationPolicy`, `EthicsPolicy`, `AlignmentState`, `ProgressionState`,
  and `UnlockLedger` as immutable TypeScript types with Valibot schemas.
  - Requires 1.2.1.
  - See HLD §"Core aggregates".
  - Success: Valibot parse accepts valid objects and rejects invalid ones;
    `AllocationPolicy` schema enforces percentages summing to 100; type tests
    cover all fields.

- [ ] 1.3.2. Implement the `ParameterPack` type and a default checked-in pack
  with all tunable constants.
  - Requires 1.3.1.
  - See HLD §"Parameter packs" and
    `adr-005-use-deterministic-simulation-and-parameter-packs.md` §Migration
    plan.
  - Success: the default pack compiles; its hash is stable across environments;
    self-play can load it without a browser.

- [ ] 1.3.3. Implement the seeded `RandomSource` adapter using the chosen
  PRNG.
  - Requires 1.1.4 and 1.2.3.
  - See `adr-005-use-deterministic-simulation-and-parameter-packs.md`
    §Outstanding decisions.
  - Success: the same seed produces the same sequence across ten runs;
    property tests confirm distribution.

### 1.4. Scaffold the Dexie persistence schema and migration tests

This step answers whether the chosen Dexie schema supports run creation,
snapshot, event logging, and migration without React. Its outcome is required
by every slice that saves or loads a run. See HLD §"Dexie schema" and
`adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md`.

- [ ] 1.4.1. Implement the Dexie schema version 1 with tables for `runs`,
  `runSnapshots`, `runEvents`, `settings`, `parameterPacks`, `contentPacks`,
  and `selfPlayReports`.
  - Requires 1.2.3 and 1.3.1.
  - See HLD §"Dexie schema" and
    `adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md` §Decision
    outcome.
  - Success: the schema creates all tables in Happy DOM; a round-trip test
    writes and reads a `RunState` without data loss.

- [ ] 1.4.2. Implement the `DexieGameStateRepository` adapter against the
  `GameStateRepository` port.
  - Requires 1.4.1 and 1.2.2.
  - Success: the adapter passes all contract tests that were written against
    the in-memory stub.

- [ ] 1.4.3. Add migration tests that verify version 1 tables survive a
  re-open and that a future version 2 migration preserves or archives
  existing rows.
  - Requires 1.4.2.
  - See `adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md` §Known
    risks.
  - Success: tests run headless; no migration silently destroys saved data.

### 1.5. Scaffold the XState machine shells and model tests

This step answers whether the six machines can be defined, connected to the
React tree, and model-tested for unreachable states before simulation
equations exist. See HLD §"XState state graph" and
`adr-003-use-xstate-for-workflow-orchestration.md`.

- [ ] 1.5.1. Implement shell definitions for `app.machine`, `run.machine`,
  `policy.machine`, `event.machine`, `progression.machine`, and
  `audio.machine`.
  - Requires 1.1.3 and 1.3.1.
  - See HLD §"Top-level machines" and §"Machine responsibilities".
  - Success: all six machines compile; the app boots and reaches the `Title`
    state; no forbidden state is reachable in model tests.

- [ ] 1.5.2. Wire `app.machine` to the React tree through an XState provider.
  - Requires 1.5.1.
  - See HLD §"Module layout" (`application/machines/`).
  - Success: the existing routing tree remains functional; `bun test:a11y`
    passes.

______________________________________________________________________

## 2. Vertical slice 1: the aquarium breathes

Idea: if the first playable slice proves that a player can type a ritual,
set policies, watch LoC accumulate, and see at least one consequence change
— all without clicking repeatedly — then Vibe Coder's core no-click loop is
real, and the subsequent slices can be built with confidence that the
foundation holds.

This slice delivers the minimum viable conversation: player says something,
simulation thinks, game speaks back. It does not require incidents, ethics,
audio, or canvas animation; those arrive in later slices.

### 2.1. Implement the pure simulation tick for stage 1

This step answers whether the tick contract from the HLD can be implemented
as a pure function that changes `RunState` reproducibly. It is the most
critical technical proof in the project. See HLD §"Simulation design" and
`adr-005-use-deterministic-simulation-and-parameter-packs.md`,
`adr-010-run-fixed-tick-simulation-outside-react-rendering.md`.

- [ ] 2.1.1. Implement `simulateTick(input: SimTickInput): SimTickOutput` as a
  pure function with no side effects, reading only its declared inputs.
  - Requires phase 1.
  - See HLD §"Simulation tick contract" and §"The system heartbeat".
  - Cover tick-order steps 1–8: policy validation, power availability,
    alignment multiplier, LoC throughput, allocation split, tech debt
    generation and reduction, shippable value, and revenue/karma/brand update.
  - Do not implement incident rolling (step 10) yet; that arrives in slice 2.
  - Success: a property test confirms that `simulateTick` is deterministic
    over 1,000 seed/input combinations; no import of React, Dexie, Canvas, or
    Web Audio is present.

- [ ] 2.1.2. Implement the `AllocationPolicy` validation service ensuring
  percentages always sum to 100 before entering the tick.
  - Requires 2.1.1.
  - See HLD §"Non-negotiable business rules" (rule 4) and HLD §"Core
    aggregates" (`AllocationPolicy`).
  - Success: invalid policies are rejected at the application boundary; they
    never reach `simulateTick`.

- [ ] 2.1.3. Implement the `startRun` application service: create a
  `RunState`, bind the default parameter pack, persist an initial snapshot.
  - Requires 2.1.1 and 1.4.2.
  - See HLD §"Key workflows" (first run).
  - Success: a new run round-trips through Dexie; its parameter-pack hash is
    stored and matches the default pack.

### 2.2. Implement the main-thread fixed-tick driving adapter

This step answers whether the fixed-tick loop can advance `RunState` at a
configured cadence and expose snapshots to the React tree without letting
React own simulation timing. See
`adr-010-run-fixed-tick-simulation-outside-react-rendering.md`.

- [ ] 2.2.1. Implement a main-thread `TickService` that calls `simulateTick`
  at a configured interval and exposes immutable snapshots via a subscription.
  - Requires 2.1.1 and 1.5.1.
  - See `adr-010-run-fixed-tick-simulation-outside-react-rendering.md`
    §Migration plan.
  - Success: the tick loop advances `RunState` independently of React render
    cycles; pausing the loop stops state advancement; React components receive
    snapshots, not mutable state.

- [ ] 2.2.2. Implement offline catch-up: when the app resumes, compute bounded
  batches of ticks and emit a summary domain event.
  - Requires 2.2.1.
  - See HLD §"Save strategy" and HLD §"Key workflows" (offline return).
  - Success: a test with a simulated 30-minute absence produces a legible
    summary; incident spam is capped; active play resumes correctly.

### 2.3. Deliver the typing ritual and first-run UI

This step answers whether the manual typing ritual, initial ethos choice, and
first policy setting can be built as accessible React screens driven by
`app.machine` and `policy.machine`. See HLD §"Core screens" and
`adr-007-keep-runtime-interface-authoritative-and-deterministic.md`.

- [ ] 2.3.1. Implement the manual typing ritual screen with a 30-second
  timed input field, seed summary, and initial ethos choice.
  - Requires 1.5.2 and 2.1.3.
  - See HLD §"Core screens" (Manual Typing Ritual) and HLD §"Non-negotiable
    business rules" (rule 3).
  - Success: the ritual cannot be skipped; keyboard navigation works;
    `bun test:a11y` passes on the screen.

- [ ] 2.3.2. Implement the main dashboard with a resource top bar showing
  LoC, cash, karma, brand, PMF, and power.
  - Requires 2.2.1 and 2.3.1.
  - See HLD §"Core screens" (Main Dashboard) and
    `adr-007-keep-runtime-interface-authoritative-and-deterministic.md`
    §Decision outcome.
  - All values must come from domain selectors, not from Canvas or generated
    imagery.
  - Success: values update on every tick snapshot; `bun test:a11y` passes;
    a screen-reader can read each resource.

- [ ] 2.3.3. Implement the policy sliders panel with eight allocation
  controls that sum to 100 and commit through `policy.machine`.
  - Requires 2.3.2.
  - See HLD §"Core aggregates" (`AllocationPolicy`) and
    `adr-003-use-xstate-for-workflow-orchestration.md` (policy.machine).
  - Success: invalid combinations are rejected before commit; draft policy
    does not enter the simulation; keyboard and numeric-input controls work.

### 2.4. Add save, load, and run archive

This step answers whether the Dexie adapter can persist the run reliably and
whether the player can resume after a browser restart. See
`adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md` and HLD
§"Save strategy".

- [ ] 2.4.1. Implement periodic snapshot persistence triggered by the tick
  service.
  - Requires 2.2.1 and 1.4.2.
  - See HLD §"Save strategy".
  - Success: a snapshot is written at the configured cadence; a page reload
    restores the run from the latest snapshot.

- [ ] 2.4.2. Implement save/load through `app.machine` including loading
  the most recent snapshot on boot.
  - Requires 2.4.1 and 1.5.1.
  - See HLD §"Key workflows" and
    `adr-001-build-an-offline-first-react-pwa.md` §"Migration plan".
  - Success: the app boots offline and continues a run; Dexie migration tests
    still pass.

- [ ] 2.4.3. Implement JSON import and export for a single run.
  - Requires 2.4.2.
  - See HLD §"Security and privacy" and
    `adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md` §Migration
    plan.
  - Exported JSON must include schema version, run ID, seed, and
    parameter-pack hash.
  - Success: an exported run can be re-imported and continues from its last
    tick; Valibot schema rejects malformed imports.

### 2.5. Prove slice 1 end-to-end

This step answers whether the assembled slice delivers the first milestone
from the HLD: a player opens offline, performs the ritual, sets policy,
watches LoC accumulate, and sees the simulation respond.

- [ ] 2.5.1. Write a Playwright end-to-end test covering the full first-run
  happy path: boot offline → ritual → policy set → resource bar updates.
  - Requires steps 2.1–2.4.
  - See HLD §"A useful first milestone".
  - Success: the test passes in the container runner (`bun test:e2e:container`)
    without network access.

______________________________________________________________________

## 3. Vertical slice 2: debt has teeth

Idea: if differentiated tech debt categories create mechanically different
incident types — and those incidents visibly hurt brand, PMF, and cash in
ways that a careful security allocation can reduce — then the player has
real strategic choices and the simulation is not just a number-increment toy.

This slice proves that throughput can cause failures. It introduces the incident
system, the debt constellation visualizer, and consequence legibility that
make policy trade-offs meaningful.

### 3.1. Implement the tech debt tick rules and incident rolling

This step answers whether debt categories accumulate, compound, and generate
incidents according to the simulation design. See HLD §"The system
heartbeat" (steps 6 and 10) and `adr-005-use-deterministic-simulation-and-parameter-packs.md`.

- [ ] 3.1.1. Implement the eight debt-category accumulation and reduction
  rules inside `simulateTick` (tick step 6), driven by quality and security
  allocation.
  - Requires phase 2.
  - See HLD §"Core aggregates" (`TechDebtVector`) and HLD §"The system
    heartbeat".
  - Success: property tests confirm that security allocation reduces CVE debt
    and that cyclomatic complexity grows when quality allocation is near zero;
    no category goes negative.

- [ ] 3.1.2. Implement incident rolling (tick step 10): generate `GameEvent`
  values from current debt and risk state using seeded randomness.
  - Requires 3.1.1 and 1.3.3.
  - See HLD §"The system heartbeat" and HLD §"Self-play agents" (exploit
    hunter note about CVE/brand loopholes).
  - Success: incidents are reproducible from seed; incident frequency
    correlates with debt severity; replay tests confirm identical incident
    sequences.

- [ ] 3.1.3. Implement the first three incident types: XSS, CVE disclosure,
  and config drift — each with brand, PMF, and cash consequences.
  - Requires 3.1.2.
  - See HLD §"Path to customer value through vertical slices" (slice 2).
  - Success: each incident type produces a distinct consequence pattern; a
    policy with high security allocation reduces CVE incident frequency.

### 3.2. Implement the incident prompt and event machine

This step answers whether the player can respond to incidents through
`event.machine` and whether those responses produce auditable domain events.
See HLD §"Key workflows" (incident response) and
`adr-003-use-xstate-for-workflow-orchestration.md`.

- [ ] 3.2.1. Implement the incident prompt screen: cause, response options
  (disclose, mitigate, ignore, cover up, civic action), consequences, and
  uncertainty.
  - Requires 3.1.3 and 1.5.1.
  - See HLD §"Core screens" (Incident Prompt) and HLD §"Key workflows"
    (incident response).
  - The prompt must not rely on colour alone; it must be keyboard-navigable.
  - Success: `bun test:a11y` passes; `event.machine` transitions through
    `EventPrompt` → `Running` correctly; each response produces a logged
    `EventResolution` in Dexie.

- [ ] 3.2.2. Implement event-resolution consequence propagation: connect
  `EventResolution` to karma, brand, debt, PMF, and cash deltas in
  `simulateTick`.
  - Requires 3.2.1 and 3.1.3.
  - See HLD §"Key workflows" (incident response, "event affects karma, brand,
    debt, PMF, cash").
  - Success: integration tests confirm that a CVE cover-up reduces karma and
    increases CVE debt on the next tick; a civic response improves brand.

### 3.3. Deliver the debt constellation visualizer

This step answers whether the player can diagnose their risk surface through
a visual view that is readable without relying on generated imagery for
authoritative values. See HLD §"Core screens" (Debt Constellation) and
`adr-007-keep-runtime-interface-authoritative-and-deterministic.md`.

- [ ] 3.3.1. Implement the debt constellation Canvas panel showing the eight
  debt categories as nodes with edge weights proportional to their current
  values.
  - Requires 3.1.1 and 2.3.2.
  - See HLD §"Visual layer order" and
    `adr-007-keep-runtime-interface-authoritative-and-deterministic.md`.
  - All critical values must be rendered as runtime text, not baked into
    Canvas imagery.
  - Success: a textual summary of the constellation passes `bun test:a11y`;
    values update on each snapshot.

- [ ] 3.3.2. Add a "why did this happen?" trace panel to the incident prompt
  showing which debt categories contributed to the event.
  - Requires 3.3.1 and 3.2.1.
  - See HLD §"Product risks and mitigations" (opaque simulation risk).
  - Success: the trace panel cites at least one contributing debt category;
    it is keyboard-focusable.

______________________________________________________________________

## 4. Vertical slice 3: ethics alters the machine

Idea: if the ethics policy panel makes alignment, karma, and brand
mechanically coupled to automation capability — so that forbidding dark
patterns or disclosing CVEs early has a measurable effect on strategic
outcomes — then ethics is real gameplay, not decorative flavour text.

This slice proves that intent-setting produces systemic consequences. It
introduces the ethics controls, open-source allocation mechanics, alignment
drift, and the first misalignment scare.

### 4.1. Implement ethics policy controls and enforcement

This step answers whether the `EthicsPolicy` constraints can be validated and
committed through `policy.machine` and whether breaking an ethics commitment
requires explicit player action. See HLD §"Core aggregates" (`EthicsPolicy`)
and HLD §"Non-negotiable business rules" (rule 5).

- [ ] 4.1.1. Implement the ethics policy panel: dark patterns toggle, fossil
  energy cap slider, CVE disclosure window, training piracy toggle, labour
  policy selector, and political influence selector.
  - Requires phase 2 and 1.5.1.
  - See HLD §"Core aggregates" (`EthicsPolicy`).
  - Success: all controls are keyboard-navigable; `bun test:a11y` passes;
    `policy.machine` accepts only validated ethics objects.

- [ ] 4.1.2. Enforce ethics commitments in `simulateTick`: dark-pattern
  forbiddance reduces certain income strategies; fossil cap throttles power
  above the threshold; CVE disclosure window forces incident resolution
  timing.
  - Requires 4.1.1 and 3.1.3.
  - See HLD §"Non-negotiable business rules" (rule 5).
  - Success: property tests confirm that a `fossilEnergyCapPercent` of 0
    prevents fossil power income at any tick; violating CVE policy increases
    karma loss.

### 4.2. Implement open-source allocation and karma/brand dynamics

This step answers whether the open-source allocation percentage produces a
visible karma and brand curve and whether an OSS viral moment event is
reachable. See HLD §"Path to customer value through vertical slices" (slice
3).

- [ ] 4.2.1. Implement tick-step 8 OSS output: open-source allocation
  generates community contribution events, karma ticks, and brand ticks
  proportional to allocation.
  - Requires 4.1.2 and 3.1.1.
  - See HLD §"The system heartbeat" (step 8).
  - Success: a run with 30% OSS allocation accumulates brand faster than one
    with 0% OSS; karma grows proportionally.

- [ ] 4.2.2. Implement the OSS viral moment event: when brand and OSS output
  cross a threshold, fire a high-impact `GameEvent` with consequence options.
  - Requires 4.2.1 and 3.1.2.
  - See HLD §"Path to customer value through vertical slices" (slice 3).
  - Success: the event fires at least once in a run with sustained 20%+ OSS
    allocation; its consequences include a brand spike and an optional
    community liability.

### 4.3. Implement alignment drift and the first misalignment scare

This step answers whether alignment state produces a legible pressure signal
and whether a misalignment scare event changes available strategies. See HLD
§"Domain model" (`AlignmentState`) and HLD §"Path to customer value" (slice
3).

- [ ] 4.3.1. Implement alignment drift in `simulateTick`: dark-pattern use,
  automation growth, and training piracy push alignment away from human-
  centred; civic action, OSS contribution, and CVE disclosure pull it back.
  - Requires 4.1.2 and 4.2.1.
  - See HLD §"Domain model" and HLD §"The system heartbeat" (step 3 alignment
    multiplier).
  - Success: property tests confirm that forbidding dark patterns slows
    negative drift; alignment affects the LoC multiplier in step 3.

- [ ] 4.3.2. Implement the misalignment scare event: when alignment crosses a
  warning threshold, fire a `RiskSurface.Warning` domain event and surface
  an incident prompt with autonomy-risk consequences.
  - Requires 4.3.1 and 3.2.1.
  - See HLD §"XState state graph" (`RiskSurface` states) and HLD §"Path to
    customer value" (slice 3).
  - Success: `run.machine` transitions to `RiskSurface.Warning`; a
    keyboard-navigable prompt appears with at least three response options.

______________________________________________________________________

## 5. Vertical slice 4: autopilot becomes gameplay

Idea: if unlock-gated automation agents produce both a productivity gain and
a legible risk of misinterpretation — so that policy adjustments become more
consequential, not less, as agents arrive — then the intent-steering fantasy
is real and the idle loop remains interactive through every stage.

This slice delivers the progression tree, the first four stages of
civilization, autopilot modes, and the first self-play balancing pass over
the game so far.

### 5.1. Implement the progression system and first four stages

This step answers whether the unlock gate mechanism can be implemented as a
pure domain service and whether `progression.machine` can orchestrate the
review and accept/defer flow. See HLD §"Core requirements" (stage 1–4
progression) and `adr-003-use-xstate-for-workflow-orchestration.md`.

- [ ] 5.1.1. Implement stage threshold evaluation (tick step 12): check
  unlock conditions for manual coder, autocomplete, edit bot, and single-
  agent stages; emit `ProgressionGateReached` domain events.
  - Requires phase 4.
  - See HLD §"Implementation priorities" (high priority, stage 1–4) and HLD
    §"The system heartbeat" (step 12).
  - Success: a deterministic replay triggers each of the first four gates at
    the expected tick range for the default parameter pack.

- [ ] 5.1.2. Implement the progression unlock review screen and
  `progression.machine` transitions for accept, defer, and risk acknowledgement.
  - Requires 5.1.1 and 1.5.1.
  - See HLD §"Core screens" (Progression Tree) and HLD §"Key workflows"
    (progression unlock).
  - Success: `progression.machine` never reaches an accepted stage without
    explicit player action; deferred gates remain available; `bun test:a11y`
    passes.

- [ ] 5.1.3. Implement the stage effect on `simulateTick`: each stage
  multiplies LoC throughput, unlocks new allocation categories, and introduces
  new risk surfaces.
  - Requires 5.1.2.
  - See HLD §"Simulation design" and HLD §"Implementation priorities".
  - Success: a stage-2 run produces measurably higher LoC per tick than a
    stage-1 run on the same allocation; new risk surfaces appear in the
    `RiskSurface` machine.

### 5.2. Implement autopilot modes

This step answers whether the static and adaptive autopilot modes change
strategic depth rather than replacing it. See HLD §"XState state graph"
(`Autopilot` states) and HLD §"Path to customer value" (slice 4).

- [ ] 5.2.1. Implement the `Autopilot.Static` mode: after each tick batch,
  apply a fixed policy rebalance rule chosen by the player (e.g. "maintain
  security above X%").
  - Requires 5.1.3 and 1.5.1.
  - See HLD §"XState state graph" (`Autopilot` states).
  - Success: `run.machine` shows the autopilot state; the player can disable
    it at any time; policy changes remain auditable in Dexie.

- [ ] 5.2.2. Implement the `Autopilot.Adaptive` mode: the autopilot makes
  small allocation adjustments toward a stated goal, emitting
  `AutopilotSuggestion` domain events that the player can inspect.
  - Requires 5.2.1.
  - See HLD §"Path to customer value" (slice 4, "policy recommendations").
  - Success: adaptive suggestions are legible; a player who ignores them does
    not suffer a penalty; suggestions are not compulsory.

- [ ] 5.2.3. Implement agent misinterpretation warnings: when an autopilot or
  agent action diverges significantly from the player's stated intent,
  surface a `MisinterpretationWarning` incident prompt.
  - Requires 5.2.2 and 3.2.1.
  - See HLD §"Path to customer value" (slice 4, "agent misinterpretation
    warnings").
  - Success: warnings appear when adaptive policy diverges more than a
    configured threshold from the last player-set policy.

### 5.3. First self-play balancing pass

This step answers whether the first four vertical slices produce a
mechanically balanced game where multiple strategies are viable and no
trivial dominant policy exists. See HLD §"Self-play agents" and
`adr-006-use-adversarial-self-play-for-parameter-tuning.md`.

- [ ] 5.3.1. Implement the baseline self-play runner: a headless harness that
  runs agent archetypes against the domain core over many seeds and parameter
  packs.
  - Requires steps 2.1–2.2 and 1.3.2.
  - See `adr-006-use-adversarial-self-play-for-parameter-tuning.md` §Migration
    plan and HLD §"Self-play agents".
  - The runner must work without mounting React.
  - Success: the runner produces a JSON report covering pacing, exploitability,
    strategic diversity, and recovery; it completes within a reasonable time on
    the development machine.

- [ ] 5.3.2. Implement the eight agent archetypes: growth goblin, debt janitor,
  ethical steward, backroom baron, open-source saint, heat-death gremlin,
  exploit hunter, and casual player model.
  - Requires 5.3.1.
  - See HLD §"Self-play agents".
  - Success: each agent produces a distinct strategy signature in reports; the
    exploit hunter finds and reports at least one loophole in the default pack.

- [ ] 5.3.3. Run a parameter sweep over three candidate packs, score with the
  fun score, and promote one pack as the new default after human review.
  - Requires 5.3.2.
  - See HLD §"Optimisation process" and
    `adr-006-use-adversarial-self-play-for-parameter-tuning.md`.
  - Success: the promoted pack has no lock-on-victory strategy according to
    the exploit hunter; the balancing report is committed to the repository.

______________________________________________________________________

## 6. Vertical slice 5: power replaces money

Idea: if the mid-to-late game's power and heat constraints create a new
strategic regime — where the question shifts from "how to grow revenue?" to "how
to allocate watts?" — then the game has a genuine second act and players have a
reason to reach it.

This slice delivers the data centre unlock, power generation mix, fossil
penalty, heat warning, and the power/heat visualizer.

### 6.1. Implement power simulation and the energy economy

This step answers whether power availability becomes the binding constraint at
higher stages and whether the ethics fossil cap creates a real trade-off. See
HLD §"The system heartbeat" (step 2) and HLD §"Path to customer value"
(slice 5).

- [ ] 6.1.1. Implement power-availability calculation (tick step 2) and power
  throttling: when power is insufficient, LoC throughput decreases
  proportionally.
  - Requires phase 5.
  - See HLD §"The system heartbeat" and HLD §"Core aggregates" (`Resources`,
    `powerWatts`).
  - Success: a run with zero power infrastructure reaches a throughput ceiling
    that unblocks only when `powerInfra` allocation increases.

- [ ] 6.1.2. Implement the power generation mix: renewable and fossil sources,
  with fossil energy capped by the ethics policy and a karma/brand penalty for
  exceeding it.
  - Requires 6.1.1 and 4.1.2.
  - See HLD §"Path to customer value" (slice 5) and HLD §"Non-negotiable
    business rules" (rule 1: the fossil penalty).
  - Success: a run exceeding the fossil cap incurs a brand penalty; a run
    building renewable infrastructure grows power without the penalty.

- [ ] 6.1.3. Implement the heat warning: when total power draw exceeds the
  heat budget, emit a `PowerShortage` domain event and an audio event.
  - Requires 6.1.2 and phase 7 audio stub (or a silent stub).
  - See HLD §"Path to customer value" (slice 5, "heat warning").
  - Success: the `RiskSurface` machine transitions to `Warning` on the heat
    threshold; the player receives an explanatory incident prompt.

### 6.2. Deliver the power and heat visualizer

This step answers whether the power economy is legible through a Canvas
visualizer that provides textual summaries for accessibility. See HLD
§"Core screens" (Power & Heat) and
`adr-007-keep-runtime-interface-authoritative-and-deterministic.md`.

- [ ] 6.2.1. Implement the power and heat Canvas panel: power draw bar,
  generation mix breakdown, and heat budget indicator.
  - Requires 6.1.3 and 2.3.2.
  - See HLD §"Core screens" (Power & Heat).
  - Runtime text must show all numeric values; Canvas provides the spatial
    overview.
  - Success: a textual alternative for the panel passes `bun test:a11y`;
    values update on each snapshot.

______________________________________________________________________

## 7. Vertical slice 6: endings are earned

Idea: if multiple distinct endings are reachable from comprehensible state
transitions — and each one feels like the logical consequence of a coherent
run strategy rather than an arbitrary threshold — then the game has
replayability and narrative consequence, and players will want a second run.

This slice delivers the four endings, the ending resolution flow, the run
archive, and the basic audio event bus.

### 7.1. Implement ending evaluation and the four ending states

This step answers whether each ending can be reached from a plausible
strategy and whether the ending trigger is legible from prior simulation
state. See HLD §"Path to customer value" (slice 6) and HLD §"The system
heartbeat" (step 12).

- [ ] 7.1.1. Implement ending evaluation in `simulateTick` (tick step 12):
  check thresholds for Degrowth Utopia, Happy OSS Vibe Coder on UBI, Skynet
  Failure, and Waste Heat Meltdown.
  - Requires phase 6.
  - See HLD §"Path to customer value" (slice 6).
  - Success: each ending is reachable from a deterministic seed + policy
    sequence; replays confirm trigger consistency.

- [ ] 7.1.2. Implement the ending resolution screen and `app.machine`
  transition to `Archive`: display ending card, score, and replay summary.
  - Requires 7.1.1 and 1.5.1.
  - See HLD §"Core screens" (Archive / Endings) and HLD §"Key workflows"
    (end-state resolution).
  - Success: each of the four endings has a distinct screen; the player can
    start a new run or view the archive from this screen.

- [ ] 7.1.3. Implement the run archive: list past runs with ending kind,
  score, stage reached, and key policy choices.
  - Requires 7.1.2 and 1.4.2.
  - See HLD §"Core screens" (Archive / Endings).
  - Success: runs survive browser restarts; the archive is sorted by
    `createdAt`; `bun test:a11y` passes.

### 7.2. Implement the audio event bus and first music layers

This step answers whether the simulation can express its state through
semantic audio events without coupling the domain to Web Audio. See
`adr-009-use-semantic-audio-events-for-reactive-sound.md` and HLD §"Reactive
music and sound design".

- [ ] 7.2.1. Implement the `AudioEventSink` Web Audio adapter with buses for
  music, SFX, and UI; implement rate-limited scheduling for high-frequency
  events (commits, debt ticks).
  - Requires 1.2.2 and phase 2.
  - See `adr-009-use-semantic-audio-events-for-reactive-sound.md` §Migration
    plan.
  - Audio must be disabled in tests through the silent stub adapter.
  - Success: disabling the audio bus produces no simulation-state change;
    `bun test` passes with the silent adapter.

- [ ] 7.2.2. Implement the first two music layers: human/cosy layer and
  startup pulse, driven by stage and karma semantic events.
  - Requires 7.2.1.
  - See HLD §"Music system".
  - Success: the cosy layer plays during stage 1; the startup pulse increases
    with shipping throughput; the player can mute each bus independently.

- [ ] 7.2.3. Map the first domain events to sound effects: commit blips,
  debt accumulation texture, policy commit sound, stage unlock motif, and
  catastrophe sting.
  - Requires 7.2.2 and 3.1.3.
  - See HLD §"SFX design".
  - Success: each SFX fires at the correct simulation event; no SFX triggers
    more than once per tick batch.

### 7.3. Complete the self-play TLA+ formal model

This step answers whether the parameter-pack promotion pipeline is formally
safe against worker failures, stale evidence, and exploit laundering. It
should be completed once the self-play runner from step 5.3 is stable. See
`adr-011-use-tla-plus-for-self-play-promotion-safety.md`.

- [ ] 7.3.1. Create `formal/tla/self-play-promotion/` with the initial TLA+
  specification, TLC checker configuration, and README.
  - Requires 5.3.2.
  - See `adr-011-use-tla-plus-for-self-play-promotion-safety.md` §Migration
    plan.
  - Success: `tlc` checks the model on a small bounded configuration; no
    safety invariant is violated on the initial model.

- [ ] 7.3.2. Implement the TypeScript `canPromote` guard mirroring the TLA+
  `CanPromote` predicate, with the `TrialEvidence` record shape.
  - Requires 7.3.1 and 5.3.1.
  - See `adr-011-use-tla-plus-for-self-play-promotion-safety.md` §Implementation
    impact.
  - Success: `canPromote` rejects trial evidence that would fail the seven
    formal invariants; negative fixtures cover each rejection case.

- [ ] 7.3.3. Add bad-worker transitions for duplicate, stale, timed-out,
  nondeterministic, and wrong-hash results; confirm all seven safety invariants
  still hold.
  - Requires 7.3.2.
  - See `adr-011-use-tla-plus-for-self-play-promotion-safety.md` §Required
    invariants.
  - Success: `tlc` finds no counterexample under all bad-worker interleavings
    for the bounded model; liveness holds under explicit fairness assumptions.

### 7.4. Add the PWA service worker and installability

This step answers whether the game can be installed to a device home screen
and booted fully offline without a development server. See
`adr-001-build-an-offline-first-react-pwa.md` §Migration plan.

- [ ] 7.4.1. Wire the Vite PWA plugin (or custom service worker) to
  pre-cache the app shell and all static assets.
  - Requires phase 7 feature work to be stable.
  - See `adr-001-build-an-offline-first-react-pwa.md`.
  - Success: `lighthouse --preset pwa` gives a passing PWA score; the game
    boots after the service worker is installed and the network is disabled.

______________________________________________________________________

## 8. Deferred extensions after the core v1 promise

Idea: if the core v1 promise is already trustworthy and boring to operate,
the project can evaluate broader extensions on their product value instead of
letting them destabilize the main release.

These items are mentioned in the HLD and ADRs but explicitly deferred from
the core release. They are grouped here to keep the v1 boundary disciplined.

### 8.1. Space compute and Dyson swarm stages

- [ ] 8.1.1. Implement stages 5–10: agent swarm, data centre, orbital compute,
  and Matrioshka endgame simulation.
  - Requires phase 7 completion.
  - See HLD §"Implementation priorities" (medium and lower priority).
  - Success: each stage is reachable from the stage-4 run in a deterministic
    replay; new risk surfaces appear for each regime.

### 8.2. Full canvas city-aquarium visualizer

- [ ] 8.2.1. Implement the animated city-aquarium Canvas world: environment
  layers (bedsit, café, warehouse, robot office, data centre, orbital compute)
  driven by stage and simulation signals.
  - Requires phase 7 completion.
  - See HLD §"Rendering and interface" and HLD §"Visual layer order".
  - Success: the world animates at 60 FPS on mid-range hardware; reduced motion
    mode disables animations without hiding state information.

### 8.3. Asset promotion pipeline

The asset workflow follows the conventions documented in
`docs/vibe-coder-high-level-design.md` §"Creative workflow for art and image
generation" and mirrors the Agentland asset specification and image-generation
workflow. Assets belong to one of three buckets: `direct-generated-reference`
(reference only, never loaded at runtime), `generated-source-converted`
(processed and validated before runtime use), and `algorithmic` (scripts,
code, or manifests). See `adr-008-use-development-time-image-generation-with-asset-promotion.md`.

- [ ] 8.3.1. Create the `prompts/` and `assets/` directory structure as
  described in HLD §"Required art pipeline".
  - Directories: `prompts/generated/{style-book,characters,environments,endings,props,ui-ornaments}`,
    `assets/{source/gpt-images-2,processed,atlases,manifests,palette,validation,requests}`.
  - Create directories only when a change first needs them.
  - Success: the structure matches HLD §"Required art pipeline"; no
    unmanifested image files exist in `assets/source/`.

- [ ] 8.3.2. Define the Vibe Coder asset manifest schema by adapting the
  Agentland asset specification. Each manifest must record: asset ID, family,
  bucket, intent class, tool, prompt path, source path, processed path, atlas
  metadata, validation report path, and runtime text policy.
  - See `adr-008-use-development-time-image-generation-with-asset-promotion.md`
    §Decision outcome and HLD §"Required art pipeline".
  - Allowed `intent_class` values: `reference-only`, `sliceable-source`,
    `ornament-source`, `runtime-processed`, `lightmask-source`,
    `layout-reference`.
  - Allowed `status` values: `approved-source`, `approved-runtime`,
    `reference-only`, `rejected`, `superseded`.
  - Success: `tools/check_manifests.py` validates manifests against the schema;
    any asset lacking `runtime_text_safe: true` is blocked from
    `approved-runtime` status.

- [ ] 8.3.3. Implement post-processing scripts for chroma-key removal,
  palette quantization, sprite slicing, nine-slice extraction, atlas packing,
  and light-mask generation.
  - See HLD §"Required art pipeline" and
    `adr-008-use-development-time-image-generation-with-asset-promotion.md`
    §Migration plan.
  - Scripts must be deterministic, emit clear failures, and record settings in
    the source manifest after each accepted step.
  - Success: a round-trip from raw generated PNG to atlas entry completes
    without manual steps; the manifest records every processing command.

- [ ] 8.3.4. Implement the `ManifestAssetLoader` adapter against the
  `AssetCatalogue` port; the loader must refuse assets without
  `approved-runtime` status.
  - Requires 8.3.2 and 8.3.3, and phase 2 (runtime `AssetCatalogue` port).
  - See HLD §"Module layout" (`adapters/assets/`).
  - Success: a generated sprite passes the manifest validation gate and loads
    through the `AssetCatalogue` port; an asset with `approved-source` status
    is rejected at load time.

### 8.4. Extended reactive music

- [ ] 8.4.1. Implement the remaining music layers: debt dissonance, OSS choir,
  alignment shadow, power grid, and cosmic heat.
  - Requires 7.2.2.
  - See HLD §"Music system".
  - Success: each layer activates at the correct simulation threshold; no two
    layers clash in the same frequency band at maximum intensity.

### 8.5. Mod and content pack tooling

- [ ] 8.5.1. Define the content pack schema and a tooling path for community
  parameter and event packs.
  - Requires 1.3.2 and 1.4.1.
  - See HLD §"Implementation priorities" (lower priority, mod/content pack
    tooling).
  - Success: a community pack can be imported through JSON import/export
    without altering core domain invariants; Valibot rejects invalid packs.

### 8.6. Cloud sync

- [ ] 8.6.1. Design and implement cloud sync as an optional outbound adapter
  over the `GameStateRepository` port.
  - Requires phase 7 and a backend service decision.
  - See `adr-001-build-an-offline-first-react-pwa.md` §Non-goals and HLD
    §"Implementation priorities".
  - Success: enabling sync does not alter domain equations; disabling sync
    returns the game to fully offline operation.

### 8.7. Social features

- [ ] 8.7.1. Evaluate leaderboards and social sharing; implement only if they
  do not introduce click pressure or dark-pattern incentives.
  - Requires phase 7 and cloud sync.
  - See HLD §"Implementation priorities" (lower priority) and HLD §"Non-
    negotiable business rules" (rule 2).
  - Success: any leaderboard implementation passes an audit against all ten
    non-negotiable business rules.

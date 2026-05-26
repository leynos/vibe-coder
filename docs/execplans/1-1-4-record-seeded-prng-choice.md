# Record seeded PRNG choice and parameter-pack migration policy

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: APPROVED — IMPLEMENTATION IN PROGRESS

## Purpose / big picture

Roadmap item 1.1.4 closes the two remaining choices that hold up the
deterministic simulation contract: the seeded pseudo-random number generator
(PRNG) and the version migration policy for runs created under older parameter
packs. After this change a developer can open
`docs/adr-005-use-deterministic-simulation-and-parameter-packs.md` and see
which PRNG the engine uses, how seeds expand into PRNG state, which fields
identify a saved run's PRNG and parameter pack, what kinds of pack version
bumps are allowed, and what happens when a saved run meets a different
parameter pack on load.

This is a decision-record change in the same shape as roadmap items 1.1.1 and
1.1.2. It does not implement a `RandomSource` port, a `ParameterPack` type, a
Dexie store, a self-play harness, or any migration code. Those arrive in later
roadmap items, principally 1.3.2 (`ParameterPack` type), 1.3.3 (seeded
`RandomSource` adapter), 1.4.x (Dexie schema and migrations), and 2.4.3 (JSON
import and export). The plan therefore must not add dependencies, must not
change runtime behaviour, and must not edit code under `src/` or `tests/`.

The observable success conditions are:

1. `docs/adr-005-use-deterministic-simulation-and-parameter-packs.md` names
   the accepted PRNG, names the accepted seeding strategy, declares the save
   identity fields for that PRNG, and removes the PRNG bullet from
   "Outstanding decisions".
2. The same ADR records the parameter-pack version migration policy in enough
   detail that later implementation tasks can build to it without re-deciding
   it, and removes the migration-policy bullet from "Outstanding decisions".
3. The fixed-point arithmetic question remains in "Outstanding decisions"
   because it is not part of this roadmap item.
4. `docs/developers-guide.md` summarises the accepted PRNG name and the
   summary form of the migration policy with a link back to ADR 005 for
   rationale.
5. `docs/roadmap.md` marks only item 1.1.4 as done.
6. All required gates pass: `make check-fmt`, `make lint`, `make test`, and
   `bun ff`.

Do not begin implementation until the user has explicitly approved this plan.

## Constraints

- Do not begin implementation until this ExecPlan is explicitly approved.
- Keep the implementation scoped to roadmap item 1.1.4. Do not start work on
  1.1.5, 1.2.x, 1.3.x, 1.4.x, or any later vertical slice.
- Use the `hexagonal-architecture` skill to protect boundaries. Dependencies
  point inward; domain policy and the chosen PRNG algorithm must remain free of
  React, Dexie, Web Audio, Canvas, worker, and browser-platform imports. The
  PRNG belongs to the domain layer as a pure, seedable function; the
  `RandomSource` port belongs to `domain/ports/`; the concrete seeded adapter
  belongs to `adapters/` (those modules are implemented later in 1.2.2, 1.2.3,
  and 1.3.3).
- Ratify the PRNG in one accepted document. The planned choice is sfc32
  (Chris Doty-Humphrey, "Small Fast Counting v4") in the bryc-2022 JavaScript
  port. The planned runner-up is xoshiro128++ (Blackman and Vigna), recorded
  as the documented fallback if sfc32 ever has to be replaced. If
  implementation-day evidence shows a stronger reason to choose another
  algorithm, stop and ask for approval before changing direction.
- Ratify the parameter-pack migration policy in the same accepted document.
  The planned policy is "pin pack triple, refuse silent advancement, allow
  explicit upgrade only through registered transforms" as detailed below.
- Do not change ADR 005's "fixed-point arithmetic" outstanding-decision bullet.
  That is a separate decision and not in this roadmap item.
- Do not add dependencies. The PRNG and the migration policy are documentation
  in this task; implementation arrives later. If adding a dependency seems
  required, stop and ask for approval.
- Do not edit code under `src/`, `tests/`, `scripts/`, `tools/`, or
  `tokens/`. The decision record is the deliverable. If implementation
  requires source changes, stop and ask for approval.
- Maintain the existing scope of `scripts/import-boundaries.ts`. Do not add
  new banned packages or new layer rules in this task. The recorded
  expectation is that 1.2.2 will introduce the `RandomSource` port and 1.3.3
  will introduce the seeded adapter; the boundary linter will be tightened
  then, not now.
- Update `docs/developers-guide.md` because the accepted PRNG name and
  migration-policy shape are developer-facing architecture practice. Keep the
  update short; link back to ADR 005 for rationale rather than duplicating it.
- Update `docs/users-guide.md` only if the implementation changes
  player-visible behaviour. This task should not change player-visible
  behaviour. User-visible save-migration prompts arrive later (with 2.4.x and
  beyond) and will introduce their own documentation update.
- Update `docs/contents.md` only if a new top-level document or section is
  added by this task. The expected change set does not need a new index entry.
- Mark only roadmap item 1.1.4 as done, and only after ADR 005 records the
  accepted PRNG choice and the accepted migration policy.
- Keep documentation in en-GB Oxford spelling and grammar (-ize / -yse /
  -our), per `AGENTS.md`.
- Wrap Markdown paragraphs and bullets at 80 columns; wrap code blocks at 120
  columns; do not wrap tables or headings; use `-` bullets; use
  GitHub-flavoured footnotes when needed.
- Keep every code file at or below 400 lines. This document is markdown, not
  code, and is exempt from that limit; prior ExecPlans in this repository
  exceed 400 lines.
- Do not run formatting, linting, type checking, tests, semantic checks, or
  frontend gates in parallel. The build cache prefers sequential execution.
- `make check-fmt`, `make lint`, `make test`, and `bun ff` must pass before
  the implementation is committed. This is non-negotiable.
- Use Playwright and css-view validation where tooling and a served app are
  available. Do not claim visual, semantic-class, or accessibility validation
  passed without evidence. This decision-record change is expected to be
  non-visual; if no UI changes, record the absence of a visible delta as
  evidence rather than skipping validation silently.
- Use `coderabbit review --agent` after each major milestone (this plan
  commit, the ADR amendment commit, the developer-guide update commit, and
  the roadmap mark-done commit). Clear all findings before moving on.
- Use the `commit-message` skill workflow; pass commit bodies via files, not
  `-m` strings. Use the `pr-creation` skill and `en-gb-oxendict` for the draft
  pull request.

## Tolerances (exception triggers)

- Scope: if implementation requires changes outside
  `docs/adr-005-use-deterministic-simulation-and-parameter-packs.md`,
  `docs/roadmap.md`, `docs/developers-guide.md`, `docs/users-guide.md`,
  `docs/contents.md`, or this ExecPlan, stop and ask for approval.
- Size: if the documentation patch exceeds 400 net lines across all touched
  files, stop and split the work into a PRNG-decision commit and a
  migration-policy commit before opening the pull request.
- Interface: if any TypeScript public API, package script, route, component
  prop, locale contract, Dexie schema, or developer-tool command must change
  during 1.1.4, stop and ask for approval. None of those should be necessary
  for a decision record.
- Dependencies: if `fast-check`, `pure-rand`, `xoshiro`, `sfc`, `seedrandom`,
  `random-js`, `chance`, or any other PRNG- or hashing-related package needs
  to be added, stop and ask for approval. Item 1.1.4 plans neither
  installation nor import.
- Ambiguity in PRNG choice: if implementation-day evidence (security
  advisory, new statistical-quality finding, license change, new ES proposal
  promoted to Stage 4) makes sfc32 unsuitable, stop, present the evidence in
  the `Decision Log`, and ask for approval before adopting the runner-up or a
  third candidate.
- Ambiguity in migration policy: if a stakeholder requires automatic silent
  upgrades on MINOR pack bumps, stop and present the trade-offs. The default
  policy is explicit per-bump upgrade prompts.
- Boundary drift: if recording the PRNG would require importing browser APIs
  (`crypto.getRandomValues`, `crypto.randomUUID`, `Date.now`) into domain or
  application code, stop and redesign. The chosen PRNG must be a pure
  function of its state.
- Validation: if the same required gate fails twice after changes intended to
  fix this item, stop, record the evidence in `Surprises & Discoveries`, and
  ask for direction.
- Browser validation: if Playwright, css-view, or the served app cannot be
  used, record the unavailable tool in `Surprises & Discoveries` and run the
  closest automated replacement (the repository e2e stage inside `bun ff`).
  Do not mark visual validation as passed without evidence.
- Roadmap drift: if marking 1.1.4 as done seems to require also marking
  1.1.5, 1.2.x, 1.3.x, or any later item as done, stop. Only 1.1.4 may move
  in this task.

## Risks

- Risk: ADR 005 has three outstanding-decision bullets, but only two are in
  this roadmap item.
  Severity: medium.
  Likelihood: high.
  Mitigation: Treat the fixed-point arithmetic bullet as explicitly out of
  scope. Leave it untouched in ADR 005 and note in the `Decision Log` that
  1.1.4 settles two of the three outstanding bullets.

- Risk: A purely documentation amendment could understate the PRNG choice
  enough that 1.3.3 has to re-decide which algorithm and which port to use.
  Severity: high.
  Likelihood: medium.
  Mitigation: Record enough detail in ADR 005 to constrain 1.3.3 without
  pre-empting it. The amendment must name the algorithm, the reference port,
  the state shape, the seeding strategy, the substream-derivation pattern,
  and the save-identity fields. It must not include executable TypeScript
  beyond minimal type sketches.

- Risk: The recommended sfc32 algorithm has no jump-ahead polynomial, so
  later "independent streams per feature" code must rely on seed derivation.
  Future implementers may assume a jump function exists.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Record the substream-derivation pattern in ADR 005 and note
  that sfc32 has no jump-ahead by design. Record xoshiro128++ as the
  fallback with documented jump and long-jump polynomials, so if a future
  requirement needs jumps, the migration target is named and pre-considered.

- Risk: Recording the migration policy without ratifying a hash function
  could leave a gap where the "pack content hash" cannot be computed
  deterministically.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Specify "a deterministic content hash over the canonical
  JSON-sorted pack body" without binding the hash algorithm. Recommend
  BLAKE3 or SHA-256 in the ADR amendment as the implementation default;
  defer the exact choice to 1.3.2 or 1.4.1 when the implementation lands.

- Risk: Tying the PRNG identity to parameter-pack identity could be
  misinterpreted as making PRNG changes silent across packs.
  Severity: medium.
  Likelihood: medium.
  Mitigation: State explicitly that the PRNG name and version are separate
  save fields (`prngName`, `prngVersion`) and that any PRNG change forces a
  parameter-pack MAJOR bump. Refusing to load is preferred over silent
  re-binding.

- Risk: Players, designers, and self-play promote new packs at different
  cadences. A migration policy that allows silent auto-upgrade for MINOR
  bumps could let promoted packs invalidate ADR 011 promotion safety
  evidence.
  Severity: high.
  Likelihood: medium.
  Mitigation: Forbid silent advancement on any bump that changes the
  numeric subset of the pack. PATCH may silently rebind only when the
  canonicalised numeric subset is byte-identical (so the hash changed only
  because a comment or label changed). MINOR requires an explicit upgrade
  prompt. MAJOR quarantines the run.

- Risk: The requested frontend reference documents
  (`docs/v2a-front-end-stack.md`, `docs/tailwind-v4-guide.md`,
  `docs/daisyui-v5-guide.md`, et cetera) are not present in this worktree.
  Severity: low.
  Likelihood: high.
  Mitigation: Record their absence and rely on the available repository
  sources: `AGENTS.md`, ADRs, the HLD, the developer's guide, and the prior
  ExecPlans 1.1.1, 1.1.2, and 1.1.3.

- Risk: Full `bun ff` may expose pre-existing failures unrelated to this
  decision record, especially in the e2e stage if no dev server is running.
  Severity: medium.
  Likelihood: high.
  Mitigation: Run gates sequentially with `/tmp` logs, start a temporary
  validation dev server only when the e2e stage requires it, and stop the
  server after `bun ff` completes. Do not hide or work around unrelated
  failures; record them in `Surprises & Discoveries`.

- Risk: The branch in use is `feat/record-seeded-prng-choice`, while prior
  ExecPlans used the `1-1-N-...` naming pattern. Rename churn after a PR is
  open is awkward.
  Severity: low.
  Likelihood: medium.
  Mitigation: Rename the branch to `1-1-4-record-seeded-prng-choice`
  locally before the first push, so no GitHub PR rename flow is required.
  Do not rename a branch that already has an open PR; if a PR already
  exists, use GitHub's branch rename flow instead.

## Repository context

Roadmap item 1.1.4 lives in `docs/roadmap.md` under "1. Foundational
contracts and build spine", step 1.1, "Ratify outstanding decisions recorded
in the ADRs". Its current text is:

```plaintext
- [ ] 1.1.4. Record the seeded pseudo-random number generator choice and the
  version migration policy for runs created under older parameter packs.
  - See `adr-005-use-deterministic-simulation-and-parameter-packs.md`
    §Outstanding decisions.
  - Success: one accepted document names the PRNG (e.g. Mulberry32 or
    Xoshiro128+); the migration policy is documented.
```

ADR 005 is
`docs/adr-005-use-deterministic-simulation-and-parameter-packs.md`. It
records the deterministic simulation contract and the parameter-pack
strategy. Its "Outstanding decisions" section currently reads:

```plaintext
- Choose the seeded pseudo-random number generator.
- Decide when fixed-point arithmetic becomes necessary.
- Define the version migration policy for runs created under older packs.
```

Item 1.1.4 closes the first and third bullets. The middle bullet, fixed-point
arithmetic, is left untouched.

ADR 004
(`docs/adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md`) already
records the run/snapshot/event-log persistence direction and includes a
`parameterPacks` table in its illustrative Dexie schema. ADR 004 also lists
"Define whether imported saves can include custom parameter packs" and
"Define the first import/export save format and compatibility policy" as
outstanding decisions. Item 1.1.4 should not silently decide ADR 004's open
questions, but it can and should constrain them by recording the
parameter-pack identity that imports and exports must carry.

ADR 002
(`docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`)
records `src/domain/`, `src/application/`, and `src/adapters/` as the
accepted source boundaries. ADR 002 anticipates a `RandomSource` driven port
but does not implement one.

ADR 003 (`docs/adr-003-use-xstate-for-workflow-orchestration.md`) is
Accepted for item 1.1.3 and places workflow machines under
`src/application/machines/`. The first machine, `app.machine.ts`, is the
only file in that directory and is unrelated to PRNG choice.

ADR 011 (`docs/adr-011-use-tla-plus-for-self-play-promotion-safety.md`)
records the formal model for default-parameter-pack promotion safety. The
migration policy chosen here must remain compatible with that model:
specifically, every promoted pack must be content-addressable so that ADR
011's `canPromote` predicate can reject trial evidence that pinned a
different pack hash.

The high-level design `docs/vibe-coder-high-level-design.md` includes:

- §"Domain model" — `RunState` carries a `seed: Seed` field.
- §"Simulation tick contract" — `SimTickInput` carries `rng:
  RandomSourceSnapshot` and `parameterPack: ParameterPack`.
- §"Parameter packs" — `ParameterPack` is `{ id; version; ... }`.
- §"Save strategy" — snapshots include parameter-pack hash.
- §"Non-negotiable business rules", rule 7 — "Saves must include schema
  version, parameter pack version, seed, and enough event history for
  debugging."
- §"Security and privacy" — "Dexie migrations must preserve or explicitly
  archive old saves."
- §"Product risks and mitigations" — "Dexie migration pain: Saves can break
  trust. Mitigation: schema tests, backup before migration, import/export."

The domain skeleton at `src/domain/`, `src/application/`, and `src/adapters/`
currently contains only empty barrels and one machine. No `RandomSource`
port, `Seed` type, `ParameterPack` type, hashing utility, or migration code
exists yet. No call site of `Math.random`, `crypto.getRandomValues`,
`crypto.randomUUID`, or `Date.now` appears anywhere under `src/`.

The boundary linter `scripts/import-boundaries.ts` already forbids `react`,
`react-dom`, and `dexie` imports from domain and application. It does not
yet forbid browser APIs such as `crypto`. Item 1.1.4 does not add new
boundary rules; later roadmap items (specifically 1.2.2 and 1.3.3) will
tighten the linter when the `RandomSource` port and its adapter land.

The package manifest `package.json` lists `xstate@^5.31.1`, `valibot`,
React, daisyUI, Tailwind, TanStack Router, Radix UI, i18next, Fluent, and
Vite/Bun toolchain dependencies. No PRNG-related package is present. The
`test:all` script runs `bun lint`, `bun check:types`, `bun test`, `bun
test:a11y`, `bun lint:ftl-vars`, `bun semantic`, and `bun test:e2e`; `bun
ff` extends that with a Tailwind precompile pass.

Relevant skills for implementation:

- `execplans`, for maintaining this living plan.
- `hexagonal-architecture`, for keeping the PRNG and parameter pack out of
  framework code.
- `leta`, for source navigation if code inspection becomes necessary.
- `commit-message`, for the file-based commit message workflow.
- `pr-creation`, with `en-gb-oxendict`, for the draft pull request.

Relevant local documents:

- `AGENTS.md`
- `docs/roadmap.md`
- `docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
- `docs/adr-003-use-xstate-for-workflow-orchestration.md`
- `docs/adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md`
- `docs/adr-005-use-deterministic-simulation-and-parameter-packs.md`
- `docs/adr-006-use-adversarial-self-play-for-parameter-tuning.md`
- `docs/adr-011-use-tla-plus-for-self-play-promotion-safety.md`
- `docs/vibe-coder-high-level-design.md`
- `docs/developers-guide.md`
- `docs/users-guide.md`
- `docs/contents.md`
- `docs/execplans/1-1-1-record-package-runner-and-service-worker-strategy.md`
- `docs/execplans/1-1-2-record-the-type-script-source-tree-naming.md`
- `docs/execplans/1-1-3-record-x-state-machine-collocation-strategy.md`
- `package.json`
- `scripts/import-boundaries.ts`
- `tests/import-boundaries.test.ts`

Requested reference documents that are not currently present in this
worktree:

- `docs/corbusier-design-language.md`
- `docs/daisyui-v5-guide.md`
- `docs/data-model-driven-card-architecture.md`
- `docs/enforcing-semantic-tailwind-best-practice.md`
- `docs/high-velocity-accessibility-first-component-testing.md`
- `docs/pure-accessible-and-localizable-react-components.md`
- `docs/react-tailwind-with-bun.md`
- `docs/semantic-tailwind-with-daisyui-best-practice.md`
- `docs/tailwind-v4-guide.md`
- `docs/v2a-front-end-stack.md`

## Planned decisions to record

The implementation must record the following content. Wording is the
planner's recommendation; the implementer may rephrase for en-GB Oxford
style and for ADR voice, but must not weaken or restate the substance
without escalating.

### PRNG choice

The accepted seeded PRNG is **sfc32** (Chris Doty-Humphrey, "Small Fast
Counting v4"), in the **bryc-2022** JavaScript reference port. The
algorithm's rationale and properties relevant to ADR 005 are:

- State: 128 bits as four `uint32` words (`a`, `b`, `c`, `d`).
- Output: a single `uint32` per step, returned to consumers via `(value
  >>> 0) / 4294967296` for the canonical "uint32 to `[0, 1)`" conversion.
- Period: minimum 2^32 by construction, average ~2^127 (Doty-Humphrey,
  PractRand `RNG_engines.txt`).
- Statistical quality: passes PractRand to many terabytes and passes
  TestU01 BigCrush. No known empirical failure modes for the bit ranges
  used by the game.
- JavaScript fitness: 32-bit add, xor, shift, and rotate only. No
  `Math.imul`, no `BigInt`, no 64-bit arithmetic. This matters because
  saves must replay byte-identically across browsers, Bun, and Node-based
  self-play harnesses.
- Determinism: pure function of the four-word state; no platform-dependent
  intrinsics.
- Substreams: sfc32 has no jump-ahead polynomial by design. Independent
  streams per simulation feature derive from a per-feature seed using
  `splitmix32(masterSeed XOR xmur3(featureLabel)())`, then expand to 128
  bits via four further SplitMix32 steps.
- Warm-up: 12 steps after seeding, per the bryc-2022 reference, to
  decouple early output from low-entropy seeds.
- Licence: PractRand is public-domain; the bryc reference is public; the
  in-house implementation will be released under the repository's MIT or
  Apache-2.0 licence at implementation time.

The accepted **seeding strategy** is:

1. Accept the user-facing seed as either a 32-bit unsigned integer or a
   short string.
2. For string seeds, hash to a 32-bit integer using **xmur3** (bryc).
3. Expand the 32-bit integer to a 128-bit sfc32 state by stepping
   **SplitMix32** four times. SplitMix32 is the JS-safe stateless
   mixing function adapted from Steele, Lea, and Flood's 2014 paper and
   Vigna's splitmix64; pure 32-bit operations with `Math.imul`.
4. Warm sfc32 by discarding the first 12 outputs.

The accepted **save-identity** fields for the PRNG are:

- `prngName: "sfc32"` — algorithm name as a stable string.
- `prngVariant: "bryc-2022"` — names the reference port used.
- `prngVersion: 1` — integer bumped only when the step function or
  conversion convention changes in any byte-affecting way.
- `prngState: [a, b, c, d]` — the four-word state at the snapshot tick.

The accepted **runner-up** is **xoshiro128++** (Blackman and Vigna, 2018),
documented in the ADR amendment as the fallback algorithm if sfc32 ever
needs to be replaced. xoshiro128++ has the same 128-bit state, published
jump and long-jump polynomials, and a public-domain reference at
`prng.di.unimi.it`. Any later move to xoshiro128++ must trigger a
parameter-pack MAJOR bump under the migration policy below.

Property tests written with `fast-check` (which internally uses
`pure-rand`) may continue to use the framework's own RNG. The game's
deterministic stream and the property-test exploration stream serve
different roles and must not be coupled. ADR 005 must say so explicitly.

The amendment must include a short test-discipline statement: golden
seed-to-output vectors (for example, seed `1`, first 1000 outputs) must
be snapshotted in the test suite and verified on every Node, Bun, and
browser target before any code that depends on the PRNG ships.

### Parameter-pack version migration policy

The accepted parameter-pack version migration policy is:

**Pin pack triple, refuse silent advancement, allow explicit upgrade only
through registered transforms.**

In detail:

1. A `ParameterPack` is identified by the triple `(id, version,
   contentHash)`:

   - `id` is a stable lineage string such as `"core"`,
     `"core.spicy"`, or `"community.foo"`. Lineage ids are never reused
     for a different pack.
   - `version` is a semantic version string `MAJOR.MINOR.PATCH` per
     `semver.org`, with the bump rules below.
   - `contentHash` is a deterministic content hash over the
     canonicalised, JSON-sorted pack body excluding `id` and `version`.
     The hash algorithm is recommended as BLAKE3 or SHA-256 and is to be
     fixed in 1.3.2 or 1.4.1 when the implementation lands. ADR 005
     does not pin the algorithm itself here.

2. The Dexie `parameterPacks` store (already in ADR 004's illustrative
   schema) is append-only at the `(id, version, contentHash)` grain. A
   row keyed by content hash cannot be deleted while any run pins it.

3. Semantic-version meaning for parameter packs:

   - **PATCH**: comment, label, documentation, or other metadata edit
     that does not change any numeric simulation value. The hash differs
     but the canonicalised numeric subset is byte-identical. May
     silently rebind a run on load. A `PackRebindEvent` is logged so
     replays remain self-describing.
   - **MINOR**: additive or pure tuning. New optional field with a
     default, new ending threshold that does not invalidate existing
     endings, or numeric tweaks inside a designer-set tuning window
     (initial recommended ceiling: ten per cent delta per field). Does
     not change the shape of the simulation. Requires an explicit
     player-initiated upgrade prompt; never silent.
   - **MAJOR**: any change that would invalidate a recorded
     `EventResolution` or `UnlockLedger` entry produced under the older
     pack. Includes renamed or removed fields, changed units or ranges,
     new mandatory fields, new tick steps, and any PRNG change.
     Quarantines existing runs as read-only and archive-only.

4. Behaviour on save load and JSON import:

   <!-- markdownlint-disable MD013 -->

   | Situation | Required behaviour |
   | --- | --- |
   | Pinned `(id, version, contentHash)` is registered in Dexie | Continue. |
   | Pinned `id+version` exists but `contentHash` differs | Refuse to advance the run. Offer restore-from-export or archive. |
   | Pinned pack absent (JSON import from another machine) | Require import-or-archive flow; JSON export must embed the full pack body. |
   | Newer compatible pack version exists (same MAJOR, ≥ MINOR/PATCH) | Offer explicit "Upgrade run to pack X.Y.Z" action. Show diff summary. Never silent. |
   | Newer incompatible pack version exists (different MAJOR) | Mark run read-only and archive-only. |
   | PATCH-only difference whose canonicalised numeric subset matches | Auto-rebind silently. Log `PackRebindEvent` to the run event log. |

   <!-- markdownlint-enable MD013 -->

5. Per-version transform functions are registered in code for each MINOR
   bump that requires data adjustment. Transforms apply sequentially in
   semantic-version order, mirroring Factorio's migration ordering and
   Mojang's DataFixerUpper philosophy.

6. The PRNG identity is a separate save field set, independent of the
   parameter pack. Changing the PRNG name, variant, or version forces a
   parameter-pack MAJOR bump and quarantines existing runs. The runtime
   engine refuses to load a pack whose declared `prngContract` (added in
   1.3.2) does not match the engine's compiled PRNG.

7. JSON export of a run includes the full pack body, not merely its
   hash. JSON import registers the pack into `parameterPacks` with
   `status: "imported-from-save"` if its hash validates against the
   embedded body; otherwise import is refused. This pre-decides ADR
   004's "imported saves can include custom parameter packs" question in
   the affirmative; the broader ADR 004 import/export format question
   remains open and is owned by ADR 004.

8. Dexie schema migrations remain strictly orthogonal to parameter-pack
   migrations. A Dexie `db.version(n).upgrade()` may rename a table
   column; it never alters a stored `parameterPackContentHash`. Both
   layers must succeed for a run to load.

9. Self-play reports (ADR 006) must carry the same
   `(id, version, contentHash)` triple. ADR 011's `canPromote` predicate
   already requires the pack hash as part of `TrialEvidence`. This
   policy is the operational complement: promotion is illegal if the
   candidate pack would silently re-bind any existing run without a
   registered transform.

The accepted **save-identity** fields required in every saved run are:

- `saveSchemaVersion`: integer that drives the Dexie storage-shape
  migration ladder.
- `simTickContractVersion`: integer bumped when `SimTickInput`,
  `SimTickOutput`, or the tick-step order changes.
- `parameterPackId`, `parameterPackVersion`,
  `parameterPackContentHash`: the pack pin.
- `prngName`, `prngVariant`, `prngVersion`: the PRNG pin (and
  `prngState` inside the snapshot itself).
- `seed`: as already required by HLD rule 7.
- `eventLogTailDigest`: hash of the event log up to the last persisted
  tick, to let replay detect tampering.

The amendment must state that loaders reject a save where any of these
fields is missing. Silent default coercion is forbidden.

## Implementation plan

First, confirm the working branch. Run `git branch --show-current`. If the
branch is `feat/record-seeded-prng-choice` and no pull request exists yet,
rename the branch locally to `1-1-4-record-seeded-prng-choice` to match the
naming pattern of the prior three plans:

```sh
git branch -m 1-1-4-record-seeded-prng-choice
```

If a pull request already exists on the current branch, do not rename
locally. Use GitHub's branch rename flow instead so the PR follows the
rename. If the branch is `main`, stop.

Second, edit `docs/adr-005-use-deterministic-simulation-and-parameter-packs.md`.
Add an "Accepted decisions" section near the existing "Decision outcome"
section recording, in en-GB Oxford voice, the PRNG choice, the seeding
strategy, the save-identity fields, the runner-up, and the
property-test/pure-rand separation, as detailed in
"Planned decisions to record" above. Then add an "Accepted migration
policy" section recording the pack-triple identity, the semver tier rules,
the behaviour matrix, the per-version transform mechanism, the PRNG-change
rule, the JSON import/export embedding rule, the orthogonality with Dexie
schema migrations, the self-play and ADR 011 integration, and the required
saved-run fields.

Both sections should be written as ADR voice (rationale plus normative
sentences), not as code. Use a small TypeScript type sketch at most, in the
style of the existing `SimTickInput` sketch in ADR 005:

```typescript
type RngContract = {
  name: "sfc32";
  variant: "bryc-2022";
  version: 1;
};

type RunIdentity = {
  saveSchemaVersion: number;
  simTickContractVersion: number;
  parameterPackId: string;
  parameterPackVersion: string;
  parameterPackContentHash: string;
  prngName: RngContract["name"];
  prngVariant: RngContract["variant"];
  prngVersion: RngContract["version"];
  seed: number;
  eventLogTailDigest: string;
};
```

Third, update ADR 005's "Outstanding decisions" section. Remove the
"Choose the seeded pseudo-random number generator" bullet. Remove the
"Define the version migration policy for runs created under older packs"
bullet. Leave the fixed-point arithmetic bullet untouched. Change ADR 005's
`Status` to `Accepted` if and only if 1.1.4 closes the substantive
"open" content for the ADR's current scope; otherwise leave it as
`Proposed` and note in the `Decision Log` that the remaining bullet
(fixed-point arithmetic) keeps the ADR in the `Proposed` lifecycle stage.
The preferred direction is to mirror ADR 003's treatment: ADR 003 became
`Accepted` after 1.1.3 closed its outstanding decisions, and 1.1.4 closes
two of three ADR 005 outstanding decisions. The recommended approach is to
move the ADR to `Accepted` because the fixed-point question is a future
optimisation choice rather than a foundational gap; if implementation
disagrees, document the rationale.

Fourth, update `docs/developers-guide.md`. Add a short "Determinism,
randomness, and parameter packs" section (one or two short paragraphs) that
states:

- The seeded PRNG is sfc32 (bryc-2022); see ADR 005 for the seeding and
  substream-derivation details.
- Domain and application code must obtain randomness through the
  `RandomSource` port (added in roadmap 1.2.2 and implemented in 1.3.3);
  direct calls to `Math.random`, `crypto.getRandomValues`,
  `crypto.randomUUID`, or `Date.now` are forbidden in those layers.
- Saves carry pinned parameter pack and PRNG identity; the migration
  policy refuses silent advancement and allows upgrade only through
  registered transforms; see ADR 005 for the full policy.

Keep the developer-guide update short; do not duplicate ADR 005's full
text.

Fifth, leave `docs/users-guide.md` unchanged. This decision-record task
does not introduce player-visible behaviour. Player-facing save-migration
prompts arrive with 2.4.x and beyond and will own their own user-guide
update.

Sixth, leave `docs/contents.md` unchanged. The change set adds no new
top-level document.

Seventh, update `docs/roadmap.md` to mark only item 1.1.4 as `[x]`. Do not
mark any other roadmap item done.

Eighth, update this ExecPlan's living sections as work proceeds: record
files changed, commands run, surprises, and validation evidence.

Ninth, run focused checks first:

```sh
bunx markdownlint-cli \
  docs/adr-005-use-deterministic-simulation-and-parameter-packs.md \
  docs/developers-guide.md \
  docs/roadmap.md \
  docs/execplans/1-1-4-record-seeded-prng-choice.md \
  2>&1 | tee /tmp/markdownlint-vibe-coder-1-1-4-record-seeded-prng-choice.out
bunx nixie 2>&1 \
  | tee /tmp/nixie-vibe-coder-1-1-4-record-seeded-prng-choice.out
```

If repository-wide Markdown lint surfaces pre-existing failures outside
touched files, record them separately and do not make unrelated rewrites
in this task.

Tenth, run the required commit gates sequentially:

```sh
make check-fmt 2>&1 | tee /tmp/check-fmt-vibe-coder-1-1-4-record-seeded-prng-choice.out
make lint      2>&1 | tee /tmp/lint-vibe-coder-1-1-4-record-seeded-prng-choice.out
make typecheck 2>&1 | tee /tmp/typecheck-vibe-coder-1-1-4-record-seeded-prng-choice.out
make test      2>&1 | tee /tmp/test-vibe-coder-1-1-4-record-seeded-prng-choice.out
bun ff         2>&1 | tee /tmp/ff-vibe-coder-1-1-4-record-seeded-prng-choice.out
```

If `bun ff` fails at the e2e stage because no dev server is reachable at
`http://localhost:5173`, start a temporary `bun dev -- --host 127.0.0.1
--port 5173` server only for validation, rerun `bun ff`, and stop the
server after it completes. Do not mark the roadmap item done without a
clean `bun ff` result unless the user explicitly changes that requirement.

Eleventh, use Playwright and css-view validation. If the app is already
served, use Playwright MCP to navigate to the served URL, capture a
screenshot, and verify that the page still renders. Use css-view against
the same served app to confirm no semantic-class regression is visible.
This change set is documentation-only, so the expected outcome is no
visible delta. If Playwright MCP cannot launch a browser (the prior plan
recorded that `chrome-for-testing` is not installed), record the
limitation in `Surprises & Discoveries` and rely on the e2e stage inside
`bun ff` as evidence.

Twelfth, after each major milestone (this plan commit, the ADR amendment,
the developer-guide update, and the roadmap mark-done commit), run
`coderabbit review --agent`. Clear all findings before moving on. CodeRabbit
may rate-limit; record any rate-limit retries in `Surprises & Discoveries`.

Thirteenth, mark roadmap item 1.1.4 as done in `docs/roadmap.md` only
after:

- ADR 005 contains the accepted PRNG decision and the accepted migration
  policy.
- ADR 005 no longer carries the PRNG or migration-policy open questions.
- `docs/developers-guide.md` summarises both decisions with an ADR-005
  back-link.
- `docs/users-guide.md` and `docs/contents.md` remain unchanged (or have a
  recorded reason for change).
- All required gates pass.

Fourteenth, commit the implementation atomically using the file-based
`commit-message` workflow, push the branch, and open a draft pull request
whose title includes `(1.1.4)`.

## Validation and acceptance

The implementation is accepted when all of the following are true:

- `docs/adr-005-use-deterministic-simulation-and-parameter-packs.md`
  contains an accepted PRNG decision naming sfc32 in the bryc-2022 port
  (or another explicitly approved algorithm), the seeding strategy, the
  substream-derivation pattern, the runner-up algorithm, the property-test
  separation, and the save-identity fields.
- ADR 005 contains the accepted migration policy with the pack-triple
  identity rule, the semver tier rules, the behaviour matrix, the
  per-version transform mechanism, the PRNG-change rule, the JSON
  import/export embedding rule, the orthogonality with Dexie schema
  migrations, the self-play and ADR 011 integration, and the required
  saved-run fields.
- ADR 005's "Outstanding decisions" section no longer contains the PRNG
  bullet or the migration-policy bullet, and still contains the
  fixed-point arithmetic bullet.
- `docs/developers-guide.md` adds a short section pointing developers to
  the accepted PRNG and migration policy.
- `docs/users-guide.md` is unchanged because behaviour is unchanged, or
  is updated with a recorded reason in the `Decision Log`.
- `docs/contents.md` is unchanged because no new top-level document was
  added.
- `docs/roadmap.md` marks only item 1.1.4 as done.
- `make check-fmt`, `make lint`, `make test`, and `bun ff` all succeed.
- Playwright and css-view validation have evidence, or their
  unavailability is recorded with the closest substitute validation.
- `coderabbit review --agent` has been run at each major milestone and
  reports `findings: 0` (or has recorded rate-limit failures only).

Quality criteria:

- Tests: existing `make test` and `bun ff` pass; no new failures.
- Lint and type-check: `make lint` and `make typecheck` pass.
- Markdown lint passes on touched files; pre-existing failures outside
  the touched files are recorded but not silently rewritten.
- Mermaid validation via `bunx nixie` passes on any touched document.

## Commit and pull request plan

After validation passes, inspect the diff with `git diff` and `git status
--short`. Stage only the files changed for this task. Use the
`commit-message` skill workflow: write the commit message to a file in a
`mktemp -d` directory and commit with `git commit -F`.

Use a commit subject such as:

```plaintext
Record seeded PRNG choice and pack migration policy (1.1.4)
```

Push the renamed branch to `origin/1-1-4-record-seeded-prng-choice` and
set upstream tracking. Open a draft pull request against the repository
default branch. The pull request title must include `(1.1.4)`, for
example:

```plaintext
Record seeded PRNG choice and pack migration policy (1.1.4)
```

The pull request description must link this ExecPlan
(`docs/execplans/1-1-4-record-seeded-prng-choice.md`) and must state, in
the case of the planning commit, that the plan is pre-implementation and
requires approval before ADR 005 is changed.

## Progress

- [x] (2026-05-23T00:00:00Z) Loaded the `execplans`, `leta`, and (by
  reference) `hexagonal-architecture`, `commit-message`, `pr-creation`,
  and `en-gb-oxendict` instructions relevant to this planning task.
- [x] (2026-05-23T00:00:00Z) Added the worktree to the Leta workspace
  with `leta workspace add`.
- [x] (2026-05-23T00:00:00Z) Confirmed the current branch is
  `feat/record-seeded-prng-choice` and no pull request exists on it yet.
- [x] (2026-05-23T00:00:00Z) Used a Wyvern agent team for planning
  research: one agent surveyed PRNG candidates and prior art via
  Firecrawl; one agent surveyed parameter-pack migration policy prior art
  via Firecrawl; one agent surveyed the repository for existing PRNG,
  seeding, hashing, and migration code (none exists).
- [x] (2026-05-23T00:00:00Z) Reviewed the roadmap, ADR 002, ADR 003,
  ADR 004, ADR 005, ADR 006, ADR 011, the HLD sections on parameter
  packs and save strategy, the developer guide, the contents index, the
  package manifest, the import-boundary linter, and the prior ExecPlans
  for items 1.1.1 and 1.1.3.
- [x] (2026-05-23T00:00:00Z) Drafted this approval-gated ExecPlan.
- [x] (2026-05-23T01:05:00Z) Renamed the local branch from
  `feat/record-seeded-prng-choice` to `1-1-4-record-seeded-prng-choice`
  before the first push, matching the naming pattern of 1.1.1, 1.1.2,
  and 1.1.3.
- [x] (2026-05-23T01:10:00Z) Validated this planning-only branch with
  focused Markdown lint, `bunx nixie`, `make check-fmt`, `make lint`,
  `make test`, and `bun ff`. The first `make test` attempt failed
  because dependencies were not installed; after `bun install` and
  `bun tokens:build`, all gates passed. `bun ff` required a temporary
  `bun dev --host 127.0.0.1 --port 5173` server for the e2e stage; the
  server was stopped after `bun ff` exited 0.
- [x] (2026-05-23T01:30:00Z) Commit this ExecPlan for plan review.
- [x] (2026-05-23T01:35:00Z) Push the branch and open a draft pull
  request for plan review (PR #9).
- [x] (2026-05-26T00:00:00Z) Received explicit user approval on PR #9
  to proceed with implementation.
- [x] (2026-05-26T00:10:00Z) Amended ADR 005 with the accepted PRNG
  decision, the accepted migration policy, status changed from Proposed
  to Accepted, and the outstanding-decisions list trimmed to the
  remaining fixed-point arithmetic bullet only.
- [x] (2026-05-26T00:15:00Z) Updated `docs/developers-guide.md` with the
  short "Determinism, randomness, and parameter packs" section and
  refreshed the stale `RandomSource` adapter row from `mulberry32.ts` to
  `sfc32.ts` so the adapter table matches the accepted PRNG.
- [x] (2026-05-26T00:15:00Z) Confirmed `docs/users-guide.md` and
  `docs/contents.md` remain unchanged for this task; the change set
  introduced no new top-level document and no player-visible behaviour.
- [x] (2026-05-26T00:20:00Z) Marked only roadmap item 1.1.4 as done.
- [ ] Run `coderabbit review --agent` after each major milestone and
  clear findings before moving on.
- [ ] Run `make check-fmt`, `make lint`, `make typecheck`, `make test`,
  and `bun ff` sequentially; record `/tmp` logs.
- [ ] Run css-view and Playwright MCP validation against the served app
  (or record their unavailability with the closest substitute).
- [ ] Commit the implementation atomically using the file-based
  commit-message workflow.
- [ ] Push and open the draft pull request; title includes `(1.1.4)`.

## Surprises & Discoveries

- (2026-05-23) The requested frontend reference documents
  (`docs/v2a-front-end-stack.md`, `docs/tailwind-v4-guide.md`,
  `docs/daisyui-v5-guide.md`, and others) are not present in this
  worktree.
  Evidence: directory listing of `docs/` returned none of the requested
  filenames.
  Impact: This plan signposts available in-repo substitutes (AGENTS.md,
  the HLD, the ADRs, the developer guide, and the prior ExecPlans).
- (2026-05-23) The repository skeleton for `src/domain/`,
  `src/application/`, and `src/adapters/` contains only empty barrels and
  the first XState machine. No `RandomSource` port, `Seed` type,
  `ParameterPack` type, hashing utility, or migration code exists yet.
  Evidence: `leta files` and inspection of the three layer index files.
  Impact: 1.1.4 is purely a decision-record change; later roadmap items
  will build to the recorded decisions.
- (2026-05-23) The boundary linter at `scripts/import-boundaries.ts`
  already forbids `react`, `react-dom`, and `dexie` in domain and
  application code, but does not yet forbid `crypto` or `Date.now`.
  Evidence: `scripts/import-boundaries.ts` lines 73 to 83 and 216 to 251.
  Impact: Tightening the linter to ban direct randomness or wall-clock
  imports in domain and application code is deferred to roadmap items
  1.2.2 and 1.3.3, when the `RandomSource` port and its adapter land.
- (2026-05-23) `fast-check` and `pure-rand` are not currently
  dependencies.
  Evidence: `package.json` inspection.
  Impact: 1.1.4 does not add either. The ADR amendment records that
  later property tests using `fast-check` may use its internal
  `pure-rand` RNG for exploration without coupling the game's stream to
  that package.
- (2026-05-23) The current branch is `feat/record-seeded-prng-choice`,
  which differs from the `1-1-N-...` naming pattern of the prior three
  ExecPlans.
  Evidence: `git branch --show-current`.
  Impact: The plan proposes a local rename to
  `1-1-4-record-seeded-prng-choice` before the first push so no GitHub
  PR rename flow is required.

## Decision Log

- (2026-05-23) Treat 1.1.4 as a decision-record-only change in the same
  shape as 1.1.1 and 1.1.2, not as the mixed decision-plus-code shape of
  1.1.3.
  Rationale: 1.1.3's success criterion explicitly required "the first
  machine test compiles and passes"; 1.1.4's success criterion does not
  require code. The PRNG implementation is owned by roadmap item 1.3.3
  and the migration-policy implementation is owned by 1.3.2, 1.4.x, and
  2.4.3.
- (2026-05-23) Recommend sfc32 (bryc-2022) as the primary PRNG with
  xoshiro128++ as the documented runner-up.
  Rationale: sfc32 passes PractRand to many terabytes and TestU01
  BigCrush, uses only 32-bit operations that fit JavaScript fast paths,
  has a 128-bit state large enough for substream derivation, has a
  short and unambiguous reference implementation, and has independent
  game-development adoption precedent (Amit Patel's procgen migration).
  xoshiro128++ remains a credible fallback with documented jump and
  long-jump polynomials.
- (2026-05-23) Recommend in-house implementation of sfc32 rather than
  reuse of `pure-rand` for the game stream.
  Rationale: `pure-rand` defaults to `xoroshiro128+`, which has the
  documented low-bit linearity weakness; sfc32 is not in `pure-rand`;
  saved games must replay byte-identically across many years, and an
  in-house implementation pinned to golden test vectors gives that
  guarantee independently of a third-party package's release decisions.
- (2026-05-23) Recommend leaving the property-test framework (likely
  `fast-check` via `pure-rand`) decoupled from the game's deterministic
  stream.
  Rationale: Property-test seeds explore the input space; game seeds
  reproduce simulation history. They serve different roles and need not
  share an instance.
- (2026-05-23) Recommend the "pin pack triple, refuse silent advancement"
  migration policy.
  Rationale: It preserves replay determinism, matches the HLD's
  Skyjoust-inspired persistence discipline, mirrors content-addressed
  pinning used by Git and Iceberg, and remains compatible with ADR 011's
  formal promotion safety predicate.
- (2026-05-23) Recommend semver tier rules with explicit per-tier
  behaviour: PATCH silent rebind only if numeric-subset-identical, MINOR
  explicit upgrade prompt, MAJOR quarantines the run.
  Rationale: Silent auto-upgrade on MINOR would resemble save corruption
  to the player; treating every change as breaking would let typos
  quarantine every run; the tiered rule preserves both safety and
  human-scale upgrade UX.
- (2026-05-23) Recommend embedding the full pack body in JSON exports
  (pre-deciding ADR 004's "imported saves can include custom parameter
  packs" question affirmatively) while leaving ADR 004's broader
  import/export format question open.
  Rationale: The migration policy is unenforceable without the embedded
  body; the broader format question remains within ADR 004's scope.
- (2026-05-23) Recommend recording the PRNG identity (`prngName`,
  `prngVariant`, `prngVersion`) as separate save fields, and treating
  any PRNG change as a forced parameter-pack MAJOR bump.
  Rationale: Tying the PRNG to the pack is necessary to prevent
  "swapped the engine under the same pack hash" silent corruption.
- (2026-05-23) Recommend leaving the hash algorithm choice (BLAKE3 or
  SHA-256) to 1.3.2 or 1.4.1.
  Rationale: The migration policy needs a deterministic content hash but
  does not need to bind a specific algorithm at the decision-record
  layer. The algorithm choice is an implementation concern that should
  be settled with the rest of the persistence implementation.
- (2026-05-23) Recommend moving ADR 005's `Status` from `Proposed` to
  `Accepted` once the PRNG and migration-policy bullets are closed.
  Rationale: The remaining fixed-point arithmetic bullet is a future
  optimisation question, not a foundational gap. ADR 003 was moved to
  `Accepted` on the same basis when 1.1.3 closed its outstanding
  decisions.
- (2026-05-23) Recommend renaming the branch locally to
  `1-1-4-record-seeded-prng-choice` before the first push.
  Rationale: The prior three plans use this naming pattern, no pull
  request exists yet, and renaming before the first push avoids the
  GitHub PR rename flow.

## Outcomes & Retrospective

To be filled in after the planning commit and after the implementation
milestones complete. Record:

- Whether ADR 005 was moved to `Accepted` or left `Proposed`.
- The final shape of the developer-guide update.
- Whether `users-guide.md` and `contents.md` remained unchanged.
- Validation evidence (sequenced `/tmp` logs and CodeRabbit run
  identifiers).
- Any surprises encountered during implementation.
- Lessons that should inform later items 1.3.2, 1.3.3, 1.4.x, and
  2.4.3.

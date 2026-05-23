# Record XState machine collocation and model-test harness

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: COMPLETE

## Purpose / big picture

Roadmap item 1.1.3 closes the XState workflow-orchestration decision that later
machine scaffolding depends on. After the approved implementation lands, a
developer can open ADR 003 and see exactly where workflow machines live, which
model-test harness is used for the first machine test, and how that choice fits
the repository's hexagonal boundaries.

The observable success condition is not only documentation. The implementation
must also add the first minimal machine test so that the chosen placement and
harness compile and pass under the repository's Bun test spine. Do not implement
this plan until the user has explicitly approved it.

## Constraints

- This ExecPlan was explicitly approved for implementation on 2026-05-20 by
  the user request to proceed with the planned functionality.
- Keep the implementation scoped to roadmap item 1.1.3.
- Use the `hexagonal-architecture` skill to protect boundaries. Dependencies
  point inward, domain policy remains free of framework imports, and XState
  orchestration belongs in the application layer rather than the domain layer.
- Ratify one machine placement strategy in ADR 003. The planned direction is
  `src/application/machines/` because ADR 003, the HLD module map, and
  `docs/developers-guide.md` already point there. If implementation discovers a
  stronger reason to choose feature-colocated machines instead, stop and ask for
  approval before changing direction.
- Ratify one first model-test harness in ADR 003. Current official XState v5
  documentation says graph and model-test utilities are available from the
  `xstate/graph` export, while the legacy `@xstate/test` page says the latest
  model-based testing utilities moved into graph utilities. Prefer XState v5
  with `xstate/graph` unless package research on implementation day proves the
  repository must use a separate package.
- Do not add simulation equations, parameter packs, Dexie schema, real
  application services, React provider wiring, or gameplay UI in this item.
  Those are later roadmap tasks.
- Do not put resource values, debt vectors, save payloads, or simulation
  equations in XState context. Machines coordinate workflow state and call
  application services; domain services own game policy and numerical state.
- If adding dependencies is required, add only direct dependencies needed for the
  first compiling machine and model-test harness. Expected candidates are
  `xstate` for the machine and graph utilities, and possibly `@xstate/react`
  only if implementation cannot avoid React integration, which is not expected
  for 1.1.3.
- Keep tests under the existing repository test shape. Machine definitions
  should live under `src/application/machines/`, with focused Bun tests under
  `tests/` using the existing preload setup when needed.
- If the implementation adds user-visible strings, labels, card model data,
  routes, or UI state, every user-visible string and attribute must use the
  Fluent/i18next pipeline. Locale files must be provided for every supported
  locale in the repository, with RTL support for RTL locales. If the supported
  locale list is inconsistent with the request, stop and record the mismatch.
- The present worktree lists many supported locale codes in
  `src/app/i18n/supported-locales.ts`, including `ar` and `he` as RTL locales,
  while only `public/locales/en-GB/common.ftl` exists. This task is expected to
  avoid UI strings; if it cannot, locale coverage becomes a blocker rather than
  optional polish.
- Maintain WCAG 2.2 compliance for any UI-visible change. This task is expected
  to be non-visual; if UI is touched, add appropriate unit, component, a11y, and
  end-to-end coverage before marking the roadmap item done.
- Use semantic classes for any UI CSS. This task is expected not to change CSS.
- Update `docs/developers-guide.md` because the accepted placement and machine
  test harness are developer-facing architecture practice.
- Update `docs/users-guide.md` only if implementation changes player-visible
  behaviour. This item should not change user behaviour.
- Mark only roadmap item 1.1.3 as done, and only after ADR 003 records the
  accepted decision and the first machine test compiles and passes.
- Keep documentation in en-GB Oxford spelling and grammar.
- Keep every code file at or below 400 lines.
- Do not run formatting, linting, type checking, tests, semantic checks, or
  frontend gates in parallel.
- `make check-fmt`, `make lint`, `make test`, and `bun ff` must pass before the
  implementation is committed.
- Use Playwright and css-view validation where tooling and a served app are
  available. Do not claim visual, semantic-class, or accessibility validation
  passed without evidence.

## Tolerances (exception triggers)

- Scope: if implementation requires changes outside `docs/`,
  `src/application/`, `tests/`, `package.json`, `bun.lock`,
  `docs/developers-guide.md`, `docs/users-guide.md`, or this ExecPlan, stop and
  ask for approval.
- Size: if the implementation exceeds 500 net lines, stop and ask whether to
  split the dependency, decision-record, and first-test work into separate
  commits or tasks.
- Interface: if a public route, component prop, domain type, persistence schema,
  locale contract, or package script must change, stop and ask for approval.
- Dependencies: if more than `xstate` and one directly related XState
  integration package are needed, stop and present options with trade-offs.
- Harness drift: if current XState documentation or package metadata conflicts
  with ADR 003's existing `@xstate/test` wording, update the `Decision Log` and
  choose the current maintained path only if it still satisfies the roadmap
  success condition. Escalate if this would require a broader ADR rewrite.
- Boundary drift: if a machine import would make `src/domain/` depend on
  XState, React, adapters, browser APIs, or test utilities, stop and redesign.
- Validation: if the same required gate fails twice after changes intended to
  fix this item, stop, record the evidence, and ask for direction.
- Browser validation: if Playwright, css-view, or the served app cannot be used,
  record the unavailable tool and run the closest automated replacement. Do not
  mark that validation as passed.

## Risks

- Risk: ADR 003 already names `@xstate/test`, but official XState v5
  documentation now points model-test usage through graph utilities.
  Severity: high.
  Likelihood: high.
  Mitigation: Treat harness selection as the real decision in this task. Record
  the maintained XState v5 choice in ADR 003 and include a compiling test that
  proves the import path works with Bun.

- Risk: A documentation-only implementation would satisfy "one accepted
  document" but not the roadmap's machine-test success condition.
  Severity: high.
  Likelihood: medium.
  Mitigation: Include a minimal `app.machine` or equivalent first machine shell
  and a focused test that exercises model path generation or coverage through
  the chosen harness. Do not mark 1.1.3 done until that test passes.

- Risk: Adding XState before domain value types exist could tempt the
  implementation to model future gameplay details prematurely.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Keep the first machine intentionally small, such as an app boot or
  title workflow shell with no simulation context. Document that richer machines
  belong to roadmap item 1.5.1.

- Risk: The requested frontend reference documents are not present in this
  worktree.
  Severity: low.
  Likelihood: high.
  Mitigation: Record their absence and rely on available in-repo sources:
  `AGENTS.md`, the roadmap, ADRs, HLD, developer guide, user guide, existing
  semantic lint tooling, and existing tests.

- Risk: Locale metadata and actual locale bundle coverage do not match.
  Severity: medium.
  Likelihood: high.
  Mitigation: Avoid UI strings in this task. If implementation touches UI, stop
  until the locale coverage scope is confirmed.

- Risk: Full `bun ff` may expose pre-existing failures unrelated to this item.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Run gates sequentially with `/tmp` logs, preserve evidence, and do
  not hide or work around unrelated failures.

## Repository context

Roadmap item 1.1.3 lives in `docs/roadmap.md` under "1. Foundational contracts
and build spine", step 1.1, "Ratify outstanding decisions recorded in the
ADRs". Its success text requires one accepted document confirming placement and
the first machine test compiling and passing.

ADR 003 is
`docs/adr-003-use-xstate-for-workflow-orchestration.md`. It says XState
machines orchestrate workflow state, while simulation ticks call pure domain
services and return events consumed by machines and adapters. Its outstanding
decisions currently name central placement under `application/machines/`,
`@xstate/test` with Bun, graph export through the XState inspector, and
autopilot as a parallel region of `run.machine`.

ADR 002 is
`docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`. It
records `src/domain/`, `src/application/`, and `src/adapters/` as the accepted
source boundaries. It also explains that application services and domain rules
form the core, while React, Dexie, Web Audio, Canvas, workers, assets, and
tooling interact through ports and adapters.

The developer guide already says that XState machines live in
`application/machines/`, and lists `app.machine`, `run.machine`,
`policy.machine`, `event.machine`, `progression.machine`, and `audio.machine`
as application-layer contents. It does not yet record the first model-test
harness, nor does the source tree contain `src/application/machines/`.

`package.json` currently contains no XState dependency. The existing quality
spine includes `bun test`, `bun run test:a11y`, `bun semantic`, `bun ff`, and
Makefile wrappers for format, lint, typecheck, and test. The `bun ff` script
runs Tailwind generation and then `bun run test:all`, which includes e2e
tests.

Official XState source checks made during planning:

- The current Stately XState docs are for XState v5 and show installation with
  `xstate`.
- The graph docs state that graph utilities are included in the main `xstate`
  package and imported from `xstate/graph`.
- The graph docs present path generation as useful for model-based testing,
  validation, visualization, and documentation, and show `createTestModel` from
  `xstate/graph`.
- The legacy `@xstate/test` page says the latest model-based testing utilities
  previously in `@xstate/test` are now part of graph utilities.

Relevant skills for implementation:

- `execplans`, for maintaining this plan as the source of truth.
- `hexagonal-architecture`, for keeping workflow orchestration out of the pure
  domain model and adapter code.
- `leta`, for semantic code navigation when adding and checking machine symbols.
- `commit-message`, for the file-based commit message workflow.
- `pr-creation`, with `en-gb-oxendict-style`, for the draft pull request.

Relevant local documents:

- `AGENTS.md`
- `docs/roadmap.md`
- `docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
- `docs/adr-003-use-xstate-for-workflow-orchestration.md`
- `docs/vibe-coder-high-level-design.md`
- `docs/developers-guide.md`
- `docs/users-guide.md`
- `package.json`
- `tests/setup-happy-dom.ts`
- `vitest.a11y.config.ts`
- `playwright.config.ts`

Requested reference documents that are not currently present in this worktree:

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

## Implementation plan

First, confirm the branch is
`1-1-3-record-x-state-machine-collocation-strategy` with
`git branch --show-current`. If not, stop unless the branch can be renamed
without affecting an existing pull request.

Second, verify current XState package guidance before editing code:

```sh
bun pm view xstate version
bun pm view @xstate/test version
```

Use this only to confirm package names and versions. Do not choose a deprecated
test package if the maintained XState v5 graph utilities satisfy the roadmap
requirement.

Third, update ADR 003. Add an accepted decision section near the decision
outcome that records:

```plaintext
Machine placement: centralized under `src/application/machines/`.
First model-test harness: XState v5 graph/model-test utilities through
`xstate/graph`, exercised by Bun tests.
Autopilot modelling: retain ADR 003's current direction that autopilot is a
parallel state region of `run.machine`, but do not implement it in 1.1.3.
```

The ADR text must explain why centralizing machines in the application layer is
not a generic pattern transplant. In this repository, machines coordinate
application workflows that cross features, while feature UI remains in the app
shell or future inbound adapters. This keeps domain rules pure and avoids
scattering workflow contracts before the six planned machine shells exist.

Fourth, update ADR 003's "Outstanding decisions" section. Remove or rewrite the
collocation and first harness bullets so they are no longer open questions. If
autopilot remains an accepted but unimplemented modelling choice, make that
clear. Do not imply that all machines have been implemented.

Fifth, add the minimal source shape required to prove the decision. Create
`src/application/machines/` and add a small first machine module, preferably
`app.machine.ts`, with a module header. The machine should contain only states
needed to prove placement and harness mechanics, for example `booting`,
`title`, and `failed`, with typed events and no simulation data. Export it
through a narrow application-layer entry point if that matches the existing
barrel style.

Sixth, add a focused Bun test under `tests/`, for example
`tests/app-machine.test.ts`. The test should import the machine and the chosen
graph/model-test utilities, generate shortest paths or a test model, and assert
that expected states are reachable while an invalid workflow state is not
reachable. This is the "first machine test" required by the roadmap.

Seventh, update `docs/developers-guide.md` so a developer can find the accepted
machine placement and first harness without reading the entire ADR. Keep the
guide short and link readers back to ADR 003 for rationale.

Eighth, update `docs/users-guide.md` only if implementation changes
player-visible behaviour. The expected implementation does not change user
behaviour, so this file should remain unchanged unless that assumption becomes
false.

Ninth, update this ExecPlan as work proceeds. Record dependency versions,
source paths, tests, surprises, and validation evidence in the mandatory living
sections.

Tenth, run focused checks first:

```sh
bun check:types 2>&1 | tee /tmp/typecheck-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out
bun test tests/app-machine.test.ts 2>&1 \
  | tee /tmp/test-app-machine-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out
bunx markdownlint-cli \
  docs/adr-003-use-xstate-for-workflow-orchestration.md \
  docs/developers-guide.md \
  docs/execplans/1-1-3-record-x-state-machine-collocation-strategy.md \
  2>&1 | tee /tmp/markdownlint-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out
```

Use the exact test filename that implementation creates. If Markdown linting
surfaces pre-existing failures outside touched files, record them separately and
do not make unrelated rewrites in this task.

Eleventh, run the required commit gates sequentially:

```sh
make check-fmt 2>&1 | tee /tmp/check-fmt-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out
make lint 2>&1 | tee /tmp/lint-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out
make typecheck 2>&1 | tee /tmp/typecheck-make-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out
make test 2>&1 | tee /tmp/test-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out
bun ff 2>&1 | tee /tmp/ff-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out
```

If `bun ff` fails in the e2e stage because the environment cannot start or
reach a browser runner, stop and record the exact failure. Do not mark the
roadmap item done without a clean `bun ff` result unless the user explicitly
changes that requirement.

Twelfth, use Playwright and css-view validation. If the app is already served,
use the Playwright MCP to navigate to the served URL, capture a screenshot, and
run the relevant accessibility scan if available. Use css-view against the same
served app to confirm no semantic-class regression is visible. If no app is
served and the validation tool cannot launch one through the existing test
configuration, record the limitation in `Surprises & Discoveries` and rely on
the automated `bun ff` e2e evidence.

Thirteenth, mark roadmap item 1.1.3 as done in `docs/roadmap.md` only after:

- ADR 003 contains the accepted placement and harness decision.
- The first machine source file exists in the accepted location.
- The first machine test compiles and passes.
- Required developer documentation is updated.
- Required gates pass.

Do not mark 1.5.1 or any other roadmap item done.

Fourteenth, commit the implementation atomically using the file-based
`commit-message` workflow, push the branch, and open a draft pull request whose
title includes `(1.1.3)`.

## Validation and acceptance

The implementation is accepted when all of the following are true:

- `docs/adr-003-use-xstate-for-workflow-orchestration.md` contains an accepted
  decision for centralized `src/application/machines/` placement or another
  explicitly approved placement.
- ADR 003 records the first model-test harness choice and no longer leaves that
  choice open.
- `src/application/machines/` contains the first minimal machine definition.
- A Bun test imports the first machine and chosen model-test harness, compiles,
  and passes.
- `docs/developers-guide.md` tells developers where machines live and how the
  first model-test harness is exercised.
- `docs/users-guide.md` is either unchanged because behaviour is unchanged, or
  updated if implementation creates player-visible behaviour.
- `docs/roadmap.md` marks only item 1.1.3 as done.
- `make check-fmt`, `make lint`, `make test`, and `bun ff` all succeed.
- Playwright and css-view validation have evidence, or their unavailability is
  recorded with the closest substitute validation.

## Progress

- [x] (2026-05-18T22:25:29Z) Loaded the `leta`, `execplans`,
  `hexagonal-architecture`, `commit-message`, `pr-creation`, and
  `en-gb-oxendict-style` skills relevant to this planning task.
- [x] (2026-05-18T22:25:29Z) Created the Leta workspace for this worktree with
  `leta workspace add`.
- [x] (2026-05-18T22:25:29Z) Confirmed the branch was not `main` and renamed it
  to `1-1-3-record-x-state-machine-collocation-strategy`.
- [x] (2026-05-18T22:25:29Z) Created context pack `pk_udhgv4i2` for agent-team
  planning context.
- [x] (2026-05-18T22:25:29Z) Used a Wyvern agent team for planning research:
  one agent reviewed roadmap and ADR scope, one reviewed source, test, i18n, and
  script patterns, and one reviewed frontend, accessibility, Playwright,
  css-view, and localization constraints.
- [x] (2026-05-18T22:25:29Z) Reviewed the roadmap, ADR 001, ADR 002, ADR 003,
  ADR 005, existing source layout, existing test harnesses, package scripts,
  Makefile, developer guide, and prior ExecPlan structure.
- [x] (2026-05-18T22:25:29Z) Checked current official XState documentation for
  v5 machine and graph/model-test guidance.
- [x] (2026-05-18T22:25:29Z) Drafted this approval-gated ExecPlan.
- [x] (2026-05-18T22:30:56Z) Validated this planning-only branch with focused
  Markdown lint, `make check-fmt`, `make lint`, `make typecheck`, `make test`,
  `bun ff`, and css-view.
- [x] (2026-05-18T22:30:56Z) Built design tokens with `bun tokens:build` after
  the first `bun ff` attempt showed the generated token CSS was absent.
- [x] (2026-05-18T22:30:56Z) Started a temporary validation dev server for e2e
  and css-view because the Rocky/Fedora e2e wrapper requires a reachable server
  at `http://localhost:5173`; stopped that server after validation.
- [x] (2026-05-18T22:30:56Z) Committed this ExecPlan for plan review.
- [x] (2026-05-18T22:30:56Z) Pushed the branch and opened draft pull request
  #7 for plan review.
- [x] (2026-05-20T00:00:00+02:00) Received explicit user approval to proceed
  with implementation of this ExecPlan.
- [ ] Update ADR 003 with the accepted machine placement and model-test harness
  decisions.
- [x] (2026-05-20T00:00:00+02:00) Verified package metadata:
  `xstate` is available at version `5.31.1`, while `@xstate/test` remains at
  version `0.5.1`.
- [x] (2026-05-20T00:00:00+02:00) Updated ADR 003 to accepted status, recorded
  centralized `src/application/machines/` placement, selected XState v5
  `xstate/graph` for the first model-test harness, and closed the 1.1.3
  outstanding decisions.
- [ ] Add the first application-layer XState machine and model-test harness
  coverage.
- [x] (2026-05-20T00:00:00+02:00) Added `xstate@5.31.1` as the only new
  direct dependency for the first machine and graph harness.
- [x] (2026-05-20T00:00:00+02:00) Added `src/application/machines/app.machine.ts`
  with the minimal boot workflow states `booting`, `title`, and `failed`.
- [x] (2026-05-20T00:00:00+02:00) Added `tests/app-machine.test.ts`, using
  `createTestModel` from `xstate/graph` to prove graph-generated reachability
  for the first machine.
- [x] (2026-05-20T00:00:00+02:00) Ran focused typecheck and machine tests. The
  final focused run passed with `3 pass`, `0 fail` for
  `tests/app-machine.test.ts`.
- [ ] Update developer documentation and mark roadmap item 1.1.3 done after the
  success criteria are met.
- [x] (2026-05-20T00:00:00+02:00) Updated `docs/developers-guide.md` with the
  accepted machine placement and `xstate/graph` model-test harness practice.
- [x] (2026-05-20T00:00:00+02:00) Left `docs/users-guide.md` unchanged because
  the implemented change is developer-facing and introduces no player-visible
  behaviour.
- [x] (2026-05-20T00:00:00+02:00) Marked only roadmap item 1.1.3 as done after
  the accepted ADR, first machine source, focused machine test, and developer
  guide update were in place.
- [ ] Run required validation, including `coderabbit review --agent` after each
  major milestone.
- [x] (2026-05-20T00:00:00+02:00) Ran `coderabbit review --agent` after the
  ADR/developer-documentation milestone; it completed with `findings: 0`.
- [x] (2026-05-20T00:00:00+02:00) Ran `coderabbit review --agent` after the
  machine/test milestone; it completed with `findings: 0`.
- [x] (2026-05-20T00:00:00+02:00) Ran a final `coderabbit review --agent`;
  it reported one valid JSDoc concern and one graph-path efficiency concern.
  Both were cleared by adding an `appMachine` actor-lifecycle example and by
  changing the reachability test to target each expected state with
  `getShortestPaths({ toState })`.
- [x] (2026-05-20T00:00:00+02:00) Reran `coderabbit review --agent` after the
  documentation fixes and reachability assertion cleanup; the final review
  completed with `findings: 0`.
- [x] (2026-05-20T00:00:00+02:00) Addressed CodeRabbit's last valid
  reachability assertion concern by asserting that targeted graph path
  generation returns at least one path for each expected state, then reran
  CodeRabbit successfully with `findings: 0`.
- [x] (2026-05-20T00:00:00+02:00) Ran focused Markdown lint for the touched
  documents; the final run passed with no output.
- [x] (2026-05-20T00:00:00+02:00) Ran `make check-fmt`; the first run applied
  Biome formatting to one file, and the second run reported no fixes needed.
- [x] (2026-05-20T00:00:00+02:00) Ran `make lint`, `make typecheck`, and
  `make test`; all passed after correcting Biome export ordering in the new
  barrels. These gates were rerun after the final CodeRabbit cleanups and
  passed again.
- [x] (2026-05-20T00:00:00+02:00) Ran `bun ff`; the first run reached e2e and
  failed because no dev server was reachable at `http://localhost:5173`, then
  later runs passed fully after starting a temporary branch validation server,
  including the final rerun after clearing all CodeRabbit findings.
- [x] (2026-05-20T00:00:00+02:00) Ran css-view against
  `http://127.0.0.1:5173/`; it completed successfully and wrote
  `/tmp/css-view-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.json`.
- [x] (2026-05-22T00:00:00+02:00) Used a Wyvern agent team to verify the
  latest review warnings against the current code. The compile-time machine
  contract warning was still valid, while the observability warning was only
  valid for exposing boundary-safe hooks.
- [x] (2026-05-22T00:00:00+02:00) Added TypeScript compile-time assertions for
  the public app machine event, state, and action contracts.
- [x] (2026-05-22T00:00:00+02:00) Added named XState action IDs for boot
  success, boot failure, and retry events so the app shell can provide logging
  and metrics without importing adapters into `src/application/machines/`.
- [x] (2026-05-22T00:00:00+02:00) Used a scribe agent to update
  `docs/developers-guide.md` with the observability boundary guidance.
- [x] (2026-05-22T00:00:00+02:00) Ran `coderabbit review --agent` for the
  review-fix milestone, fixed each still-valid type-test concern it reported,
  and reran local gates after each change.
- [x] (2026-05-22T00:00:00+02:00) Attempted a final CodeRabbit confirmation
  run after the last fix. CodeRabbit repeatedly returned recoverable
  rate-limit errors, first with a 3 minute 46 second wait and then with a
  5 minute 36 second wait, so final confirmation could not complete in this
  pass.

## Surprises & discoveries

- Observation: The requested reference documents for Tailwind, daisyUI,
  semantic Tailwind, accessibility-first testing, and `docs/v2a-front-end-stack.md`
  are not present in this worktree.
  Evidence: `find docs -maxdepth 1` returned none of the requested filenames.
  Impact: This plan signposts available in-repo substitutes and treats the
  missing documents as a risk for later UI-touching implementation.

- Observation: ADR 003's current outstanding-decision text says the harness uses
  `@xstate/test`, but current XState v5 documentation points model-test and graph
  usage through graph utilities and the `xstate/graph` export.
  Evidence: Official XState docs reviewed during planning.
  Impact: The implementation must update ADR 003 deliberately rather than
  copying stale package wording into new code.

- Observation: `package.json` has no XState dependency yet.
  Evidence: `package.json` dependencies and dev dependencies were reviewed.
  Impact: The future implementation probably needs a dependency change, which
  must be kept narrow and validated through `bun.lock`.

- Observation: The source tree already contains placeholder `src/domain/`,
  `src/application/`, and `src/adapters/` directories from roadmap item 1.1.2.
  Evidence: `leta files` and source inspection show layer index files.
  Impact: The machine directory should extend `src/application/` rather than
  inventing another boundary.

- Observation: Locale metadata lists many supported locales, while only
  `public/locales/en-GB/common.ftl` exists.
  Evidence: `src/app/i18n/supported-locales.ts` and `find public/locales`.
  Impact: The implementation should avoid UI strings; otherwise locale coverage
  becomes a blocker.

- Observation: The first `make test` attempt failed because dependencies were
  not installed, so Bun could not resolve `happy-dom` from the test preload.
  Evidence: `/tmp/test-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out`.
  Impact: `bun install` was required before test gates could run.

- Observation: The first `bun ff` attempt failed before tests because generated
  design tokens were absent.
  Evidence: `/tmp/ff-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.out`
  recorded the missing `../tokens/dist/tokens.css` import.
  Impact: `bun tokens:build` was required before the full gate could run.

- Observation: The Playwright MCP browser was not installed in this environment.
  Evidence: the MCP call reported that `chrome-for-testing` was not installed.
  Impact: Playwright validation evidence came from `bun ff`, whose e2e stage ran
  the repository Playwright test successfully through the container wrapper.
  css-view validation ran separately and wrote
  `/tmp/css-view-vibe-coder-1-1-3-record-x-state-machine-collocation-strategy.json`.

- Observation: XState v5's default graph path generation did not cover both
  sibling boot outcomes in one unconstrained shortest-path call.
  Evidence: the first focused `bun test tests/app-machine.test.ts` run reached
  `booting` and `title`, but not `failed`.
  Impact: The first harness now declares the three accepted events explicitly
  and asks `getShortestPaths` for each expected target state so reachability is
  proven without relying on duplicate path output.

- Observation: CodeRabbit's final review caught a valid documentation gap in
  the first machine module.
  Evidence: `coderabbit review --agent` asked for a JSDoc example showing the
  actor lifecycle.
  Impact: `src/application/machines/app.machine.ts` now includes a file-level
  `@example` that imports `createActor`, starts `appMachine`, sends
  `BOOT_READY`, and observes the `title` state.

- Observation: The final `bun ff` gate required a reachable dev server for
  `scripts/e2e.sh`.
  Evidence: the first `bun ff` run printed
  `ERROR: Dev server not reachable at http://localhost:5173`.
  Impact: A temporary `bun dev -- --host 127.0.0.1 --port 5173` server was
  started only for validation and stopped after `bun ff` and css-view
  completed.

- Observation: The Playwright MCP browser still cannot launch in this
  environment.
  Evidence: `mcp__playwright__.browser_navigate` reported that
  `chrome-for-testing` is not installed.
  Impact: Playwright evidence for this implementation comes from the repository
  e2e stage inside `bun ff`, which passed `tests/e2e/a11y.pw.ts`.

- Observation: Review feedback correctly identified that runtime machine tests
  did not prove compile-time contracts for the public machine event and state
  types.
  Evidence: `tests/app-machine.test.ts` exercised runtime behaviour, but had no
  `@ts-expect-error` assertions or equivalent type-level fixtures.
  Impact: `tests/app-machine.types.test.ts` now makes `bun check:types` fail if
  undeclared events, states, or action IDs become accepted accidentally.

- Observation: The observability warning was partly valid, but the requested
  direct logging implementation would violate the hexagonal boundary.
  Evidence: `appLogger` lives under `src/app/observability/logger.ts`, while
  `src/application/machines/app.machine.ts` belongs to the application layer.
  Impact: The machine now exposes typed action IDs for boot observability. The
  app shell or adapter composition boundary must provide concrete logging or
  metrics implementations.

- Observation: CodeRabbit's follow-up findings against
  `tests/app-machine.types.test.ts` were valid and helped keep the file as a
  compile-time contract test instead of a mixed runtime/type test.
  Evidence: The review asked to remove runtime invalid sends, remove redundant
  runtime fixture assertions, derive actor send types through XState's
  `ActorRefFrom`, add exact union exhaustiveness checks, and move negative
  `@ts-expect-error` assertions into the suite.
  Impact: The type test now uses `expectTypeOf`, exact union checks, and scoped
  negative assertions without sending invalid events at runtime.

- Observation: Final CodeRabbit confirmation is currently blocked by service
  rate limiting.
  Evidence: Two final `coderabbit review --agent` attempts returned recoverable
  rate-limit errors after the requested wait period.
  Impact: Local validation is clean, but the final CodeRabbit clean-result
  confirmation remains unavailable until the external quota recovers.

## Decision Log

- Decision: Draft this plan as implementation-gated rather than making ADR,
  source, dependency, test, or roadmap changes immediately.
  Rationale: The user explicitly required approval before implementation.

- Decision: Treat roadmap item 1.1.3 as more than documentation.
  Rationale: The success criterion includes a first machine test that compiles
  and passes.

- Decision: Prefer centralized machine placement under
  `src/application/machines/` unless implementation uncovers a blocker.
  Rationale: ADR 003, the HLD direction cited by the roadmap, and the developer
  guide already align on application-layer machine ownership.

- Decision: Plan for XState v5 `xstate/graph` as the first maintained harness
  direction, while requiring implementation-time package verification.
  Rationale: Current official XState documentation supersedes ADR 003's older
  `@xstate/test` wording, and the task exists to ratify the harness choice.

- Decision: Keep `docs/users-guide.md` out of the expected implementation scope.
  Rationale: Recording machine placement and adding a minimal test does not
  change player-visible behaviour.

- Decision: Adopt `xstate` version `5.31.1` and do not add `@xstate/test`.
  Rationale: Package metadata and current official documentation support the
  maintained XState v5 graph utility path through `xstate/graph`; adding the
  older test package would preserve stale ADR wording rather than ratify the
  current harness.

- Decision: Add compile-time machine contract tests with TypeScript
  `@ts-expect-error` assertions instead of adding `tsd`.
  Rationale: `tsconfig.json` already includes `tests/`, so `make typecheck`
  enforces these assertions without introducing another dependency or command.

- Decision: Satisfy the observability concern by exporting typed named action
  IDs, not by importing `appLogger` into the machine.
  Rationale: Application machines define orchestration contracts. Concrete
  logging and metrics are adapter concerns and must be provided at the app shell
  or composition boundary.

- Decision: Keep the compile-time machine contract tests in the Bun test tree
  rather than adding a separate type-test runner.
  Rationale: `bun check:types` already enforces `@ts-expect-error` and
  `expectTypeOf` assertions under `tests/`, and avoiding `tsd` keeps the change
  smaller.

## Outcomes & Retrospective

Roadmap item 1.1.3 is implemented. ADR 003 is accepted for this item and now
records centralized `src/application/machines/` placement, XState v5
`xstate/graph` as the first model-test harness, and autopilot as a future
parallel region of `run.machine`.

The first machine lives at `src/application/machines/app.machine.ts`, is
exported through the application layer, and intentionally models only boot
workflow reachability. The first machine test lives at
`tests/app-machine.test.ts` and uses `createTestModel` from `xstate/graph` to
check reachability for `booting`, `title`, and `failed` without adding
simulation state or UI behaviour.

`docs/developers-guide.md` now records the accepted machine placement and graph
harness practice, `docs/roadmap.md` marks only item 1.1.3 as done, and
`docs/users-guide.md` remains unchanged because no player-visible behaviour was
introduced.

All required gates passed after the final CodeRabbit cleanup: `make check-fmt`,
`make lint`, `make typecheck`, `make test`, and `bun ff`. Playwright MCP remains
unavailable because `chrome-for-testing` is not installed, but the repository
Playwright e2e accessibility test passed inside `bun ff`, and css-view
completed successfully against the served app.

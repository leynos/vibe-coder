# Record TypeScript source-tree naming and boundary linting

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: DRAFT

## Purpose / big picture

Roadmap item 1.1.2 closes the naming and enforcement decision that protects the
future simulation core before feature work starts. After this change, a
developer can open ADR 002 and see that the source tree uses
`src/domain/`, `src/application/`, and `src/adapters/` rather than
`src/core/`, and can run the repository lint gates to prove that imports still
respect that dependency direction.

This plan is only the approval draft. Do not implement it until the user has
explicitly approved the plan.

## Constraints

- Do not begin implementation until this ExecPlan is explicitly approved.
- Keep the implementation scoped to roadmap item 1.1.2.
- Use the hexagonal boundary direction from the `hexagonal-architecture` skill:
  dependencies point inward, port interfaces live in the domain, and adapters
  implement ports without becoming another place for business rules.
- Ratify `src/domain/`, `src/application/`, and `src/adapters/` as the
  TypeScript source-tree names. Treat `src/core/` as rejected for this
  repository because ADR 002 and the HLD already favour the explicit domain
  name.
- Keep the chosen layout aligned with
  `docs/vibe-coder-high-level-design.md` section "Module layout".
- Add an executable import-boundary guard. The preferred implementation is a
  small custom TypeScript lint script using the existing TypeScript dependency,
  wired into the current semantic lint pipeline. If Biome gains a local rule
  that expresses the same contract cleanly before implementation begins, the
  implementer may use it instead and must record the change in `Decision Log`.
- Do not add simulation equations, domain value objects, port interfaces,
  adapters, XState machines, Dexie schema, or UI flows. Those are later roadmap
  items.
- Do not add external dependencies. The checker must use repository
  dependencies already present in `package.json`.
- Update `docs/users-guide.md` only if implementation changes player-visible
  behaviour. This item is expected to be developer-facing only.
- Update `docs/developers-guide.md` because this item changes development
  practice and architecture enforcement.
- Update `docs/contents.md` only if a new decision-log document is created and
  should be discoverable from the documentation index.
- Mark only roadmap item 1.1.2 as done, and only after the decision record,
  boundary guard, tests, and required gates pass.
- Keep documentation in en-GB Oxford spelling and grammar.
- Keep every source file at or below 400 lines.
- Do not run format, lint, typecheck, tests, semantic checks, or frontend gates
  in parallel.
- `make check-fmt`, `make lint`, `make test`, and `bun ff` must pass before
  the implementation is committed.
- Use Playwright and css-view validation if an app server and css-view tooling
  are available. Do not start or stop the user-managed development server.

## Tolerances

- Scope: if implementation requires changes outside `docs/`,
  `package.json`, `scripts/`, `tests/`, `tools/`, `biome.jsonc`, `Makefile`, or
  this ExecPlan, stop and ask for approval.
- Size: if the implementation exceeds 450 net lines, stop and split the work or
  ask for review. This should be a decision record plus a narrow lint guard,
  not a source-tree implementation.
- Interface: if a public TypeScript API, route, component prop, locale key, or
  runtime behaviour must change, stop and ask for approval.
- Dependencies: if a new npm, Bun, or system dependency is required, stop and
  ask for approval.
- Boundary policy: if there is disagreement between ADR 002, the HLD module
  layout, and `docs/developers-guide.md`, stop and present the conflicting
  interpretations.
- Validation: if the same required gate fails twice after changes intended to
  fix this item, stop, record the evidence, and ask for direction.
- Browser validation: if Playwright or css-view cannot be used because the
  server or tool is unavailable, record the limitation in
  `Surprises & Discoveries` and continue with the automated non-UI gates.

## Risks

- Risk: Biome may not provide a built-in import-boundary rule that can express
  the repository's hexagonal matrix without extra tooling.
  Severity: medium.
  Likelihood: high.
  Mitigation: Use a custom TypeScript script first, wired into
  `semantic:lint`, while documenting that this is the selected "custom" rule
  strategy allowed by the roadmap.

- Risk: A docs-only reading of 1.1.2 would leave no executable guard, but the
  roadmap success text requires a lint rule that guards the boundary.
  Severity: high.
  Likelihood: medium.
  Mitigation: Treat the implementation as documentation plus a tested lint
  gate, not as documentation alone.

- Risk: Existing barrel files under `src/domain/`, `src/application/`, and
  `src/adapters/` may make the boundary checker look complete before the full
  HLD tree exists.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Check imports by path prefix and leave creation of the full
  directory skeleton to roadmap item 1.2.1.

- Risk: Full `bun ff` may expose unrelated pre-existing failures.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Run gates sequentially with `/tmp` logs and record unrelated
  failures rather than hiding or working around them.

- Risk: The request references frontend and accessibility documents that are
  absent from this worktree.
  Severity: low.
  Likelihood: high.
  Mitigation: Record the missing references and rely on available project
  sources: HLD, ADRs, roadmap, developer guide, user guide, design-system HTML,
  and existing test/lint scripts. UI-specific localisation and WCAG acceptance
  remain non-applicable unless implementation touches UI.

## Progress

- [x] (2026-05-09T12:50:51Z) Loaded `execplans`, `leta`, and
  `hexagonal-architecture` skills.
- [x] (2026-05-09T12:50:51Z) Confirmed the branch is
  `feat/plan-source-tree-naming`, not the main branch.
- [x] (2026-05-09T12:50:51Z) Used a Wyvern agent team for planning research:
  one agent reviewed roadmap and ADR sources, one reviewed source/config/test
  shape, and one reviewed frontend/localisation/accessibility constraints.
- [x] (2026-05-09T12:50:51Z) Reviewed the roadmap, ADR 002, HLD module layout,
  developer guide boundary table, package scripts, Makefile, Biome config, and
  semantic lint tooling.
- [x] (2026-05-09T12:50:51Z) Drafted this approval-gated ExecPlan.
- [x] (2026-05-09T12:55:12Z) Validated this ExecPlan with
  `bunx markdownlint-cli
  "docs/execplans/1-1-2-record-the-type-script-source-tree-naming.md"`.
- [x] (2026-05-09T12:55:12Z) Ran plan-creation gates:
  `make check-fmt`, `make lint`, `make typecheck`, and `make test`.
- [ ] Await explicit user approval before implementation.
- [ ] Implement the approved decision record, lint guard, tests, and
  documentation updates.
- [ ] Run required validation gates sequentially.
- [ ] Commit the completed implementation after gates pass.

## Surprises & discoveries

- Observation: `docs/v2a-front-end-stack.md` and the requested Tailwind,
  daisyUI, localisation, and accessibility reference documents are not present
  in this worktree.
  Evidence: Wyvern planning review and the existing 1.1.1 ExecPlan both list
  these documents as absent.
  Impact: This plan treats those UI-specific sources as unavailable for 1.1.2.
  Because 1.1.2 is an architecture/lint task with no UI behaviour change,
  locale additions, card model data, and WCAG component tests are not part of
  the implementation unless the approved approach later touches UI.

- Observation: `src/domain/index.ts`, `src/application/index.ts`, and
  `src/adapters/index.ts` already exist as barrels.
  Evidence: Wyvern source/config review found the three boundary directories
  already present.
  Impact: The implementation should not create the full HLD tree in 1.1.2; it
  should document the naming decision and enforce the boundary for existing and
  future files.

- Observation: Biome is already extended with many Grit plugins, but no
  import-boundary check exists.
  Evidence: `biome.jsonc` lists accessibility, semantic class, DaisyUI, and
  testing rules, while `package.json` has semantic lint scripts but no
  `lint:imports`.
  Impact: The lowest-risk enforcement route is a custom TypeScript script
  integrated into `semantic:lint`.

- Observation: Full-repository Markdown linting currently fails on pre-existing
  documents unrelated to this plan.
  Evidence: `bunx markdownlint-cli "*.md" "docs/**/*.md"` reports existing
  line-length, table-alignment, multiple-H1, and trailing-space findings in
  ADRs, `docs/users-guide.md`, and `docs/vibe-coder-high-level-design.md`.
  Impact: The plan file was linted directly and passed. The later
  implementation should still run full Markdown linting, but pre-existing
  repository-wide failures may require separate remediation or user direction.

- Observation: `make test` needs write-capable execution in this sandbox for
  Bun snapshot access.
  Evidence: The first run after installing dependencies failed to open the
  checked-in route-tree snapshot file; the elevated run passed with 41 tests,
  0 failures, and 2 snapshots.
  Impact: Future test runs in this environment may need the same permission
  path even when source changes are unrelated to snapshots.

## Decision Log

- Decision: Draft 1.1.2 as a documentation plus executable lint-guard change,
  not as a documentation-only change.
  Rationale: The roadmap success criterion explicitly requires a boundary lint
  rule, and the developer guide already promises import-boundary lint once
  roadmap step 1.1.2 is complete.
  Date/Author: 2026-05-09T12:50:51Z / Codex.

- Decision: Prefer `src/domain/`, `src/application/`, and `src/adapters/`, and
  reject `src/core/`.
  Rationale: ADR 002's outstanding-decision text already sets aside `core/`,
  and the HLD module layout names `domain/`, `application/`, and `adapters/`.
  Date/Author: 2026-05-09T12:50:51Z / Codex.

- Decision: Prefer a custom TypeScript lint script for import-boundary
  enforcement.
  Rationale: The repository already has custom semantic lint scripts, Biome is
  not currently configured for import-boundary policy, and the roadmap allows
  either Biome or a custom rule.
  Date/Author: 2026-05-09T12:50:51Z / Codex.

## Outcomes & retrospective

No implementation has been performed yet. This draft should be reviewed and
approved or revised before any code, documentation decision, roadmap, or lint
configuration changes are made.

## Context and orientation

The roadmap entry lives in `docs/roadmap.md` under "1. Foundational contracts
and build spine", step 1.1, task 1.1.2. It asks the project to record the
TypeScript source-tree naming choice and import-boundary lint strategy. The
success text requires the chosen layout to match the HLD module map and a
Biome or custom lint rule to guard the boundary.

ADR 002 is
`docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`. It
adopts hexagonal architecture for Vibe Coder and already says the source tree
uses `domain/`, `application/`, and `adapters/`, with `core/` set aside. It
also says import-boundary lint rules will be enforced via Biome or a custom
TypeScript rule once the scaffold exists.

The HLD is `docs/vibe-coder-high-level-design.md`. Its "Module layout" section
names the intended tree under `src/`, including:

```plaintext
src/domain/
src/application/
src/adapters/
src/optimisation/
src/data/
```

The developer guide is `docs/developers-guide.md`. Its "The three domain
layers" section gives the import matrix:

```plaintext
adapters  ->  application  ->  domain
                           ^
                     (ports defined here)
```

In plain language, `domain` is the pure simulation and policy layer,
`application` orchestrates use cases and state machines, and `adapters`
connect browser, persistence, rendering, audio, and tooling infrastructure to
the inner layers. Domain code must not import React, Dexie, Web Audio, browser
APIs, app shell code, application code, or adapter code. Application code must
not import adapters or app shell code. Adapters may import domain and
application code.

The current repository has `src/domain/index.ts`,
`src/application/index.ts`, and `src/adapters/index.ts`, but not the full HLD
tree. `package.json` contains `semantic:lint`, `lint:classlist`,
`lint:class-duplicates`, and `lint:hardcoded-strings`. `Makefile` exposes
`make check-fmt`, `make typecheck`, `make lint`, and `make test`. `biome.jsonc`
contains many Grit plugin rules but no import-boundary enforcement.

Relevant skills and documents for implementation:

- `execplans`, for maintaining this living plan.
- `hexagonal-architecture`, for protecting inward dependency direction.
- `leta`, for source navigation if code inspection becomes necessary.
- `biome-typescript`, if the implementer decides to express the guard through
  Biome rather than the custom script route.
- `commit-message`, for file-based commit messages after validation.
- `pr-creation` and `en-gb-oxendict-style`, if a pull request is requested.
- `AGENTS.md`.
- `docs/roadmap.md`.
- `docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`.
- `docs/vibe-coder-high-level-design.md`.
- `docs/developers-guide.md`.
- `docs/users-guide.md`.
- `docs/contents.md`.

## Plan of work

Stage A is approval and preflight. Confirm explicit approval from the user
before changing files beyond this ExecPlan. Re-run `git branch --show-current`
and ensure the branch is not `main`. Run `git status --short` and note any
pre-existing changes in this ExecPlan before editing. If unrelated dirty files
exist, leave them alone.

Stage B records the decision. Edit
`docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md` to add an
accepted amendment or decision-log entry near "Decision outcome / proposed
direction" or before "Outstanding decisions". The entry must state:

```plaintext
TypeScript source-tree naming: use `src/domain/`, `src/application/`, and
`src/adapters/`.
Rejected naming: do not use `src/core/` for the domain core.
Import-boundary guard: enforce the developer-guide import matrix through a
custom TypeScript lint script wired into the semantic lint pipeline, unless a
Biome-native local rule is available before implementation.
```

Then edit ADR 002's "Outstanding decisions" section so the source-tree naming
and lint-strategy bullets are no longer open questions. Leave the optimization
tooling location question open because it belongs to a later decision.

Stage C updates developer documentation. Edit `docs/developers-guide.md` in
the "The three domain layers" area so it no longer says the boundary will be
caught once lint is configured. Instead, point developers at the concrete
script and command that enforce the boundary after Stage D. If a separate
decision-log file is created rather than an ADR 002 amendment, add it to
`docs/contents.md`. The preferred path is to amend ADR 002 directly so the
decision stays with the architecture record and `docs/contents.md` does not
need to change.

Stage D implements the import-boundary guard. Add
`scripts/lint-import-boundaries.ts`. The script should use the TypeScript
compiler API to parse `.ts` and `.tsx` files under `src/`, inspect static
`import` declarations and `export ... from` declarations, resolve relative
paths to repository paths, and report violations with file path, imported
module, and the violated rule. It should not execute or typecheck source code.

The checker must enforce these minimum rules:

- Files under `src/domain/` must not import from `src/application/`,
  `src/adapters/`, `src/app/`, React, React DOM, Dexie, Web Audio, browser
  storage APIs, service-worker APIs, or rendering adapters.
- Files under `src/application/` must not import from `src/adapters/` or
  `src/app/`, and must not import React DOM or Dexie.
- Files under `src/adapters/` may import from `src/domain/` and
  `src/application/`.
- Files under `src/app/` may import from all layers, but must not become a
  place for business rules. The checker should only enforce import direction
  here; business-rule detection remains a code-review and later semantic-lint
  concern.

Keep the script small and testable. Prefer pure helper functions such as
`classifySourcePath`, `classifyImportTarget`, and `findBoundaryViolations`, and
make the CLI wrapper call those helpers. If the helper surface starts to exceed
the 400-line file limit or becomes hard to test, split the implementation into
`scripts/import-boundaries.ts` for pure logic and
`scripts/lint-import-boundaries.ts` for the CLI wrapper.

Stage E wires the gate. Edit `package.json` to add:

```json
"lint:imports": "bun run scripts/lint-import-boundaries.ts"
```

Then include `bun run lint:imports` in `semantic:lint` after the Biome pass and
before class-list or hardcoded-string checks. Do not add it to `make lint`
unless explicitly approved; `make lint` currently maps to `bun lint`, while
`bun ff` already runs the semantic suite through `test:all`.

Stage F tests the checker. Add focused `bun:test` coverage under `tests/`, for
example `tests/import-boundaries.test.ts`. The tests should call exported pure
helpers rather than spawning a subprocess for every case. Cover:

- Happy path: `domain` importing another domain file is allowed.
- Happy path: `application` importing domain is allowed.
- Happy path: `adapters` importing application or domain is allowed.
- Happy path: `app` importing adapters, application, or domain is allowed.
- Unhappy path: `domain` importing application is rejected.
- Unhappy path: `domain` importing adapters is rejected.
- Unhappy path: `application` importing adapters is rejected.
- Edge path: `export ... from` re-exports are checked, not just imports.
- Edge path: relative imports that climb directories still resolve to the
  correct source layer.

Property testing with `fast-check` is not required because this item does not
introduce a range-sensitive business invariant and `fast-check` is not
currently listed in `package.json`. A formal proof is not required because the
change does not introduce a business axiom or simulation contract.

Behavioural Gherkin tests are not required for this item because no
externally-observable user workflow changes. End-to-end tests are not required
for the same reason. If the implementation touches UI despite this plan, stop
and revise the plan to include localisation, accessibility, Playwright, and
Gherkin coverage before proceeding.

Stage G updates roadmap state. Mark only item 1.1.2 in `docs/roadmap.md` as
`[x]` after ADR 002 and the executable guard are complete and validated. Do
not mark 1.2.1 or any later item done; creating the full source skeleton is
separate work.

Stage H validates, commits, and records outcomes. Run all gates listed below
sequentially, capture logs under `/tmp`, update this ExecPlan with results,
then commit the implementation if every required gate passes. After committing,
review the changed files for refactoring needs. If a refactor is genuinely
needed, perform it as a separate approved atomic change.

## Concrete steps

All commands run from:

```sh
/home/leynos/.lody/repos/github---leynos---vibe-coder/worktrees/ff85353c-f398-451c-a803-18fcd81a432f
```

Preflight:

```sh
git branch --show-current
git status --short
```

Expected branch output:

```plaintext
feat/plan-source-tree-naming
```

After approval, edit the files named in `Plan of work` using small patches.
Run the new focused checker directly while developing:

```sh
bun run lint:imports 2>&1 | tee /tmp/imports-vibe-coder-feat-plan-source-tree-naming.out
```

Expected successful output should be either empty plus exit code 0 or a short
success message. Any violation output must include the source file and the
disallowed import.

Run the focused tests:

```sh
bun test tests/import-boundaries.test.ts 2>&1 | tee /tmp/test-imports-vibe-coder-feat-plan-source-tree-naming.out
```

Expected output includes the new test file and no failures.

Then run the required gates sequentially:

```sh
make check-fmt 2>&1 | tee /tmp/check-fmt-vibe-coder-feat-plan-source-tree-naming.out
make lint 2>&1 | tee /tmp/lint-vibe-coder-feat-plan-source-tree-naming.out
make test 2>&1 | tee /tmp/test-vibe-coder-feat-plan-source-tree-naming.out
bun semantic 2>&1 | tee /tmp/semantic-vibe-coder-feat-plan-source-tree-naming.out
bun ff 2>&1 | tee /tmp/ff-vibe-coder-feat-plan-source-tree-naming.out
```

Run typechecking as an additional repository health gate because the change
adds TypeScript tooling:

```sh
make typecheck 2>&1 | tee /tmp/typecheck-vibe-coder-feat-plan-source-tree-naming.out
```

For documentation validation, run:

```sh
bunx markdownlint-cli "*.md" "docs/**/*.md" 2>&1 | tee /tmp/markdownlint-vibe-coder-feat-plan-source-tree-naming.out
bunx nixie 2>&1 | tee /tmp/nixie-vibe-coder-feat-plan-source-tree-naming.out
```

For Playwright validation, do not start or stop the development server. If a
server is already available, navigate to it with the Playwright MCP, capture a
full-page screenshot, and confirm the page still renders. Because this item
does not intentionally change UI, compare against current expectations rather
than approving any visual change.

For css-view validation, use the available css-view command or MCP tool if it
exists in the environment. Confirm that the implementation introduced no UI
class changes. If css-view is unavailable, record that limitation in
`Surprises & Discoveries`.

After all gates pass, commit using the repository's file-based commit-message
workflow. A suitable subject is:

```plaintext
Record source-tree boundary decision
```

## Validation and acceptance

Acceptance is met when all of these are true:

- ADR 002 records `src/domain/`, `src/application/`, and `src/adapters/` as the
  accepted source-tree names and records `src/core/` as rejected.
- ADR 002 names the import-boundary lint strategy and no longer lists the
  source-tree naming or boundary-lint strategy as open questions.
- `docs/developers-guide.md` tells developers how the boundary is enforced.
- `package.json` exposes `lint:imports`, and `semantic:lint` runs it.
- The checker rejects at least `domain -> application`,
  `domain -> adapters`, and `application -> adapters` imports.
- Focused `bun:test` coverage proves allowed and forbidden import cases.
- `docs/roadmap.md` marks only 1.1.2 as done.
- `docs/users-guide.md` is unchanged unless the approved implementation
  unexpectedly changes user-visible behaviour.
- `make check-fmt`, `make lint`, `make test`, `make typecheck`,
  `bun semantic`, and `bun ff` pass.
- Markdown linting and Mermaid validation pass, or any unavailable tool/failure
  is recorded with evidence and explicit user direction.
- Playwright and css-view validation are performed when the required server and
  tool are available, or their unavailability is recorded.

The expected observable behaviour is developer-facing: creating a forbidden
import from a `src/domain/` file to `src/adapters/` and running
`bun run lint:imports` reports a violation and exits non-zero. Removing the
forbidden import makes the command pass.

## Idempotence and recovery

The documentation edits are idempotent: if a patch is partially applied, inspect
the relevant headings and re-apply only the missing paragraphs. Do not duplicate
decision-log entries.

The import-boundary checker should be deterministic and side-effect free. It
must not write files while scanning. It can be run repeatedly without changing
the working tree.

If formatting changes too much Markdown, review the diff before committing and
keep only formatting that belongs to files touched by this item unless the
format command legitimately updates repository-managed formatting. Do not
revert unrelated user changes.

If `bun ff` fails for an unrelated pre-existing reason, preserve the log under
`/tmp`, update `Surprises & Discoveries`, and ask for direction before
committing.

## Artifacts and notes

Wyvern planning reports contributed these findings:

- The roadmap entry for 1.1.2 is currently unchecked and requires both naming
  and a boundary lint rule.
- ADR 002 and the HLD already align on `domain/`, `application/`, and
  `adapters/`.
- The developer guide already documents the intended import matrix and says
  boundary linting is pending 1.1.2.
- The current source tree has only shallow boundary barrels for the three
  layers.
- Existing lint infrastructure favours custom scripts and semantic lint wiring.
- Missing frontend reference documents make UI-specific localisation and WCAG
  implementation constraints non-applicable unless UI is touched.

## Interfaces and dependencies

The preferred script interface is:

```typescript
export type SourceLayer = "domain" | "application" | "adapters" | "app" | "other";

export type BoundaryViolation = {
  readonly sourcePath: string;
  readonly importPath: string;
  readonly message: string;
};

export function classifySourcePath(path: string): SourceLayer;

export function findBoundaryViolations(
  files: ReadonlyArray<{
    readonly path: string;
    readonly sourceText: string;
  }>,
): ReadonlyArray<BoundaryViolation>;
```

The CLI entry point should exit with code 0 when no violations are found and
code 1 when one or more violations are found. Unexpected filesystem or parser
errors should also exit non-zero with a clear message.

Revision note: Initial draft created for approval. The plan records the chosen
source-tree naming, proposes the executable lint strategy, and keeps
implementation blocked until explicit user approval.

Revision note: Added plan-validation evidence after running Markdown lint for
this file plus `make check-fmt`, `make lint`, `make typecheck`, and
`make test`. This does not approve implementation; it only records the state of
the draft plan.

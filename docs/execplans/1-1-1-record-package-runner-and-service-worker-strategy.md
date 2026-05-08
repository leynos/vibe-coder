# Record package runner and service-worker strategy

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: DRAFT

## Purpose / big picture

Roadmap item 1.1.1 closes two early build-spine questions before the domain
core and adapter skeleton are implemented. After this change, a developer can
open `docs/adr-001-build-an-offline-first-react-pwa.md` and see that Bun is
the accepted package runner, and that the first service-worker strategy is
settled. `docs/roadmap.md` then marks item 1.1.1 as done because ADR 001 no
longer leaves those choices open.

This is a documentation and decision-record change. It must not implement the
service worker, add Vite PWA dependencies, alter runtime behaviour, or start
feature work before the plan is approved.

## Constraints

- Do not begin implementation until this ExecPlan is explicitly approved.
- Keep the implementation scoped to roadmap item 1.1.1.
- Record the package runner as Bun. The repository already uses Bun in
  `package.json`, `Makefile`, and `docs/developers-guide.md`.
- Record the first service-worker strategy in ADR 001. The planned decision is
  to use the Vite PWA plugin for the initial app-shell precache and
  installability path, while reserving a custom worker for later behaviour that
  the plugin cannot express cleanly.
- Leave no unresolved ADR 001 outstanding-decision bullet for the package
  runner or service-worker strategy.
- Treat ADR 001's current import/export save-format bullet as out of scope for
  1.1.1 unless its presence keeps ADR 001 from satisfying the roadmap success
  text. If it must move, relocate it by cross-reference to the persistence
  decision record rather than deciding it silently.
- Preserve the hexagonal boundary direction from the `hexagonal-architecture`
  skill: domain policy remains independent of React, Vite, service-worker APIs,
  Dexie, and browser infrastructure.
- Update `docs/users-guide.md` only if the implementation changes user-visible
  installability, offline, update, or save/export behaviour. For this
  decision-record task, no user-facing behaviour is expected to change.
- Update `docs/developers-guide.md` only if the accepted ADR wording adds
  developer-facing practice that is not already documented there.
- Do not add dependencies or modify source code in `src/` or `tests/` as part
  of this item. If implementation requires dependency or source changes, stop
  and ask for approval because that would exceed the decision-record scope.
- Documentation must use en-GB Oxford spelling and grammar.
- Any later implementation that does touch UI strings or card model data must
  keep strings translatable and provide locale coverage for supported locales,
  including RTL handling. This plan notes that the repository currently exposes
  many locale codes in `src/app/i18n/supported-locales.ts` but only has
  `public/locales/en-GB/common.ftl` checked in.
- The final branch must be named
  `1-1-1-record-package-runner-and-service-worker-strategy`, pushed, and opened
  as a draft pull request whose title includes `(1.1.1)`.

## Tolerances (exception triggers)

- Scope: if implementation requires changes outside `docs/adr-001-*.md`,
  `docs/roadmap.md`, `docs/developers-guide.md`, `docs/users-guide.md`,
  `docs/contents.md`, or this ExecPlan, stop and explain why.
- Size: if the documentation patch exceeds 250 net lines, stop and split or ask
  for review. This should be a short ADR amendment, not a broad rewrite.
- Interface: if any package script, public TypeScript API, route, component,
  locale contract, or build command must change, stop and ask for approval.
- Dependencies: if `@vite-pwa/*`, `vite-plugin-pwa`, Workbox, or any other
  dependency must be added during item 1.1.1, stop and ask for approval.
- Ambiguity: if "no open question remains in ADR 001" is interpreted as
  requiring the import/export save-format policy to be decided now, stop and
  present options. The bounded default is to move that unresolved question to
  the persistence ADR or a later roadmap item, not to decide it here.
- Validation: if any required gate fails twice for reasons unrelated to this
  documentation change, stop and record the failure evidence before asking for
  direction.
- Browser validation: if Playwright, css-view, or the dev server is unavailable,
  record the unavailable tool and run the closest automated replacement. Do not
  mark browser validation as passed without evidence.

## Risks

- Risk: The roadmap success text says no open question remains in ADR 001, but
  ADR 001 currently has an import/export save-format outstanding decision that
  is not part of item 1.1.1.
  Severity: medium.
  Likelihood: high.
  Mitigation: Treat package-runner and service-worker closure as mandatory, then
  either move the import/export question to ADR 004 with a cross-reference or
  escalate before deciding it.

- Risk: Choosing the Vite PWA plugin in documentation before adding the plugin
  could be mistaken for a completed PWA implementation.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Phrase ADR 001 as a strategy decision for the first
  implementation, not as evidence that installability hardening has landed.

- Risk: The request references several frontend reference documents that are
  not present in this worktree.
  Severity: low.
  Likelihood: high.
  Mitigation: Record the missing references in `Surprises & Discoveries` and
  rely on the available HLD, ADRs, developer guide, users guide, and in-game
  design-system documents.

- Risk: Running the full `bun ff` gate may expose pre-existing failures
  unrelated to a docs-only change.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Run the required gates sequentially, preserve `/tmp` logs, and
  stop if unrelated failures need product or infrastructure decisions.

## Repository context

The roadmap entry lives in `docs/roadmap.md` under "1. Foundational contracts
and build spine", step 1.1, task 1.1.1. It requires a short ADR amendment or
decision log entry for the package runner and service-worker strategy.

ADR 001 is `docs/adr-001-build-an-offline-first-react-pwa.md`. Its
"Outstanding decisions" section currently asks the project to choose the
package runner and choose between Workbox, Vite PWA tooling, or a custom worker.
It also contains the import/export save-format question that must not be
decided accidentally.

The high-level design in `docs/vibe-coder-high-level-design.md` names
React 19, TypeScript, Vite/Bun, and an offline-first PWA build path. The
developer guide already identifies Bun as package runner, bundler, and test
runner. The users guide describes offline progress and player-facing behaviour,
but this task should not alter that behaviour.

Relevant skills for implementation:

- `execplans`, for maintaining this living plan.
- `hexagonal-architecture`, for keeping service-worker and build tooling out of
  the domain core.
- `leta`, for source navigation if code inspection becomes necessary.
- `commit-message`, for the file-based commit message workflow.
- `pr-creation`, with `en-gb-oxendict-style`, for the draft pull request.

Relevant local documents:

- `AGENTS.md`
- `docs/roadmap.md`
- `docs/adr-001-build-an-offline-first-react-pwa.md`
- `docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
- `docs/adr-003-use-xstate-for-workflow-orchestration.md`
- `docs/adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md`
- `docs/adr-005-use-deterministic-simulation-and-parameter-packs.md`
- `docs/vibe-coder-high-level-design.md`
- `docs/developers-guide.md`
- `docs/users-guide.md`
- `docs/contents.md`
- `docs/in-game-design-system.html`
- `docs/vibe-coder-game-hud-mockup.html`

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

First, confirm the working branch is not `main` with
`git branch --show-current`. If the branch has not already been renamed, rename
it to `1-1-1-record-package-runner-and-service-worker-strategy` before the
first commit.

Second, edit `docs/adr-001-build-an-offline-first-react-pwa.md`. Add a short
accepted amendment or decision-log section below the existing decision outcome
or before "Outstanding decisions". The amendment must say:

```plaintext
Package runner: Bun.
Initial service-worker strategy: Vite PWA plugin for app-shell precache,
manifest integration, installability checks, and standard update handling.
Custom service-worker code remains a later extension only where explicit
runtime behaviour cannot be represented through the plugin configuration.
```

The wording must explain why this fits the repository: Bun is already the
toolchain spine, Vite is already the app build spine, and plugin-managed PWA
behaviour reduces bespoke worker maintenance while preserving a later escape
hatch.

Third, update ADR 001's "Outstanding decisions" section. Remove or rewrite the
package-runner and service-worker bullets so they are no longer open questions.
If the import/export save-format bullet remains in ADR 001, decide whether this
violates the roadmap success criterion. The preferred bounded action is to move
that bullet to ADR 004 or replace it with a cross-reference such as:

```plaintext
Import/export save format and compatibility policy are tracked by ADR 004 and
the persistence roadmap work, not by this PWA build-spine decision.
```

If this feels like a substantive decision rather than a relocation, stop and
ask for approval.

Fourth, update `docs/developers-guide.md` only if ADR 001 adds information that
developers need during day-to-day work. If changed, keep the update short and
point readers to ADR 001 rather than duplicating the full rationale.

Fifth, leave `docs/users-guide.md` unchanged unless implementation changes
player-visible offline, installability, or update behaviour. A decision record
alone should not require a user-guide update.

Sixth, mark roadmap item 1.1.1 as done only after the ADR amendment exists and
ADR 001 no longer contains the package-runner or service-worker open questions.
Use `[x]` for the item in `docs/roadmap.md`. Do not mark any other roadmap item
done.

Seventh, update this ExecPlan's living sections with the actual files changed,
commands run, and any surprises. Keep the status as `IN PROGRESS` during
implementation and `COMPLETE` only after the branch is committed and the draft
PR exists.

## Validation plan

Run validation sequentially and write long outputs to `/tmp` using `tee`. Do
not run format, lint, typecheck, tests, or frontend gates in parallel.

For the docs-only implementation, run:

```sh
make check-fmt 2>&1 | tee /tmp/check-fmt-vibe-coder-1-1-1-record-package-runner-and-service-worker-strategy.out
make lint 2>&1 | tee /tmp/lint-vibe-coder-1-1-1-record-package-runner-and-service-worker-strategy.out
make test 2>&1 | tee /tmp/test-vibe-coder-1-1-1-record-package-runner-and-service-worker-strategy.out
```

Also run the non-negotiable full frontend gate:

```sh
bun ff 2>&1 | tee /tmp/ff-vibe-coder-1-1-1-record-package-runner-and-service-worker-strategy.out
```

Because the change is documentation-only, Playwright and css-view should not
discover a visual or semantic-class change. If a dev server is already running,
use Playwright to navigate to the app, capture a screenshot, and verify that the
page still renders. Use css-view if available to inspect that no semantic-class
regression was introduced. If no server or css-view tool is available, record
that evidence and do not start or stop a user-managed dev server.

If Markdown-only checks are available locally, also run:

```sh
bunx markdownlint-cli "*.md" "docs/**/*.md" 2>&1 | tee /tmp/markdownlint-vibe-coder-1-1-1-record-package-runner-and-service-worker-strategy.out
bunx nixie 2>&1 | tee /tmp/nixie-vibe-coder-1-1-1-record-package-runner-and-service-worker-strategy.out
```

Expected results:

```plaintext
make check-fmt exits 0.
make lint exits 0.
make test exits 0.
bun ff exits 0.
Any Markdown or Mermaid checks that are run exit 0.
```

## Commit and pull request plan

After validation passes, inspect the diff with `git diff` and
`git status --short`. Stage only the files changed for this task. Use the
`commit-message` skill workflow: write the commit message to a file in a
`mktemp -d` directory and commit with `git commit -F`.

Use a commit subject such as:

```plaintext
Plan package runner and service-worker decision
```

Push the renamed branch to
`origin/1-1-1-record-package-runner-and-service-worker-strategy` and set
upstream tracking. Open a draft pull request against the repository default
branch. The pull request title must include `(1.1.1)`, for example:

```plaintext
Record package runner and service-worker strategy (1.1.1)
```

The pull request description must link this ExecPlan:
`docs/execplans/1-1-1-record-package-runner-and-service-worker-strategy.md`.
It must state that the plan is pre-implementation and requires approval before
ADR 001 is changed.

## Progress

- [x] 2026-05-08: Loaded `execplans`, `hexagonal-architecture`, `leta`,
  `commit-message`, `pr-creation`, and `en-gb-oxendict-style` instructions.
- [x] 2026-05-08: Confirmed current branch
  `feat/plan-bun-sw-decision` is not `main`.
- [x] 2026-05-08: Reviewed roadmap item 1.1.1, ADR 001, ADR 002, ADR 003,
  ADR 005, the HLD, the developer guide, the users guide, and available repo
  scripts.
- [x] 2026-05-08: Used a Wyvern sidecar agent to review the same planning
  scope and surface risks.
- [x] 2026-05-08: Created this draft ExecPlan.
- [x] 2026-05-08: Renamed the branch to
  `1-1-1-record-package-runner-and-service-worker-strategy`.
- [x] 2026-05-08: Validated the ExecPlan-only change with `make check-fmt`,
  `make lint`, `make test`, `bunx nixie`, isolated ExecPlan Markdown lint, and
  `bun ff`.
- [x] 2026-05-08: Committed the ExecPlan in commit
  `2e43951b14dfe6e095839f65df26a414953066ca`.
- [x] 2026-05-08: Pushed the branch and opened draft PR
  <https://github.com/leynos/vibe-coder/pull/2>.
- [ ] Await explicit approval before implementation.

## Surprises & Discoveries

- 2026-05-08: `docs/execplans/` did not exist before this plan and had to be
  created.
- 2026-05-08: The requested `docs/v2a-front-end-stack.md` and several named
  frontend reference documents are not present in this worktree.
- 2026-05-08: `docs/documentation-style-guide.md` is referenced by
  `AGENTS.md`, but is not present in this worktree.
- 2026-05-08: Only `public/locales/en-GB/common.ftl` is checked in, while
  `src/app/i18n/supported-locales.ts` lists many supported locale codes.
- 2026-05-08: `css-view` is not available as a shell command in this
  environment, and no css-view MCP tool was discovered.
- 2026-05-08: The first `make test` run failed because dependencies were not
  installed. `bun install` restored `node_modules`, and the rerun passed.
- 2026-05-08: The first `bun ff` run failed before tests because generated
  design tokens were missing. `bun tokens:build` generated the required token
  output, and the rerun progressed.
- 2026-05-08: `bun ff` then failed at `bun test:e2e` because no dev server was
  reachable at `http://localhost:5173`. A temporary `bun dev` server was
  started for validation, `bun ff` passed, and the server was stopped.
- 2026-05-08: Direct Playwright MCP screenshot validation could not run because
  `chrome-for-testing` is not installed for the MCP browser. The Playwright e2e
  accessibility test did run through `bun ff` and passed.
- 2026-05-08: Repo-wide Markdown lint fails on pre-existing documentation
  issues outside this ExecPlan. Isolated Markdown lint for this ExecPlan passes.

## Decision Log

- 2026-05-08: Use ADR 001 amendment as the implementation target rather than
  creating a new decision-log document. Rationale: the roadmap explicitly names
  ADR 001, and no repository-standard decision log exists.
- 2026-05-08: Propose Vite PWA plugin as the first service-worker strategy in
  the plan. Rationale: it matches Vite, keeps app-shell precaching and update
  behaviour close to the build spine, and avoids a bespoke worker before the
  first playable slice proves the offline contract.
- 2026-05-08: Treat import/export save-format closure as a scoped ambiguity.
  Rationale: ADR 001 contains that outstanding decision, but roadmap item 1.1.1
  only asks for Bun and service-worker choices. The implementation should move
  or cross-reference the question rather than silently decide it.

- 2026-05-08: Accept direct Playwright MCP screenshot validation as unavailable
  for this plan-only branch because the MCP browser is not installed. Rationale:
  the full `bun ff` gate still ran the Playwright e2e accessibility test against
  a running dev server and passed.

## Outcomes & Retrospective

Pending. This section must be completed after implementation and validation.

Planning outcome: the pre-implementation ExecPlan is drafted, validated,
committed, pushed, and available for approval in draft PR
<https://github.com/leynos/vibe-coder/pull/2>. Implementation has not started.

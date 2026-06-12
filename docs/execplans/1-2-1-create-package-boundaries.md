# Create the hexagonal source-tree skeleton (1.2.1)

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: PR PREPARATION IN PROGRESS

## Purpose / big picture

Roadmap item 1.2.1 turns the boundary decisions ratified in 1.1.2 into a
compilable, navigable directory tree. After this change, a developer can open
`src/domain/`, `src/application/`, and `src/adapters/` and see the
subdirectories the HLD module-layout section names; can import from any of the
three layers through stable path aliases (`@domain/...`, `@application/...`,
`@adapters/...`); and can demonstrate that a forbidden cross-layer import is
rejected by both the existing custom guard and a Biome `noRestrictedImports`
override, exiting non-zero from `bun lint` / `bun semantic`. No domain types,
ports, simulation rules, persistence code, machines, or UI flows are added.
Those arrive in later roadmap items (1.2.2, 1.2.3, 1.3.x, 1.4.x, 1.5.x).

The user-visible outcome is small but consequential: every later vertical
slice can converge on one coherent import graph instead of debating where
`@adapters/persistence/dexie-game-state-repository.ts` should live and which
tool catches a violation.

This plan is the approval draft. Do not implement it until the user has
explicitly approved it.

## Constraints

- Do not begin implementation until this ExecPlan is explicitly approved.
- Keep the implementation scoped to roadmap item 1.2.1.
- Honour the hexagonal direction from the `hexagonal-architecture` skill:
  dependencies point inward, port interfaces stay in the domain, and adapters
  never become a place for business rules.
- Mirror the directory tree in `docs/vibe-coder-high-level-design.md`
  section "Module layout", but only for the three layers in scope:
  - `src/domain/{model,services,rules,ports}/`
  - `src/application/{machines,commands,selectors}/` (`machines/` already
    exists)
  - `src/adapters/{persistence,rng,audio,render,assets}/`
  Do not create `src/optimisation/` or `src/data/`. ADR 002 keeps the
  optimisation-tooling location as an open question, and `src/data/` belongs
  to later parameter-pack and registry work (1.3.2 onward). The plan
  explicitly defers them.
- Do not create `src/app/` subdirectories that do not already exist. `app/`
  is the inbound-adapter shell; its tree was settled before 1.2.1.
- Path aliases must read from `tsconfig.json` `compilerOptions.paths` as the
  single source of truth. Vite and the custom import-boundary guard must
  derive their alias maps from the same configuration (programmatically or
  via a tiny shared constant).
- Initial barrel files must be valid TypeScript modules under the project's
  `isolatedModules: true` and `moduleDetection: "force"` settings. They must
  contain only a `/** @file ... */` header. They must not re-export from a
  file that does not yet exist.
- The custom import-boundary guard
  (`scripts/import-boundaries.ts`,
  `scripts/lint-import-boundaries.ts`) must continue to be the authoritative
  enforcement. The Biome `noRestrictedImports` rule adds editor-time and
  fast-feedback enforcement but does not replace the AST guard. Disagreement
  between the two layers must be treated as a Biome configuration bug, not
  as a domain rule change.
- Boundary patterns supplied to Biome `noRestrictedImports.patterns.group`
  must be anchored. Use forms like `@adapters/**`, `src/adapters/**`, and
  `adapters/**`. Do not use leading `**/` because Biome treats those as
  gitignore-style patterns that match third-party files under
  `node_modules/` and any unrelated path containing the segment.
- The shared alias-map constant must live in `tools/path-aliases.ts` so
  that production code (`vite.config.ts`) does not import from `scripts/`.
  `scripts/import-boundary-paths.ts` may re-export the constant for the
  custom guard's continued use.
- The alias-map contract must be type-stronger than a bare
  `Readonly<Record<string, string>>`: use a branded prefix type built on
  a template-literal alias (for example, ``AliasPrefix = `@${string}` ``),
  a branded repository-relative POSIX path type, and a frozen tuple list
  so prefix ordering is explicit.
  A compile-time assertion (or a runtime guard test) must reject any new
  prefix whose text is a prefix of another (`@app` vs `@application`).
- Biome `noRestrictedImports.patterns.group` arrays must be derived from
  the alias-map constant or asserted to contain it. The regression test
  must compute the expected pattern set from the constant, not hard-code
  three prefixes, so adding a fourth alias cannot drift silently.
- Manual Biome boundary-verification fixtures must be written to
  `tmp/boundary-check/` (already covered by `.gitignore` for the `tmp/`
  tree) and never to `src/domain/__boundary-check__/`. Source-tree
  pollution must be impossible by construction.
- `src/app/` is excluded from this item's enforcement scope. The existing
  classification in the custom guard permits `app` to import from every
  layer; that is correct for the React shell but means business rules can
  still drift into `app/`. This item must add a deferred-risk entry
  tracking the gap to 1.2.2.
- The domain and application package-restriction lists in Biome
  (`noRestrictedImports.options.paths`) and in the AST guard's
  `DISALLOWED_DOMAIN_PACKAGES` / `DISALLOWED_APPLICATION_PACKAGES`
  constants must be kept in sync. A regression test must read both and
  fail when they disagree.
- Do not migrate existing relative imports under `src/` and `tests/` to the
  new aliases as part of this item. Migration would expand scope and risk
  unrelated breakage. New code added in later roadmap items may use aliases
  freely.
- Do not add simulation equations, domain value objects, port interfaces,
  adapter implementations, XState machines, Dexie schema, or UI changes.
- Do not add external npm or system dependencies. Specifically, do not add
  `vite-tsconfig-paths`, `markdownlint-cli`, or `nixie`. The installed Vite
  major is 5.4, which lacks `resolve.tsconfigPaths`; alias derivation must be
  expressed inside `vite.config.ts` using only the standard library.
- Update `docs/developers-guide.md` because the directory tree, alias map,
  and enforcement layers change developer practice.
- Update ADR 002 only if a change to its accepted decisions is required;
  prefer leaving ADR 002 untouched and recording the alias decision in this
  ExecPlan and the developer guide.
- Update `docs/users-guide.md` only if implementation changes player-visible
  behaviour. This item is expected to be developer-facing only.
- Update `docs/roadmap.md` to mark only 1.2.1 as done. Do not mark 1.2.2 or
  later items done.
- Keep documentation in en-GB Oxford spelling and grammar.
- Keep every source file at or below 400 lines.
- Do not run format, lint, typecheck, tests, semantic checks, or frontend
  gates in parallel.
- `make check-fmt`, `make typecheck`, `make lint`, `make test`,
  `bun semantic`, and `bun ff` must pass before the implementation is
  committed.
- The application MUST be WCAG 2.2 compliant where this work touches UI.
  This item does not touch UI; the constraint is recorded for awareness and
  to gate any accidental UI change.
- All player-visible strings must be translatable per
  `docs/v2a-front-end-stack.md` for the supported locales
  (`en-GB`, `ar`, `zh-CH`, `de`, `es`) including RTL support. This item adds
  no player-visible strings; the constraint is recorded for awareness.

## Tolerances

- Scope: if implementation requires file changes outside the set
  `{src/domain/**, src/application/**, src/adapters/**, scripts/**,
  tests/**, tools/**, biome.jsonc, tsconfig.json, vite.config.ts,
  package.json, Makefile, docs/developers-guide.md,
  docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md,
  docs/contents.md, docs/roadmap.md, docs/execplans/1-2-1-create-package-boundaries.md}`,
  stop and ask for approval.
- Size: if the implementation exceeds 600 net lines of code added (excluding
  this plan and documentation), stop and split the work or ask for review.
- Interface: if a public TypeScript API exposed by the existing barrels
  changes shape (current top-level barrels re-export only
  `AppMachineAction`, `AppMachineEvent`, `AppMachineStateValue`, and
  `appMachine`), stop and ask for approval.
- Routing or UI: if a route, component prop, locale key, or runtime
  behaviour observable to the player must change, stop and ask for approval.
- Dependencies: if a new npm, Bun, or system dependency is required, stop
  and ask for approval.
- Biome rule choice: if the chosen `noRestrictedImports` configuration
  cannot express the boundary cleanly under per-file `overrides`, stop and
  ask whether to keep the AST guard as the sole enforcement layer or pursue
  an alternative (for example, `noPrivateImports` with JSDoc
  `@package`/`@private` annotations).
- Alias source-of-truth: if `tsconfig.json`, `vite.config.ts`, and the
  custom guard cannot be kept in sync without hand-maintaining three lists,
  stop and ask. The plan's preferred design is one constant inside
  `scripts/import-boundary-paths.ts` (or a sibling helper) that all three
  consumers read from.
- Validation: if the same required gate fails twice after changes intended
  to fix this item, stop, record the evidence, and ask for direction.
- Browser validation: if Playwright or `css-view` cannot be used because the
  server or tool is unavailable, record the limitation in
  `Surprises & Discoveries` and continue with the automated non-UI gates.
- Time: if a single milestone (Stage B–H below) takes more than four hours
  of focused work, stop and report progress.

## Risks

- Risk: Biome's `noRestrictedImports` matches on the import specifier string
  and cannot distinguish `import type` from value imports.
  Severity: medium.
  Likelihood: high.
  Mitigation: The rule still rejects every forbidden cross-layer import
  because the architectural rule itself does not need a type-only escape
  hatch (domain port interfaces live inside the domain, not in adapters).
  Record the limitation in `Decision Log` so a future ports-and-types
  refactor knows the boundary policy.

- Risk: Biome rule precedence under multiple per-folder `overrides` is not
  fully specified, so a rule expressed twice (once in the project root and
  once in `overrides`) may behave unpredictably.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Express boundary restrictions only in the
  `src/domain/**` and `src/application/**` overrides, leaving the project
  root config untouched for `noRestrictedImports`. Add a regression test
  that parses `biome.jsonc` and asserts the override shape.

- Risk: The installed Vite major (5.4) does not provide
  `resolve.tsconfigPaths`, so Vite alias resolution must be derived
  programmatically.
  Severity: low.
  Likelihood: high.
  Mitigation: Define one alias map in TypeScript, import it from both
  `vite.config.ts` and `scripts/import-boundary-paths.ts`, and write a unit
  test asserting it matches `tsconfig.json` `compilerOptions.paths`.

- Risk: Biome `noRestrictedImports.patterns.group` uses gitignore-style
  matching; an unanchored pattern such as `**/adapters/**` will match
  third-party paths and produce false positives.
  Severity: high.
  Likelihood: high.
  Mitigation: Use anchored forms only (`@adapters/**`, `src/adapters/**`,
  `adapters/**`) and cover this case in
  `tests/biome-noRestrictedImports.test.ts` by including an import from a
  hypothetical `some-pkg-with-adapters-in-name` package and asserting no
  violation is emitted.

- Risk: A future alias (for example, `@parameter-packs/*` in roadmap
  1.3.2) lands in `tsconfig.json` and `vite.config.ts` but the Biome
  override is missed, silently disabling boundary enforcement for the new
  layer.
  Severity: high.
  Likelihood: high.
  Mitigation: Derive Biome's expected pattern set from the alias-map
  constant inside the regression test, so adding a fourth alias without
  updating Biome fails CI.

- Risk: Biome rule effectiveness is asserted by JSON-shape parsing
  alone, missing silent rule disable caused by misnesting under
  `linter.rules` versus `linter.rules.style` or by a typoed
  `noRestrictedImports` key.
  Severity: high.
  Likelihood: medium.
  Mitigation: The Biome verification test must invoke `bunx biome lint`
  on a known-bad fixture in `tmp/` and assert non-zero exit plus the
  override's message text. Shape parsing supplements but does not
  replace this end-to-end check.

- Risk: Biome lacks `allowTypeImports`, so once roadmap 1.4.x (Dexie
  adapter) needs to `import type` from `@domain/ports`, the Biome rule
  cannot express the carve-out.
  Severity: medium.
  Likelihood: high (1.4.x is a near-term roadmap item).
  Mitigation: Record the carve-out policy now (AST guard remains
  authoritative; Biome will need a documented false-negative tolerance
  when 1.4.x lands) so the policy is not invented under deadline
  pressure.

- Risk: Manual Biome verification fixtures placed under `src/domain/`
  may accidentally land in version control.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Write fixtures to `tmp/boundary-check/` only. Confirm
  `.gitignore` covers `tmp/` before the verification step and re-confirm
  with `git status --short` before any commit.

- Risk: `src/app/` retains permissive import classification (it may
  import from every layer); business rules can drift into the React
  shell undetected by this item's enforcement.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Record the gap as a deferred risk in `Decision Log` with
  a hand-off to 1.2.2, which can add app-layer detection (for example,
  by classifying value-object names that re-appear inside `src/app/`).

- Risk: Adding many empty subdirectories with bare JSDoc barrels could
  trigger Biome's unused-export or empty-module diagnostics.
  Severity: low.
  Likelihood: medium.
  Mitigation: Use a `/** @file ... */` header only; do not add `export {};`
  unless TypeScript or Biome reports a module-detection error. Run
  `bun check:types`, `bun lint`, and `bun semantic` on the skeleton before
  adding any boundary rule.

- Risk: The existing custom guard is alias-unaware; an import via
  `@adapters/...` from `src/domain/...` would currently be classified as
  `other` and slip through.
  Severity: high.
  Likelihood: high.
  Mitigation: Teach `classifyImportTarget` and the pre-resolution helpers
  about the alias map before the new aliases are wired into `tsconfig.json`.
  Cover this with at least four new cases in
  `tests/import-boundary-violation-cases.ts` and
  `tests/import-boundaries.test.ts`.

- Risk: `bun ff` requires generated token CSS and a reachable Vite dev
  server for its end-to-end phase.
  Severity: medium.
  Likelihood: medium.
  Mitigation: Run `bun tokens:build` before `bun ff`, start a validation
  dev server explicitly for the end-to-end phase, and stop it after the
  gate completes. Record the procedure in `Concrete steps`.

- Risk: CodeRabbit `--agent` review is intermittently unavailable in this
  environment.
  Severity: low.
  Likelihood: medium.
  Mitigation: Continue to invoke CodeRabbit after each major milestone, but
  do not block on unavailable external review capacity. Record each failed
  attempt and rely on repository gates plus focused self-review.

- Risk: Pre-existing repository-wide Markdown lint and Mermaid validation
  failures may surface when this item runs the documentation gates.
  Severity: low.
  Likelihood: medium.
  Mitigation: Run focused linting against this ExecPlan and any touched
  documents first. Defer wider Markdown remediation to a separate item.

## Progress

- [x] Loaded `execplans`, `leta`, and `hexagonal-architecture` skills.
- [x] Confirmed branch is `1-2-1-create-package-boundaries`.
- [ ] Used a planning agent team for research (Biome + TS alias prior art
  and worktree reconnaissance ran in parallel).
- [ ] Drafted this approval-gated ExecPlan.
- [ ] Submitted the draft to a community-of-experts review (Logisphere) and
  recorded resulting revisions in `Decision Log`.
- [x] Received explicit user approval to implement.
- [x] Implemented the directory skeleton with JSDoc-only barrels.
- [x] Defined the alias map source-of-truth and wired it into
  `tsconfig.json`, `vite.config.ts`, and the custom guard.
- [x] Configured Biome `noRestrictedImports` overrides for
  `src/domain/**` and `src/application/**`.
- [x] Added unit and integration tests covering alias resolution, allowed
  imports, and forbidden imports.
- [x] Ran `make check-fmt`, `make lint`, `make typecheck`, `make test`,
  `bun semantic`, and `bun ff` sequentially; all passed.
- [x] Updated `docs/developers-guide.md` with the alias map and the dual
  enforcement layers (Biome + custom guard).
- [x] Marked roadmap item 1.2.1 as done.
- [x] Committed implementation in an atomic, gate-passing increment.
- [x] Invoked `coderabbit review --agent` after implementation and
  documentation milestones; cleared findings before moving on.
- [x] Ran documentation validation for the final developer-guide, roadmap, and
  ExecPlan updates.
- [ ] Renamed the branch to `1-2-1-create-package-boundaries` using
  GitHub's branch-rename flow, pushed, and opened a draft PR with the
  required title prefix `(1.2.1)`, execplan reference, and Lody session
  link.

## Surprises & discoveries

- Observation: Vite 5.4 lacks `resolve.tsconfigPaths`, which Vite 8
  introduced. The repository cannot adopt the Vite-native single-source
  pattern recommended by Biome and TypeScript prior-art research without
  a major Vite bump.
  Evidence: `package.json` pins `"vite": "^5.4.10"`; Vite 8 release notes
  (July 2025) announce `resolve.tsconfigPaths`.
  Impact: The plan derives Vite aliases programmatically from a TypeScript
  alias-map constant. A future Vite 8 upgrade can simplify this back to a
  single boolean.

- Observation: Biome's `noRestrictedImports` (stable in v2.x under
  `linter.rules.style`) cannot distinguish `import type` from value
  imports.
  Evidence: Biome discussion
  <https://github.com/biomejs/biome/discussions/7337> tracks the missing
  `allowTypeImports` option.
  Impact: For domain-to-adapter restrictions this is fine (port interfaces
  live in `src/domain/ports/`, so a type-only escape hatch is not needed).
  The plan documents the limitation and keeps the AST guard authoritative.

- Observation: `eslint-plugin-boundaries` is the de-facto JavaScript
  ecosystem solution and is cited by the Biome community as the missing
  feature.
  Evidence: Biome discussion
  <https://github.com/biomejs/biome/discussions/6245>.
  Impact: The repository deliberately keeps to Biome plus its own custom
  AST guard rather than adopting an ESLint plugin chain. Recorded so a
  future ADR can revisit the choice if Biome adds a folder-graph rule.

- Observation: `src/application/index.ts` already re-exports
  `AppMachineAction`, `AppMachineEvent`, `AppMachineStateValue`, and
  `appMachine` from `./machines`; the other two top-level barrels are
  comment-only.
  Evidence: The recon report from the planning agent team.
  Impact: New subdirectory barrels start empty; the application barrel
  must not regress the existing re-exports.

- Observation: `src/app/` already has six subdirectories
  (`i18n/`, `layout/`, `observability/`, `providers/`, `routes/`, plus
  `app.tsx`).
  Evidence: Worktree recon.
  Impact: `src/app/` is out of scope for this item. The existing tree is
  retained.

- Observation: CodeRabbit rate limiting occurred during the implementation
  review cycle.
  Evidence: `coderabbit review --agent` returned a rate-limit message during
  the clean-check review; the retry after `vsleep 78m` returned
  `findings: 0`.
  Impact: The required backoff process works and was recorded in `/tmp`
  review logs. No implementation work proceeded until the clean review
  completed.

- Observation: The JSONC parser helper used by the Biome configuration tests
  mishandled an unterminated block comment at end of file.
  Evidence: CodeRabbit flagged that `skipBlockComment` returned `text.length +
  1`, and focused tests now cover line comments, end-of-file line comments,
  and unterminated block comments.
  Impact: The helper is now safer for malformed configuration text, even
  though committed `biome.jsonc` is valid.

- Observation: `bun ff` requires a running Vite dev server.
  Evidence: The first direct `bun ff` invocation failed because
  `http://localhost:5173` was unavailable; rerunning with a temporary
  `bun dev` process passed.
  Impact: Final frontend gates are run by starting a temporary server,
  waiting for readiness, running `bun ff`, and stopping only that process.

- Observation: Existing imports under `src/` are mostly relative (`../`,
  `./`); test files use `../../src/...` and `../src/...`. No file uses an
  `@`-prefixed local alias today.
  Evidence: Worktree recon (9 relative + 7 sibling-relative in `src/`; 18
  relative in `tests/`).
  Impact: Migration is deferred; the plan only enables aliases for new
  code.

- Observation: Biome `noRestrictedImports` checks only the literal import
  specifier. It catches `@adapters/...`, `src/adapters/...`, and bare
  `adapters/...` forms configured in `biome.jsonc`, but it does not resolve
  `../adapters/...` relative imports to a layer path.
  Evidence: A transient fixture under `tmp/biome-boundary-check/` reported
  the expected domain alias violation, while an application fixture using
  `../adapters/audio/x` did not produce a Biome diagnostic. The custom AST
  guard continued to reject relative escapes in
  `tests/import-boundaries.test.ts`.
  Impact: The Biome integration test now verifies alias and `src/`-relative
  forms. The custom guard remains authoritative for relative-path resolution.

- Observation: `bun ff` requires a running Vite dev server for the Playwright
  e2e phase.
  Evidence: The first `bun ff` run reached `bash scripts/e2e.sh` and reported
  `ERROR: Dev server not reachable at http://localhost:5173`. A rerun with a
  temporary `bun dev` process passed.
  Impact: Validation evidence records the successful server-backed run, and
  the temporary process was stopped afterwards.

## Decision Log

- Decision: Treat the existing custom guard
  (`scripts/import-boundaries.ts`,
  `scripts/lint-import-boundaries.ts`) as the authoritative enforcement
  layer and add Biome `noRestrictedImports` as a fast-feedback safety net.
  Rationale: Biome cannot express type-only exceptions and has fragile
  multi-form alias coverage; the AST guard already normalises every form
  through the TypeScript compiler API. Two layers catch typos in either
  configuration without one masking the other.
  Date/Author: 2026-06-02 / Claude (drafting).

- Decision: Use a single TypeScript alias-map constant at
  `tools/path-aliases.ts` as the source of truth. Re-export it from
  `scripts/import-boundary-paths.ts` for the custom guard.
  Rationale: Vite 5.4 has no `resolve.tsconfigPaths`. Hand-maintaining
  three lists is the known failure mode flagged by Biome maintainers.
  Placing the constant in `tools/` keeps production code
  (`vite.config.ts`) from importing through `scripts/`, which is reserved
  for build-tooling entry points. The Logisphere Telefono pass flagged
  the original `scripts/`-only placement as a dependency-direction
  hazard once 1.2.2 or later items need alias resolution at runtime.
  Date/Author: 2026-06-02 / Claude (drafting, post-review revision).

- Decision: Use anchored Biome patterns only
  (`@adapters/**`, `src/adapters/**`, `adapters/**`); reject any pattern
  with a leading `**/`.
  Rationale: Biome's gitignore-style matching turns leading `**/` into
  matches against third-party paths under `node_modules/` and other
  unrelated subtrees, producing false positives that developers will
  silence with `biome-ignore` comments. Anchoring the patterns avoids
  that failure mode entirely.
  Date/Author: 2026-06-02 / Claude (drafting, post-review revision).

- Decision: Derive Biome's expected pattern set from
  `tools/path-aliases.ts` inside the regression test.
  Rationale: Hard-coding three prefixes in the test means adding a
  fourth alias (for example `@parameter-packs` in 1.3.2) silently
  disables boundary enforcement on the new layer.
  Date/Author: 2026-06-02 / Claude (drafting, post-review revision).

- Decision: Replace the JSON-shape Biome test with an end-to-end
  invocation of `bunx biome lint` on a known-bad fixture under `tmp/`.
  Rationale: Shape parsing cannot detect silent rule disable (key typo,
  misnesting under `linter.rules` versus `linter.rules.style`).
  End-to-end invocation asserts non-zero exit and the override message
  text directly. Shape parsing remains as a complementary fast test.
  Date/Author: 2026-06-02 / Claude (drafting, post-review revision).

- Decision: Test that Biome
  `noRestrictedImports.options.paths` and the AST guard's
  `DISALLOWED_DOMAIN_PACKAGES` / `DISALLOWED_APPLICATION_PACKAGES`
  constants agree on the list of forbidden third-party packages.
  Rationale: Maintaining the same intent in two places invites drift; a
  comparison test makes drift fail CI.
  Date/Author: 2026-06-02 / Claude (drafting, post-review revision).

- Decision: Keep Biome enforcement focused on alias, `src/`-relative, and bare
  specifier forms, and rely on the AST guard for `../` relative path
  resolution.
  Rationale: Biome's rule operates on import specifier text, not resolved file
  targets. Adding a finite list of `../` depth patterns would be incomplete and
  easy to misread as authoritative. The custom guard already resolves relative
  imports through the source-file set and has explicit regression tests for
  directory-climbing escapes.
  Date/Author: 2026-06-12 / Codex (implementation).

- Decision: Validate `bun ff` with an explicitly managed temporary dev server.
  Rationale: The repository e2e script expects `http://localhost:5173` to be
  reachable and does not start Vite itself. Starting `bun dev`, waiting for the
  server, running `bun ff`, and then stopping only that process keeps the gate
  faithful without touching other agents' processes.
  Date/Author: 2026-06-12 / Codex (implementation).

- Decision: Keep JSONC parsing logic for documentation-style Biome tests
  small and locally tested instead of adding a parser dependency.
  Rationale: The helper only needs to strip JSONC comments from project-owned
  configuration before `JSON.parse`. Adding an external parser would exceed
  the no-new-dependency constraint for a narrow test helper, while focused
  tests cover the edge cases found during review.
  Date/Author: 2026-06-12 / Codex (implementation).

- Decision: Record `src/app/` exemption as a deferred risk handed off to
  1.2.2 instead of widening 1.2.1 scope.
  Rationale: The React shell is permitted to import every layer. Adding
  business-rule detection to `app/` requires either CodeScene rules or
  AST-side value-object-name tracking, both of which exceed this item's
  tolerance budget. Recording the gap explicitly prevents a silent
  carry-over into 1.2.2.
  Date/Author: 2026-06-02 / Claude (drafting, post-review revision).

- Decision: Strengthen the alias-map contract to
  `readonly (readonly [AliasPrefix, RepoRelativePath])[]` with branded
  prefix and path types, and add a substring-collision guard.
  Rationale: A bare `Readonly<Record<string, string>>` does not prevent
  typos (`"domain"` versus `"@domain"`) or prefix collisions (a future
  `@app` would be a prefix of `@application` and resolve ambiguously
  under naive `startsWith` checks).
  Date/Author: 2026-06-02 / Claude (drafting, post-review revision).

- Decision: Use `@domain/*`, `@application/*`, `@adapters/*` as the alias
  prefixes.
  Rationale: `@`-prefixed paths are the dominant idiom for repository-local
  TypeScript aliases. They do not clash with scoped npm packages
  (`@scope/name` requires a `/`), match how Biome documents alias
  restrictions, and read consistently next to the existing
  `@radix-ui/...`, `@tanstack/...`, and `@tabler/...` imports.
  Date/Author: 2026-06-02 / Claude (drafting).

- Decision: Do not migrate existing relative imports under `src/` and
  `tests/` to the new aliases as part of 1.2.1.
  Rationale: Migration expands scope, churns the diff, and risks
  unrelated regressions. Aliases are available for new code; later
  roadmap items can adopt them as they touch existing files.
  Date/Author: 2026-06-02 / Claude (drafting).

- Decision: Do not create `src/optimisation/` or `src/data/` in 1.2.1.
  Rationale: ADR 002 still lists the optimisation-tooling location as an
  open question, and `src/data/` is downstream of the parameter-pack and
  registry items (1.3.2 onward).
  Date/Author: 2026-06-02 / Claude (drafting).

- Decision: Defer initial barrel `export {};` markers; rely on
  `moduleDetection: "force"` in `tsconfig.json`.
  Rationale: The repository already forces module detection, so empty
  files with a `/** @file ... */` header are valid modules. Adding
  `export {};` is noise that Biome's import-sort and the project's own
  `bun fmt` would have to accommodate.
  Date/Author: 2026-06-02 / Claude (drafting).

## Outcomes & retrospective

Implementation and documentation are complete; final CodeRabbit and PR
validation remain.

- The in-scope HLD tree now exists:
  `src/domain/{model,services,rules,ports}/`,
  `src/application/{machines,commands,selectors}/`, and
  `src/adapters/{persistence,rng,audio,render,assets}/`. New leaf
  directories contain JSDoc-only `index.ts` barrels. `src/optimisation/`,
  `src/data/`, and any new `src/app/` subdirectories remain deferred.
- The alias map is `@domain/* -> src/domain/*`,
  `@application/* -> src/application/*`, and
  `@adapters/* -> src/adapters/*`. `tools/path-aliases.ts` owns the typed
  tuple; `tsconfig.json`, `vite.config.ts`, the AST guard, and tests validate
  against it.
- Biome catches literal forbidden imports in domain and application files.
  The custom AST guard remains authoritative because it resolves relative
  imports as well as aliases. Parity tests keep the forbidden package lists in
  Biome and the AST guard aligned.
- A deliberate Biome fixture under `tmp/` failed with the expected
  `noRestrictedImports` diagnostics and was removed before commit. The
  committed integration test recreates this check in an isolated temporary
  directory.
- CodeRabbit implementation review findings were cleared before documentation
  work began. The final implementation clean-check returned `findings: 0`.
- CodeRabbit documentation review returned `findings: 0` after all
  deterministic gates had passed.
- Surprises that informed future roadmap items.

Validation evidence recorded during the documentation milestone:

- `bun fmt` passed with no fixes applied.
- `bunx markdownlint-cli docs/developers-guide.md docs/roadmap.md docs/execplans/1-2-1-create-package-boundaries.md`
  passed.
- `make check-fmt` passed.
- `make lint` passed.
- `make typecheck` passed.
- `make test` passed with 112 tests across 17 files.
- `bun semantic` passed; `lint-import-boundaries` scanned 29 files and found
  0 violations.
- `bun ff` passed with a temporary Vite dev server, including 112 Bun tests,
  2 Vitest a11y tests, Fluent placeholder validation, semantic lint, and 1
  Playwright a11y e2e test.

## Context and orientation

The roadmap entry lives in `docs/roadmap.md` under "1.2. Create the
hexagonal source-tree skeleton" as task 1.2.1. The success text says the
empty skeleton must pass `bun check:types` and that Biome must reject a
domain file that imports from `adapters/`.

ADR 002,
`docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`, sets
the boundary direction, names `src/domain/`, `src/application/`, and
`src/adapters/` as the package boundaries, and rejects `src/core/`. The
ADR remains accepted; no amendment is required by 1.2.1 unless an
implementation detail forces it.

The HLD,
`docs/vibe-coder-high-level-design.md` section "Module layout", names the
intended subdirectories for each layer. Reproduced below for ease of
reference, with the in-scope set marked:

```text
src/
  domain/         # in scope
    model/        # new
    services/     # new
    rules/        # new
    ports/        # new
  application/    # in scope
    machines/     # already exists
    commands/     # new
    selectors/    # new
  adapters/       # in scope
    persistence/  # new
    rng/          # new
    audio/        # new
    render/       # new
    assets/       # new
  optimisation/   # out of scope (ADR 002 open question)
  data/           # out of scope (downstream of 1.3.2)
```

The developer guide,
`docs/developers-guide.md` section "Directory structure and boundary
rules", documents the import matrix and references
`bun run lint:imports`. After 1.2.1, the guide must list the alias map,
explain the Biome override, and clarify that the AST guard remains the
authoritative check.

The existing custom guard lives in `scripts/import-boundaries.ts` (pure
helpers) and `scripts/lint-import-boundaries.ts` (CLI wrapper).
`classifyImportTarget` handles relative imports and `src/`-prefixed
absolute paths only. Path-alias handling must be added in
`scripts/import-boundary-paths.ts` so it can be shared with
`vite.config.ts` and a regression test.

Existing repository state at the start of 1.2.1:

- `src/domain/index.ts`, `src/application/index.ts`, and
  `src/adapters/index.ts` are present and minimal.
- `src/application/machines/` is present with `app.machine.ts` and a
  barrel; both must survive untouched.
- `tsconfig.json` does not define `baseUrl` or `paths`.
- `vite.config.ts` does not define `resolve.alias`.
- `biome.jsonc` does not configure `noRestrictedImports`.
- `package.json` already exposes `lint:imports` and runs it inside
  `semantic:lint`.

Relevant skills and documents for implementation:

- `execplans`, for maintaining this living plan.
- `hexagonal-architecture`, for protecting inward dependency direction.
- `leta`, for source navigation if code inspection becomes necessary.
- `firecrawl`, used during planning for Biome and TypeScript prior art.
- `logisphere-experts` (or `logisphere-design-review`), for the
  community-of-experts review pass before implementation.
- `commit-message`, for file-based commit messages after validation.
- `pr-creation` and `en-gb-oxendict`, for the draft PR.
- `AGENTS.md`, `docs/roadmap.md`,
  `docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`,
  `docs/vibe-coder-high-level-design.md`,
  `docs/developers-guide.md`, `docs/users-guide.md`,
  `docs/contents.md`,
  `docs/execplans/1-1-2-record-the-type-script-source-tree-naming.md`,
  `docs/execplans/1-1-3-record-x-state-machine-collocation-strategy.md`.

Frontend reference documents the requesting task lists
(`docs/v2a-front-end-stack.md`, the Corbusier design language, daisyUI v5
guide, Tailwind v4 guide, semantic-Tailwind guidance, the
pure-accessible-and-localizable-React-components note, the
high-velocity-accessibility-first-component-testing note,
`docs/data-model-driven-card-architecture.md`, and
`docs/enforcing-semantic-tailwind-best-practice.md`) are not present in
this worktree. Because 1.2.1 does not touch UI, locale files, semantic
classes, or card models, the absence does not block implementation. Any
accidental UI change would require revisiting those references before
committing.

## Plan of work

Stage A is approval and preflight. Confirm explicit approval from the
user. Re-run `git branch --show-current`; the branch must not be `main`.
Run `git status --short` and record any pre-existing changes here before
editing. If unrelated dirty files exist, leave them alone.

Stage B introduces the alias source of truth and threads it through the
configuration layers in a single, reviewable change.

- Add `tools/path-aliases.ts`. It exports a template-literal branded
  prefix type, a branded `RepoRelativePath` type, and `PATH_ALIASES` as
  a frozen readonly tuple list ordered
  `[["@domain", "src/domain"], ["@application", "src/application"],
  ["@adapters", "src/adapters"]]`. See the `Interfaces and dependencies`
  section for the full type signature.
- Add a Bun test (`tests/path-aliases.config.test.ts`) that fails the
  build when any prefix is a string prefix of another. This is the
  collision guard.
- Re-export `PATH_ALIASES` and the helper types from
  `scripts/import-boundary-paths.ts` so the custom guard continues to
  consume one module path. The re-export must not add new logic.
- Extend `tsconfig.json` `compilerOptions` with `paths` (no `baseUrl`,
  per TypeScript 4.1+):

  ```jsonc
  "paths": {
    "@domain/*": ["./src/domain/*"],
    "@application/*": ["./src/application/*"],
    "@adapters/*": ["./src/adapters/*"]
  }
  ```

- In `vite.config.ts`, import `PATH_ALIASES` from `./tools/path-aliases`
  and derive `resolve.alias` programmatically. Resolve each alias value
  relative to the Vite config file using `path.resolve(__dirname, value)`.
  Keep the derivation pure and free of side effects. Do not import from
  `./scripts/`.
- The Bun test `tests/path-aliases.config.test.ts` must:
  1. Read `tsconfig.json` via `Bun.file().json()`.
  2. Derive the expected `paths` map from `PATH_ALIASES` by appending
     `/*` to each prefix and `/*` to each target with a leading `./`.
  3. Assert deep equality with `tsconfig.compilerOptions.paths`.
  4. Assert no `AliasPrefix` is a string prefix of another
     `AliasPrefix`.
  5. Assert every target path resolves under `src/` and matches an
     existing directory at the time of the test (so deleting a target
     accidentally fails CI).

Stage C creates the directory skeleton.

- Create each new subdirectory listed in `Context and orientation` with
  a `index.ts` barrel containing only a `/** @file ... */` header that
  describes the directory's responsibility and links back to the HLD
  section. Example for `src/domain/model/index.ts`:

  ```ts
  /**
   * @file Domain model barrel.
   *
   * The domain model layer holds immutable value objects and aggregate
   * roots used by `src/domain/services/` and `src/domain/rules/`. Files
   * placed here must not import React, Dexie, Web Audio, browser APIs,
   * application code, or adapter code. See
   * `docs/vibe-coder-high-level-design.md` section "Module layout".
   */
  ```

- Leave the existing top-level barrels untouched apart from optionally
  adding a one-line cross-reference to the new subdirectory barrels. Do
  not break the existing `appMachine` re-export from
  `src/application/index.ts`.

Stage D teaches the custom guard about the new aliases.

- In `scripts/import-boundary-paths.ts`, add a pure helper
  `expandPathAlias(importPath: string): string | undefined` that returns
  the `src/`-relative form when `importPath` starts with one of the
  alias keys (`@domain/`, `@application/`, `@adapters/`), and
  `undefined` otherwise.
- In `scripts/import-boundaries.ts`, update
  `classifyImportTarget` to call `expandPathAlias` before its existing
  `src/` branch. When the helper returns a value, treat the expanded
  path as the import target.
- Add violation cases to `tests/import-boundary-violation-cases.ts` and
  test assertions in `tests/import-boundaries.test.ts`:
  - Allowed: `src/application/foo.ts` importing `@domain/model/run`.
  - Allowed: `src/adapters/foo.ts` importing
    `@application/selectors/dashboard-selectors`.
  - Forbidden: `src/domain/foo.ts` importing `@adapters/persistence/db`.
  - Forbidden: `src/domain/foo.ts` importing
    `@application/machines/app.machine`.
  - Forbidden: `src/application/foo.ts` importing `@adapters/audio/x`.
  - Edge: a deep relative escape such as
    `../../../adapters/persistence/db` is still classified through the
    existing relative-path branch and rejected when the source is in
    `src/domain/`.

Stage E configures Biome's `noRestrictedImports`.

- Add two `overrides` entries to `biome.jsonc`. The `group` arrays must
  use only anchored patterns. The forbidden alias and `src/`-relative
  forms are listed; no pattern uses a leading `**/`.

  ```jsonc
  {
    "includes": ["src/domain/**"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": [
                    "@adapters/**",
                    "@application/**",
                    "src/adapters/**",
                    "src/application/**",
                    "adapters/**",
                    "application/**"
                  ],
                  "message": "Domain must not depend on adapters or application."
                }
              ],
              "paths": {
                "react": "Domain must not import React.",
                "react-dom": "Domain must not import React DOM.",
                "dexie": "Domain must not import Dexie."
              }
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/application/**"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": [
                    "@adapters/**",
                    "src/adapters/**",
                    "adapters/**"
                  ],
                  "message": "Application must not depend on adapters."
                }
              ],
              "paths": {
                "react-dom": "Application must not import React DOM.",
                "dexie": "Application must not import Dexie."
              }
            }
          }
        }
      }
    }
  }
  ```

- Add `tests/biome-no-restricted-imports.config.test.ts` for shape
  parsing. The test reads `biome.jsonc` (stripping comments via a
  small JSONC parser, since Bun's `Bun.file().json()` rejects
  comments), and asserts:
  - `overrides[*].includes` includes both `src/domain/**` and
    `src/application/**`.
  - For each `(prefix, target)` entry in `PATH_ALIASES` whose layer is
    forbidden from the override's source layer, the matching domain
    override's `patterns[0].group` contains the corresponding alias
    form (`${prefix}/**`), `src/`-relative form
    (`${target}/**`), and bare form (`${target.replace("src/", "")}/**`).
    Iterate from `PATH_ALIASES` so adding a fourth alias fails this
    test until the Biome config is updated.
  - `noRestrictedImports.options.paths` rejects `react` in the domain
    override and `dexie` in both overrides.
- Add `tests/biome-no-restricted-imports.integration.test.ts` for
  end-to-end verification. The test:
  1. Creates a fixture directory under `tmp/biome-boundary-check/`.
  2. Writes a minimal `biome.jsonc` symlink (or copy of the project's
     real `biome.jsonc`) so the override `includes` paths still match.
  3. Writes a fixture file at the path
     `tmp/biome-boundary-check/src/domain/forbidden-by-alias.ts`
     containing `import "@adapters/persistence/db";`.
  4. Writes a second fixture file at
     `tmp/biome-boundary-check/src/application/forbidden-by-relative.ts`
     containing `import "../adapters/audio/x";`.
  5. Writes a third fixture
     `tmp/biome-boundary-check/src/domain/allowed.ts`
     containing `import "./other";` to assert no false positive.
  6. Writes a fourth fixture
     `tmp/biome-boundary-check/src/domain/third-party-name-collision.ts`
     containing `import "some-pkg-with-adapters-in-name";` to assert no
     false positive against unrelated package names.
  7. Invokes `bunx biome lint --reporter=json
     tmp/biome-boundary-check/` and parses the JSON report.
  8. Asserts the report contains a violation for each forbidden fixture
     citing the override's message text and no violation for either
     allowed fixture.
  9. Cleans up the fixture directory at the end of the test.
- Add `tests/biome-package-restrictions.parity.test.ts`. This test:
  1. Reads `biome.jsonc` and extracts
     `noRestrictedImports.options.paths` from each override.
  2. Reads `scripts/import-boundaries.ts` and extracts the
     `DISALLOWED_DOMAIN_PACKAGES` and `DISALLOWED_APPLICATION_PACKAGES`
     constants via a small dynamic import.
  3. Asserts the Biome `paths` keys equal the AST guard's package keys
     for each layer (set equality, not order). Drift fails the test.
- Verify manually with a transient fixture under `tmp/`:

  ```sh
  mkdir -p tmp/boundary-check/src/domain
  printf 'import "@adapters/persistence/db";\n' \
    > tmp/boundary-check/src/domain/forbidden.ts
  bunx biome lint tmp/boundary-check/src/domain/
  # Expect non-zero exit and the override message.
  rm -rf tmp/boundary-check
  ```

  Confirm `tmp/` is covered by `.gitignore` before this step; if not,
  stop and ask before continuing. Do not create fixtures under
  `src/domain/`.

Stage F updates documentation.

- Update `docs/developers-guide.md` section "Directory structure and
  boundary rules":
  - Reflect the now-populated subdirectory tree.
  - Add a short "Path aliases" subsection describing
    `@domain/*`, `@application/*`, `@adapters/*`.
  - Update the "Violations" paragraph to mention both the Biome rule and
    the AST guard, and the order in which they run.
- Update `docs/contents.md` only if a new top-level document is added.
  The preferred path keeps this ExecPlan as the only new document.
- Touch ADR 002 only to add a `Decision Log` entry noting that 1.2.1
  ratified the alias map. Prefer not amending ADR 002 if the developer
  guide and this ExecPlan together capture the decision.
- Do not edit `docs/users-guide.md`; this item does not change
  player-visible behaviour.

Stage G updates roadmap state. Mark only item 1.2.1 in `docs/roadmap.md`
as `[x]`. Do not mark 1.2.2 or any later item done.

Stage H validates, commits, and records outcomes.

- Run all gates listed below sequentially, capturing logs under `/tmp`.
- Update `Progress` and `Surprises & Discoveries` with results.
- Commit in small atomic chunks aligned to Stages B–G so git history
  permits rollback.
- After each major milestone, invoke
  `coderabbit review --agent` and clear findings before continuing.
- After every gate passes, rename the working branch to
  `1-2-1-create-package-boundaries` using GitHub's branch-rename flow,
  push to `origin/1-2-1-create-package-boundaries`, and open a draft PR.

## Concrete steps

All commands run from:

```sh
/home/leynos/.lody/repos/github---leynos---vibe-coder/worktrees/cdbc039c-38cb-4182-ac83-5053536970e5
```

Preflight:

```sh
git branch --show-current
git status --short
echo "${LODY_SESSION_ID}"
```

Expected branch is the planning branch (`feat/hex-package-boundaries-plan`
before the rename) or `1-2-1-create-package-boundaries` after the rename.
The Lody session ID must be non-empty so the draft PR can carry the
session link.

After approval, edit files in the order Stage B → Stage G. Run the new
focused checker directly while developing:

```sh
bun run lint:imports 2>&1 | tee /tmp/imports-vibe-coder-1-2-1.out
bun test tests/import-boundaries.test.ts tests/path-aliases.config.test.ts \
  tests/biome-no-restricted-imports.config.test.ts \
  tests/biome-no-restricted-imports.integration.test.ts \
  tests/biome-package-restrictions.parity.test.ts 2>&1 \
  | tee /tmp/test-imports-vibe-coder-1-2-1.out
```

Expected output for the linter is empty plus exit code 0 (the empty
skeleton has no imports). Expected output for the tests lists each test
file with no failures.

Then run the required gates sequentially:

```sh
make check-fmt 2>&1 | tee /tmp/check-fmt-vibe-coder-1-2-1.out
make lint 2>&1 | tee /tmp/lint-vibe-coder-1-2-1.out
make typecheck 2>&1 | tee /tmp/typecheck-vibe-coder-1-2-1.out
make test 2>&1 | tee /tmp/test-vibe-coder-1-2-1.out
bun semantic 2>&1 | tee /tmp/semantic-vibe-coder-1-2-1.out
bun tokens:build 2>&1 | tee /tmp/tokens-vibe-coder-1-2-1.out
bun dev > /tmp/dev-vibe-coder-1-2-1.out 2>&1 &
DEV_PID=$!
sleep 5
bun ff 2>&1 | tee /tmp/ff-vibe-coder-1-2-1.out
kill "${DEV_PID}" 2>/dev/null || true
```

Browser validation:

- If Playwright MCP is available, navigate to the local dev server,
  capture a full-page screenshot, and confirm no UI regression. This
  item changes no UI, so the screenshot should match the pre-change
  baseline.
- If `css-view` is available, run it against the local validation
  server and record any output under
  `/tmp/css-view-vibe-coder-1-2-1.json`. Confirm no class-list changes
  are reported.
- If either tool is unavailable, record the limitation in
  `Surprises & Discoveries` and rely on the repository Playwright e2e
  gate that `bun ff` runs.

Manual Biome boundary verification, executed only under `tmp/`:

```sh
mkdir -p tmp/boundary-check/src/domain
printf 'import "@adapters/persistence/db";\n' \
  > tmp/boundary-check/src/domain/forbidden.ts
bunx biome lint tmp/boundary-check/src/domain/
# Expect non-zero exit and the override message.
rm -rf tmp/boundary-check
git status --short tmp/ src/domain/ # confirm no residual fixtures
```

CodeRabbit review (per major milestone):

```sh
coderabbit review --agent 2>&1 | tee /tmp/coderabbit-vibe-coder-1-2-1-<stage>.out
```

Record availability and findings per attempt. If unavailable, note the
specific error class (`payload_too_large`, usage-credit, authentication)
and continue with repository gates.

After all gates pass, commit using the repository's file-based
commit-message workflow. Suggested commit subjects per stage:

- Stage B: `Add hexagonal alias map and threading through tsconfig and Vite`
- Stage C: `Create domain, application, and adapters subdirectory skeleton`
- Stage D: `Teach import-boundary guard about path aliases`
- Stage E: `Configure Biome noRestrictedImports for domain and application`
- Stage F: `Document path aliases and dual boundary enforcement`
- Stage G: `Mark roadmap item 1.2.1 as done`

Branch rename and draft PR:

```sh
SRC_BRANCH=feat%2Fhex-package-boundaries-plan
DST_BRANCH=1-2-1-create-package-boundaries
gh api -X POST "repos/leynos/vibe-coder/branches/${SRC_BRANCH}/rename" \
  -F "new_name=${DST_BRANCH}"
git fetch origin
git checkout "${DST_BRANCH}"
git push -u origin "${DST_BRANCH}"
gh pr create --draft \
  --title "(1.2.1) Create hexagonal source-tree skeleton" \
  --body "$(cat <<'BODY'
## Summary

- Create the `src/domain/`, `src/application/`, and `src/adapters/`
  subdirectory tree per HLD §"Module layout" with JSDoc-only barrels.
- Add `@domain/*`, `@application/*`, `@adapters/*` TypeScript path
  aliases, wired into `vite.config.ts` and the custom import-boundary
  guard through a single source-of-truth constant.
- Configure Biome `noRestrictedImports` overrides so domain and
  application files cannot import adapter or application code.
- Update the developer guide; mark roadmap item 1.2.1 as done.

## ExecPlan

`docs/execplans/1-2-1-create-package-boundaries.md` carries the full
constraints, tolerances, decision log, and validation evidence for this
work.

## Test plan

- [ ] `make check-fmt`
- [ ] `make lint`
- [ ] `make typecheck`
- [ ] `make test`
- [ ] `bun semantic`
- [ ] `bun ff`
- [ ] Manual Biome boundary check (see ExecPlan, Stage E)

## References

- Lody session: https://lody.ai/leynos/sessions/${LODY_SESSION_ID}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Substitute `${LODY_SESSION_ID}` into the body before invoking `gh`. Do
not push to `main`. Do not push force-with-lease unless explicitly
requested.

## Validation and acceptance

Acceptance is met when all of these are true:

- `src/domain/`, `src/application/`, and `src/adapters/` have the
  subdirectory tree from the in-scope HLD module layout, each with a
  `/** @file ... */` barrel.
- `tsconfig.json` exposes `paths` for `@domain/*`, `@application/*`,
  and `@adapters/*`, and `bun check:types` passes on the empty skeleton.
- `vite.config.ts` consumes the alias map from
  `scripts/import-boundary-paths.ts` (or a sibling module) without
  hand-maintained duplication.
- The custom guard resolves alias imports and reports cross-layer
  violations; `bun run lint:imports` exits 0 on the committed tree.
- Biome's `noRestrictedImports` override rejects an `@adapters/...`
  import added to a file under `src/domain/**`; the manual verification
  in Stage E demonstrates this.
- `tests/import-boundaries.test.ts`,
  `tests/path-aliases.config.test.ts`,
  `tests/biome-no-restricted-imports.config.test.ts`,
  `tests/biome-no-restricted-imports.integration.test.ts`, and
  `tests/biome-package-restrictions.parity.test.ts` cover the cases
  listed in Stage D and Stage E, including alias-four drift,
  third-party-name collisions against unanchored patterns, and Biome /
  AST guard package-list drift.
- `docs/developers-guide.md` documents the alias map and the dual
  enforcement layers; `docs/users-guide.md` is unchanged.
- `docs/roadmap.md` marks only item 1.2.1 as done.
- `make check-fmt`, `make lint`, `make typecheck`, `make test`,
  `bun semantic`, and `bun ff` all pass.
- The draft PR exists with the title prefix `(1.2.1)`, references this
  ExecPlan, and contains a Lody session link in `## References`.

Property tests with `fast-check` are not required because this item
introduces no domain invariant. Behavioural Gherkin tests are not
required because no externally observable workflow changes. End-to-end
Playwright tests are exercised through `bun ff` for regression
detection. A LemmaScript proof is not required because the change does
not introduce a business axiom.

## Idempotence and recovery

The directory and configuration edits are idempotent. If a patch is
partially applied, inspect the relevant subdirectories and re-apply only
the missing barrels or `paths` entries. Do not duplicate decision-log
entries.

The custom guard remains deterministic and side-effect free; it never
writes files while scanning.

If `bun ff` fails for an unrelated pre-existing reason, preserve the log
under `/tmp`, update `Surprises & Discoveries`, and ask for direction
before committing.

If a temporary manual-verification fixture is left behind in
`src/domain/__boundary-check__/` after Stage E, delete it before any
commit; the fixture must not enter version control.

## Artifacts and notes

Planning research findings recorded by the agent team:

- Biome `noRestrictedImports` is stable in v2.x under
  `linter.rules.style`, supports per-file `overrides`, lacks
  `allowTypeImports`, and matches import specifiers rather than
  resolved paths.
- Biome `noPrivateImports` (previously discussed as
  `useImportRestrictions`) enforces export-visibility via JSDoc
  annotations and does not express folder-graph rules. It is not a
  substitute.
- TypeScript 4.1+ allows `paths` without `baseUrl`; the project's
  TypeScript 5.6.x and `moduleResolution: "Bundler"` continue to honour
  that pattern.
- Vite 5.4 lacks `resolve.tsconfigPaths`; programmatic derivation in
  `vite.config.ts` is the lowest-risk single-source-of-truth approach
  without adding a dependency.

Worktree reconnaissance findings:

- No `paths`, `baseUrl`, `resolve.alias`, or `noRestrictedImports`
  configuration exists today.
- `src/domain/`, `src/application/`, and `src/adapters/` already have
  top-level barrels. `src/application/index.ts` re-exports
  `appMachine` and the related types from `./machines`.
- The custom guard handles relative and `src/`-prefixed imports only.
  Aliases must be expanded before classification.
- The repository does not depend on `markdownlint-cli` or `nixie`; if
  Markdown lint runs in CI, it does so via a separate tool path.

## Interfaces and dependencies

The shared alias map interface lives in `tools/path-aliases.ts`:

```typescript
// tools/path-aliases.ts
export type AliasPrefix = `@${string}`;
export type RepoRelativePath = string & {
  readonly __brand: "RepoRelativePath";
};

export type AliasEntry = readonly [AliasPrefix, RepoRelativePath];

export const PATH_ALIASES: readonly AliasEntry[] = Object.freeze([
  ["@domain", "src/domain" as RepoRelativePath],
  ["@application", "src/application" as RepoRelativePath],
  ["@adapters", "src/adapters" as RepoRelativePath],
] as const);
```

`scripts/import-boundary-paths.ts` re-exports the constant and adds the
guard-side helper:

```typescript
// scripts/import-boundary-paths.ts
export { PATH_ALIASES, type AliasPrefix, type RepoRelativePath } from "../tools/path-aliases";

export function expandPathAlias(importPath: string): string | undefined;
```

The guard-side classification interface remains:

```typescript
export type SourceLayer =
  | "domain"
  | "application"
  | "adapters"
  | "app"
  | "other";
export function classifySourcePath(
  path: string,
  options?: BoundaryCheckOptions,
): SourceLayer;
export function findBoundaryViolations(
  files: ReadonlyArray<SourceFileInput>,
  options?: BoundaryCheckOptions,
): ReadonlyArray<BoundaryViolation>;
```

The Vite consumer reads from `tools/path-aliases.ts` only:

```typescript
// vite.config.ts (excerpt)
import { PATH_ALIASES } from "./tools/path-aliases";

const resolveAliases = Object.fromEntries(
  PATH_ALIASES.map(([alias, target]) => [
    alias,
    path.resolve(__dirname, target),
  ]),
);

export default defineConfig({
  // ...
  resolve: { alias: resolveAliases },
});
```

No new external dependency is introduced.

Revision note: Initial draft created for approval. The plan documents
the alias map, the dual enforcement layers, the subdirectory skeleton,
and the validation gates, and keeps implementation blocked until
explicit user approval.

Revision note: Applied Logisphere pre-implementation review feedback.
Concrete changes: anchored every Biome `noRestrictedImports.patterns.group`
pattern (no leading `**/`); moved the alias-map constant to
`tools/path-aliases.ts` and re-exported through
`scripts/import-boundary-paths.ts`; strengthened the alias-map contract
to a branded tuple list with substring-collision and directory-existence
checks; added drift-resistant generation of Biome's expected pattern
set from `PATH_ALIASES`; replaced shape-only Biome assertion with an
end-to-end integration test invoking `bunx biome lint` on a `tmp/`
fixture, including a third-party-name collision case; added a parity
test that compares Biome's restricted-packages list to the AST guard's
`DISALLOWED_*` constants; moved manual verification fixtures to `tmp/`;
recorded the `src/app/` enforcement gap and the
`verbatimModuleSyntax`-plus-Biome `import type` carve-out as explicit
deferred risks for 1.2.2 and 1.4.x respectively.

# Architectural decision record (ADR) 012: Adopt Oxlint with the Unicorn and Deslop plugins

## Status

Proposed.

## Date

2026-10-31.

## Context and problem statement

The front-end application already runs Biome, Semgrep, Stylelint, and the
repository's own semantic scripts. Biome covers formatting, import ordering,
and a curated set of correctness rules, but it does not offer the breadth of
ECMAScript hardening rules that the Unicorn plugin provides, nor the
type-driven code-quality rules published as the Deslop plugin.

Adding a second JavaScript linter is only worthwhile if its findings are
adopted rather than suppressed. The new rules therefore have to respect the
existing documentation, biome and `df12-lints` requirements, avoid
contradicting each other, and remain pinned so that a gate result is
reproducible.

There is no earlier ADR that records the repository's linting strategy, so this
record also serves as the addendum that pins the tool versions.

## Decision drivers

- The gate must catch real defects rather than stylistic preferences that the
  existing tools already cover.
- Every new rule must be actionable in this codebase; a rule that only produces
  suppressions is noise.
- The rule set must be explicit and reviewable, not inherited silently from a
  plugin's evolving defaults.
- Rules that require a deliberate exception must justify it at the use site.
- Tool versions must be pinned exactly and recorded next to the decision so a
  future upgrade is an intentional change.

## Decision

Adopt [Oxlint](https://oxc.rs/docs/guide/usage/linter) as a second JavaScript
linter, configured through `.oxlintrc.json`, and run it from the `lint` script
so `make lint` and `bun test:all` enforce it.

### Pinned versions

| Package           | Version  | Role                                                 |
| ----------------- | -------- | ---------------------------------------------------- |
| `oxlint`          | 1.82.0   | Linter binary and built-in rule implementations.     |
| `ai-deslop`       | 0.4.9    | JavaScript plugin providing the `deslop/*` rules.    |
| `oxlint-tsgolint` | 7.0.2004 | Type-aware rule engine used by `typescript/*` rules. |

The three packages are pinned to exact versions in `package.json`. Caret or
tilde ranges would let a transitive rule change alter gate results without a
reviewed diff.

### Rule selection

The configuration disables every Oxlint category and enables an explicit list
of rules. That keeps the gate stable when a plugin adds a rule to a category,
and it makes each accepted rule visible in review.

- `unicorn/*` — the plugin's recommended profile, applied to `src`, `tests`,
  `scripts`, `tools`, the token pipeline, and the repository configuration
  files.
- `deslop/*` — every rule the plugin publishes at 0.4.9, covering runtime type
  narrowing, assertion hygiene, dictionary contracts, and test structure.
- `typescript/no-deprecated`, `typescript/no-require-imports`,
  `typescript/no-floating-promises`, and
  `typescript/no-unnecessary-condition` — type-aware checks that the existing
  Biome configuration cannot express.
- `no-unreachable` — a cheap correctness guard that complements the above.

### Conflict resolution

Only one Unicorn recommended rule is disabled:

- `unicorn/no-null` — the DOM and Bun interop contracts in this repository pass
  `null` deliberately (for example `MediaQueryList` listeners, JSON payload
  fields, and storage reads). Requiring `undefined` everywhere would replace a
  platform contract with casts and conversions at each boundary.

One Unicorn rule is disabled for a directory rather than globally:

- `unicorn/no-empty-file` is switched off for `src/**/index.ts`. The layer
  barrels are intentionally documentation-only files that record the
  architecture rules for their directory, and the path-alias contract requires
  those directories to exist. The rule remains active for every other file.

Where Unicorn and Deslop cover the same ground, the Unicorn rule wins. No such
conflict currently requires a disabled rule; both plugins agree on
`typeof`-based narrowing, for example.

No rule is disabled to accommodate TypeDoc or the `df12-lints` guidance.
TypeDoc concerns documentation comments, and its requirements are satisfied by
the existing documentation gate. Rules that a specific platform API makes
unavoidable, such as the deprecated `MediaQueryList.addListener` and
`removeListener` members, are disabled per line with an explanatory comment
rather than globally.

## Consequences

- New code must satisfy the Unicorn and Deslop contracts. Type assertions need a
  `SAFETY:` justification, dictionaries need concrete value types, and
  environment globals are addressed through `globalThis`.
- The existing source, scripts, tests, and configuration files were remediated
  rather than suppressed. An unused `tailwind.config.cjs` was removed, CommonJS
  configuration files became ESM, and test helpers now validate external
  payloads with Valibot.
- Gate output grows by one command, but Oxlint is fast enough that the added
  time is small compared with the test and TypeScript stages.
- Upgrading Oxlint, `ai-deslop`, or `oxlint-tsgolint` is a deliberate change
  that must update this record and re-run the full gate.

## Alternatives considered

- **Keep Biome only.** Rejected: Biome does not provide the Unicorn rule set or
  Deslop's type and assertion checks.
- **Enable Oxlint's category presets.** Rejected: presets change between
  releases, so a dependency bump could add rules without a visible diff.
- **Suppress the new findings.** Rejected: the repository's guidance is to fix
  the underlying issue, and a lint configuration that mostly suppresses itself
  does not improve the code.
- **Use floating version ranges.** Rejected: a gate must produce the same result
  for a given commit, independent of when it runs.

## References

- [Oxlint documentation](https://oxc.rs/docs/guide/usage/linter)
- [`ai-deslop` plugin](https://github.com/maharshi365/deslop)
- [Unicorn ESLint plugin rule reference](https://github.com/sindresorhus/eslint-plugin-unicorn#rules)

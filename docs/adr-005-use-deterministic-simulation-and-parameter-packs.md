<!-- markdownlint-disable-next-line MD013 -->
# Architectural decision record (ADR) 005: Use deterministic simulation and parameter packs

## Status

Accepted.

## Date

2026-04-30.

## Context and problem statement

Vibe Coder is built from coupled equations and event hazards. Designers need to
tune those equations, self-play agents need to evaluate them, and players need
outcomes that feel caused rather than arbitrary. Ad hoc constants and
wall-clock-dependent updates would make the simulation hard to reproduce.

## Decision drivers

- The same seed, parameter pack, commands, and tick sequence should reproduce a
  run within supported limits.
- Self-play must evaluate parameter variants without launching the whole React
  app.
- Balancing constants must be versioned and reviewable as product artefacts.
- Offline catch-up must use equivalent rules to active simulation or document
  approved approximations.
- Randomness must be seeded and recorded enough for debugging.

## Requirements

### Functional requirements

- The system must simulate resources, debt, alignment, incidents, progression,
  and endings from explicit inputs.
- The system must load a named parameter pack for each run.
- The system must show parameter-pack identity in debug and exported run data.
- The system must reject saves when their parameter pack is missing unless a
  migration path exists.

### Technical requirements

- Simulation functions must accept `RunState`, delta time, random source
  snapshot, and parameter pack as inputs.
- Simulation functions must not read wall-clock time, React state, browser
  storage, or renderer state directly.
- Parameter packs must contain all tunable constants for stages, debt, market,
  power, incidents, alignment, endings, and fun scoring.
- Parameter-pack changes must be hashable and included in replay or export
  metadata.

## Options considered

### Option A: Hard-coded constants

Hard-coded constants are quick, but make balancing difficult and conceal design
changes inside source diffs.

### Option B: Remote live configuration

Remote configuration could enable live balancing, but conflicts with the
offline-first MVP and adds version drift.

### Option C: Versioned local parameter packs

Versioned packs are deterministic, testable, reviewable, and compatible with
self-play and offline play.

<!-- markdownlint-disable MD013 -->

| Topic             | Chosen direction                     | Main alternative                   |
| ----------------- | ------------------------------------ | ---------------------------------- |
| Reproducibility   | Pack hash plus seed supports replay  | Remote config can drift            |
| Design review     | Constants are grouped by game system | Hard-coded values are scattered    |
| Offline fit       | Fully local                          | Remote config needs network policy |
| Balancing tooling | Self-play can sweep packs            | Requires bespoke extraction        |

<!-- markdownlint-enable MD013 -->

_Table 1: Trade-offs for ADR 005._

## Decision outcome / proposed direction

The project will use deterministic simulation functions driven by versioned
parameter packs. The first implementation may tolerate small floating-point
differences across browsers, but replay, self-play, and debugging must use
stable seeds, stable tick ordering, and parameter-pack hashes.

The following type sketch shows the intended tick input boundary.

```typescript
type SimTickInput = {
  run: RunState;
  dtSeconds: number;
  random: RandomSourceSnapshot;
  parameterPack: ParameterPack;
};

type SimTickOutput = {
  run: RunState;
  domainEvents: readonly DomainEvent[];
  visualSignals: readonly VisualSignal[];
  audioEvents: readonly AudioEvent[];
};
```

## Accepted decisions: seeded pseudo-random number generator

Roadmap item 1.1.4 closes the "Choose the seeded pseudo-random number
generator" outstanding decision. The accepted PRNG is **sfc32** (Chris
Doty-Humphrey, "Small Fast Counting v4") in the **bryc-2022** JavaScript
reference port. The runner-up is **xoshiro128++** (Blackman and Vigna, 2018),
recorded as the documented fallback should sfc32 ever need to be replaced.

### Why sfc32

- State: 128 bits as four `uint32` words (`a`, `b`, `c`, `d`).
- Output: a single `uint32` per step, exposed to consumers via the
  canonical `(value >>> 0) / 4294967296` conversion to `[0, 1)`.
- Period: minimum 2^32 by construction; average period approximately
  2^127 (Doty-Humphrey, PractRand `RNG_engines.txt`).
- Statistical quality: passes PractRand to many terabytes and passes
  TestU01 BigCrush. No known empirical failure modes for the bit ranges used by
  the simulation.
- JavaScript fitness: 32-bit add, xor, shift, and rotate only. No
  `BigInt`, no 64-bit arithmetic. This matters because saves must replay
  byte-identically across browsers, Bun, and Node-based self-play harnesses.
- Determinism: a pure function of the four-word state. No
  platform-dependent intrinsics.
- Licence: PractRand is public-domain; the bryc reference is public. The
  in-house port will be released under the repository's licence at
  implementation time.

xoshiro128++ remains a credible fallback: it has the same 128-bit state,
published jump and long-jump polynomials, and a public-domain reference at
`prng.di.unimi.it`. Any later move from sfc32 to xoshiro128++ (or any other
algorithm) is treated as a PRNG change and forces a parameter-pack MAJOR bump
under the migration policy below.

### Seeding strategy

1. Accept the user-facing seed as either a 32-bit unsigned integer or a
   short string.
2. For string seeds, hash to a 32-bit integer using **xmur3** (bryc).
3. Expand the 32-bit integer to a 128-bit sfc32 state by stepping
   **SplitMix32** four times. SplitMix32 is the JavaScript-safe stateless
   mixing function adapted from Steele, Lea, and Flood's 2014 paper and Vigna's
   splitmix64; it uses pure 32-bit operations with `Math.imul`.
4. Warm the generator by discarding the first 12 outputs, per the
   bryc-2022 reference, so that early output is decoupled from low-entropy
   seeds.

### Substream derivation

sfc32 has no jump-ahead polynomial by design. Independent streams per
simulation feature must derive from a per-feature seed using
`splitmix32(masterSeed XOR xmur3(featureLabel)())`, then expand to 128 bits via
four further SplitMix32 steps. xoshiro128++'s jump and long-jump polynomials
are intentionally not relied on, so that the substream-derivation contract
survives a fallback algorithm swap.

### Save-identity fields for the PRNG

Every saved run carries the PRNG identity as separate fields, independent of
the parameter pack:

- `prngName: "sfc32"` — algorithm name as a stable string.
- `prngVariant: "bryc-2022"` — names the reference port used.
- `prngVersion: 1` — integer bumped only when the step function or the
  output-conversion convention changes in any byte-affecting way.
- `prngState: [a, b, c, d]` — the four-word state at the snapshot tick.

Changing the PRNG name, variant, or version forces a parameter-pack MAJOR bump
and quarantines existing runs (see "Accepted migration policy" below).

### Property-test separation

Property tests written with `fast-check` may continue to use the framework's
own random number generator (RNG), `pure-rand`. The game's deterministic stream
and the property-test exploration stream serve different roles — replay
reproducibility versus input-space exploration — and must not be coupled. Adding
`fast-check` or `pure-rand` does not change the game's runtime PRNG choice.

### Test discipline

Golden seed-to-output vectors (for example, seed `1`, the first 1000 outputs)
must be snapshotted in the test suite and verified on every Node, Bun, and
browser target before any code that depends on the PRNG ships.

## Accepted migration policy

Roadmap item 1.1.4 closes the "Define the version migration policy for runs
created under older packs" outstanding decision. The accepted policy is **pin
pack triple, refuse silent advancement, allow explicit upgrade only through
registered transforms.**

### Parameter-pack identity

A `ParameterPack` is identified by the triple `(id, version, contentHash)`:

- `id` is a stable lineage string such as `"core"`, `"core.spicy"`, or
  `"community.foo"`. Lineage identifiers are never reused for a different pack.
- `version` is a semantic version string `MAJOR.MINOR.PATCH` per
  `semver.org`, with the tier rules below.
- `contentHash` is a deterministic content hash over the canonicalized,
  JSON-sorted pack body excluding `id` and `version`. The hash algorithm is
  recommended as BLAKE3 or SHA-256; the exact choice is deferred to roadmap
  item 1.3.2 or 1.4.1 when the implementation lands.

Canonicalization, sketched so independent producers and consumers agree on the
hashed bytes:

- Recursively sort object keys lexicographically by Unicode code-point
  order; arrays preserve their declared order.
- Strip `id` and `version` from the top level before serialization.
- Emit JSON without insignificant whitespace (no padding inside or
  between tokens) and without a trailing newline.
- Emit strings with the minimal JSON escape set (`"`, `\`, and control
  characters U+0000 through U+001F) and use lowercase `\uXXXX` only for control
  characters that have no shorter escape.
- Represent numbers in a normalized form: integers as their shortest
  decimal representation with no leading sign for non-negative values and no
  leading zeros; non-integers as their shortest IEEE-754 round-trip decimal
  (the form `Number.prototype.toString` produces in ECMAScript). Reject `NaN`
  and `+/-Infinity` at the validation boundary so they never enter the hashed
  body.
- Disallow duplicate keys at the validation boundary so canonical
  output is unambiguous.

These rules pin the hash bytes that distinguish a PATCH metadata edit (hash
differs, numeric subset byte-identical) from a MINOR tuning change (hash
differs, numeric subset differs). The exact serializer implementation,
including the canonicalization library or hand-rolled encoder, is deferred to
roadmap item 1.3.2 or 1.4.1.

The Dexie `parameterPacks` store (already in ADR 004's illustrative schema) is
append-only at the `(id, version, contentHash)` grain. A row keyed by content
hash cannot be deleted while any run pins it.

### Semantic-version tier rules

- **PATCH**: comment, label, documentation, or other metadata edit that
  does not change any numeric simulation value. The hash differs but the
  canonicalized numeric subset is byte-identical. May silently rebind a run on
  load. A `PackRebindEvent` is logged so replays remain self-describing.
- **MINOR**: additive or pure tuning. A new optional field with a
  default, a new ending threshold that does not invalidate existing endings, or
  numeric tweaks inside a designer-set tuning window (initial recommended
  ceiling: ten per cent delta per field). Does not change the shape of the
  simulation. Requires an explicit player-initiated upgrade prompt; never
  silent.
- **MAJOR**: any change that would invalidate a recorded
  `EventResolution` or `UnlockLedger` entry produced under the older pack.
  Includes renamed or removed fields, changed units or ranges, new mandatory
  fields, new tick steps, and any PRNG change. Quarantines existing runs as
  read-only and archive-only.

### Behaviour on save load and JSON import

<!-- markdownlint-disable MD013 -->

| Situation                                                         | Required behaviour                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pinned `(id, version, contentHash)` is registered in Dexie        | Continue.                                                                             |
| Pinned `id+version` exists but `contentHash` differs              | Refuse to advance the run. Offer restore-from-export or archive.                      |
| Pinned pack absent (JSON import from another machine)             | Require import-or-archive flow; JSON export must embed the full pack body.            |
| Newer compatible pack version exists (same MAJOR, >= MINOR/PATCH) | Offer an explicit "Upgrade run to pack X.Y.Z" action with diff summary. Never silent. |
| Newer incompatible pack version exists (different MAJOR)          | Mark the run read-only and archive-only.                                              |
| PATCH-only difference whose canonicalized numeric subset matches  | Auto-rebind silently. Log `PackRebindEvent` to the run event log.                     |

<!-- markdownlint-enable MD013 -->

_Table 2: Behaviour-on-load matrix for ADR 005._

### Per-version transforms

Per-version transform functions are registered in code for each MINOR bump that
requires data adjustment. Transforms apply sequentially in semantic-version
order, mirroring Factorio's migration ordering and Mojang's DataFixerUpper
philosophy. Transform code lands with roadmap items 1.3.2 and 1.4.x; ADR 005
ratifies only the contract.

### PRNG identity and pack identity are orthogonal

The PRNG identity fields (`prngName`, `prngVariant`, `prngVersion`) are
recorded independently of the parameter-pack triple. Changing any of the three
forces a parameter-pack MAJOR bump and quarantines existing runs. The runtime
engine refuses to load a pack whose declared `prngContract` (added in 1.3.2)
does not match the engine's compiled PRNG. Silent re-binding across PRNG
changes is explicitly forbidden.

### JSON import and export

JSON export of a run includes the full pack body, not merely its hash. JSON
import registers the pack into `parameterPacks` with
`status: "imported-from-save"` if its hash validates against the embedded body;
otherwise the import is refused. This pre-decides ADR 004's "imported saves can
include custom parameter packs" question in the affirmative; the broader ADR
004 import/export format question remains open and is owned by ADR 004.

### Dexie schema migration orthogonality

Dexie schema migrations remain strictly orthogonal to parameter-pack
migrations. A Dexie `db.version(n).upgrade()` may rename a table column; it
never alters a stored `parameterPackContentHash`. Both layers must succeed for
a run to load.

### Self-play and ADR 011 integration

Self-play reports (ADR 006) must carry the same `(id, version, contentHash)`
triple. ADR 011's `canPromote` predicate already requires the pack hash as part
of `TrialEvidence`. This policy is the operational complement: promotion is
illegal if the candidate pack would silently re-bind any existing run without a
registered transform.

### Required saved-run fields

Every saved run must carry the following identity fields. Loaders must reject a
save where any of these fields is missing; silent default coercion is forbidden.

- `saveSchemaVersion`: integer that drives the Dexie storage-shape
  migration ladder.
- `simTickContractVersion`: integer bumped when `SimTickInput`,
  `SimTickOutput`, or the tick-step order changes.
- `parameterPackId`, `parameterPackVersion`,
  `parameterPackContentHash`: the pack pin.
- `prngName`, `prngVariant`, `prngVersion`: the PRNG pin (with
  `prngState` carried inside the snapshot itself).
- `seed`: as already required by HLD rule 7.
- `eventLogTailDigest`: hash of the event log up to the last persisted
  tick, to let replay detect tampering.

The following type sketch shows the intended run-identity boundary.

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

## Goals and non-goals

- Goals:
  - Make simulation outcomes explainable and reproducible enough for tuning.
  - Let self-play evaluate parameter variants by swapping packs rather than
    editing source.
  - Keep all balance constants discoverable and reviewable.
- Non-goals:
  - Guarantee bitwise identity across every browser and hardware target in the
    first slice.
  - Implement remote live balance updates in the offline-only MVP.
  - Let parameter packs override domain invariants or validation rules.

## Migration plan

1. Create a baseline `ParameterPack` type and one checked-in default pack.
2. Move all stage, debt, revenue, incident, power, alignment, and ending
   constants into the pack.
3. Add seedable random source snapshots to tick input and run exports.
4. Add parameter-pack hash validation to saves and self-play reports.

## Known risks and limitations

- Strict determinism can be undermined by floating-point differences if not
  tested.
- Parameter packs can become too broad and obscure domain invariants.
- Tuning tools can overfit to fun proxies and remove delightful weirdness.

## Outstanding decisions

- Decide when fixed-point arithmetic becomes necessary.

## Architectural rationale

The design depends on process intensity: compact rules should create
surprising, legible outcomes. Deterministic simulation and versioned packs make
that process inspectable rather than mystical.

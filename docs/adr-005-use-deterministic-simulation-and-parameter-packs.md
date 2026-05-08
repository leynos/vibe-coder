# Architectural decision record (ADR) 005: Use deterministic simulation and parameter packs

## Status

Proposed.

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

| Topic             | Chosen direction                     | Main alternative                   |
| ----------------- | ------------------------------------ | ---------------------------------- |
| Reproducibility   | Pack hash plus seed supports replay  | Remote config can drift            |
| Design review     | Constants are grouped by game system | Hard-coded values are scattered    |
| Offline fit       | Fully local                          | Remote config needs network policy |
| Balancing tooling | Self-play can sweep packs            | Requires bespoke extraction        |

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

- Choose the seeded pseudo-random number generator.
- Decide when fixed-point arithmetic becomes necessary.
- Define the version migration policy for runs created under older packs.

## Architectural rationale

The design depends on process intensity: compact rules should create surprising,
legible outcomes. Deterministic simulation and versioned packs make that process
inspectable rather than mystical.


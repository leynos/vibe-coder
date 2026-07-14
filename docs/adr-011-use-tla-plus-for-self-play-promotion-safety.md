# Architectural decision record (ADR) 011: Use TLA+ for self-play promotion

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

ADR 006 introduces adversarial self-play for parameter tuning. That harness will
run agent archetypes across seed sets, collect deterministic traces, score
runs, detect exploits, compare parameter packs, and promote approved balance
packs.

The detailed Vibe Coder economy is not the right target for TLA+. Throughput,
debt, product-market fit, karma, alignment, revenue, and power equations belong
in TypeScript domain code, property tests, replay tests, Monte Carlo runs, and
self-play reports.

The self-play promotion lifecycle is different. It is a coordination problem
with workers, immutable parameter packs, seeded trials, trace validation, score
aggregation, failure handling, and a canonical default pack. That is the place
where impossible states can quietly appear: stale worker output, missing
coverage, duplicate traces, nondeterministic results, and exploit reports that
are computed but not respected.

The project therefore needs a formal model for the self-play orchestration and
promotion contract, not for the full game simulation.

## Decision drivers

- A default parameter pack must not be promoted from incomplete, stale, failed,
  nondeterministic, or exploitable evidence.
- Self-play workers may fail, time out, duplicate output, return stale output,
  or report a trace against the wrong pack hash.
- Workers must never mutate parameter packs or update the canonical default
  pack.
- The promotion contract must remain stable as the implementation moves between
  local development, browser workers, Node-based harnesses, or future
  Continuous Integration (CI) jobs.
- The formal model must stay small enough to be maintained by game and tooling
  developers.
- Formal verification must complement, not replace, human judgement about fun.

## Requirements

### Functional requirements

- The system must model parameter-pack promotion as an explicit lifecycle.
- The system must require every mandatory agent archetype and seed to produce
  accepted evidence before a pack can be promoted.
- The system must prevent exploit, invariant-failure, timeout, failed, stale,
  or nondeterministic trial results from improving a promotion candidate.
- The system must ensure the promoted default pack hash matches the scored pack
  hash.
- The system must require deterministic trace agreement for duplicate accepted
  trial outputs with the same pack hash, simulation version, agent version, and
  seed.
- The system must turn every useful counterexample into an executable
  TypeScript regression fixture.

### Technical requirements

- The TLA+ model must abstract simulation results into lifecycle events such as
  `TrialCompleted`, `TraceAccepted`, `ExploitDetected`, `ScoreComputed`, and
  `DefaultPackUpdated`.
- The model must not encode Vibe Coder economy equations, audio events, asset
  workflows, Dexie schemas, or React user-interface workflows.
- Trial evidence must include `packHash`, `simulationVersion`, `agentVersion`,
  `seed`, `traceHash`, `traceStatus`, and `scoreStatus`.
- Parameter packs must be immutable after creation. Every changed pack must get
  a new identifier and hash.
- Only the promotion service may change canonical parameter-pack status or the
  current default pack.
- The TypeScript promotion guard must mirror the TLA+ `CanPromote` predicate.
- The formal model must live under a repository path such as
  `formal/tla/self-play-promotion/` with a short README and checker
  configuration.

## Options considered

### Option A: Do not use formal modelling

The implementation would rely on unit tests, property tests, replay tests, and
self-play reports. This keeps the toolchain simpler, but it leaves orchestration
bugs to emerge through test cases that developers happened to imagine.

### Option B: Model the full game economy in TLA+

The model would try to include throughput, debt, product-market fit, karma,
power, incidents, and fun scoring. This is too broad. It would duplicate the
TypeScript domain model badly, explode the state space, and distract from the
actual correctness envelope that needs formal checking.

### Option C: Use XState for the promotion lifecycle only

XState can describe executable workflow states in TypeScript. It is useful for
optimization-lab user interfaces and orchestration code, but it does not explore
bad worker behaviour or prove safety invariants across nondeterministic
interleavings.

### Option D: Use TLA+ for the promotion contract only

TLA+ models the small distributed-system part of self-play: scheduling,
completion, trace validation, score acceptance, exploit handling, promotion,
and default-pack authority. The model abstracts game equations into result
classifications and checks the lifecycle contract directly.

| Topic | Option A: no model | Option B: full economy | Option C: XState only | Option D: TLA+ promotion contract |
| --- | --- | --- | --- | --- |
| Scope control | Simple, but weak | Too broad | Good runtime scope | Focused formal scope |
| Worker failures | Covered only by tests | Hard to include cleanly | Possible, but not exhaustive | Modelled nondeterministically |
| Promotion safety | Conventional tests | Buried in huge model | Executable workflow checks | Explicit invariants |
| Fun judgement | Human and self-play | Misleading formal target | Human and self-play | Human and self-play |
| Maintenance cost | Low | Very high | Moderate | Moderate if kept small |

_Table 1: Comparison of formal-modelling options for self-play._

## Decision outcome / proposed direction

The project will use TLA+ to model the self-play harness orchestration and
parameter-pack promotion contract.

The model will prove safety properties about trial coverage, trace acceptance,
score authority, exploit handling, pack immutability, and default-pack updates.
It will also check bounded liveness properties under explicit fairness
assumptions, so candidates do not remain forever unapproved or unrejected
because work was starved.

The model will not prove that a parameter pack is fun. It will prove that bad
or incomplete evidence cannot be laundered into a promoted default pack. The
self-play harness and human review remain responsible for discovering whether a
pack is enjoyable, varied, legible, and resistant to boring strategies.

## Goals and non-goals

- Goals:
  - Prevent untested, stale, exploitable, nondeterministic, or failed evidence
    from promoting a parameter pack.
  - Keep worker authority separate from promotion authority.
  - Make promotion evidence auditable and replayable.
  - Convert TLA+ counterexamples into regression tests.
  - Keep the formal model small enough to review and evolve.
- Non-goals:
  - Model Vibe Coder's full economy equations.
  - Prove that no possible boring strategy exists.
  - Replace adversarial self-play agents or human playtesting.
  - Model React, XState user-interface flows, Dexie migrations, audio events,
    or generated-asset workflows.

## Proposed model scope

The model will treat the following concepts as finite sets or records:

| Entity | TLA+ abstraction |
| --- | --- |
| `ParameterPack` | Immutable pack identifier, hash, and status. |
| `SeedSet` | Finite set of seeds required for evaluation. |
| `AgentArchetype` | Required agent class, such as growth goblin or exploit hunter. |
| `Trial` | One `(pack, agent, seed)` evaluation unit. |
| `Trace` | Abstract result: accepted, failed, timeout, nondeterministic, or invariant failed. |
| `Score` | Abstract classification: acceptable, boring, exploitable, or unstable. |
| `PromotionCandidate` | Candidate pack with accumulated evidence. |
| `DefaultPack` | Current runtime-approved default parameter pack. |

_Table 2: TLA+ abstractions for the self-play promotion model._

The model will include these abstract transitions:

- `PackCreated`
- `TrialScheduled`
- `TrialStarted`
- `TrialCompleted`
- `TrialFailed`
- `TrialTimedOut`
- `TraceAccepted`
- `TraceRejected`
- `ExploitDetected`
- `ScoreComputed`
- `PromotionProposed`
- `PromotionApproved`
- `PromotionRejected`
- `DefaultPackUpdated`

Workers must be modelled as unreliable actors. A worker may fail, time out,
return a duplicate result, return stale output, or report against the wrong
pack hash. The promotion rules must still protect the default pack.

For screen readers: the following TLA+ sketch describes the intended promotion
guard. It is illustrative, not the final checked specification.

```tla
CanPromote(pack) ==
  /\ packStatus[pack] = "candidate"
  /\ RequiredCoverageComplete(pack)
  /\ NoAcceptedExploit(pack)
  /\ NoInvariantFailures(pack)
  /\ NoFailedRunLaundering(pack)
  /\ DeterministicTraces(pack)
  /\ ScoresMatchPackHash(pack)
```

_Figure 1: Illustrative TLA+ promotion guard._

## Required invariants

The first model must check these safety properties:

| Invariant | Meaning |
| --- | --- |
| No untested promotion | Every promoted pack has accepted traces for all required agents and seeds. |
| No stale promotion | A score for pack hash `H` cannot promote pack hash `H2` when `H != H2`. |
| No exploit promotion | A pack with an accepted exploitable trace cannot become default. |
| No failed-run laundering | Failed, timed-out, rejected, or nondeterministic trials cannot improve a candidate score. |
| No worker authority leak | Workers can produce trial outputs, but cannot approve packs or update the default pack. |
| No partial default | The default pack always refers to an approved immutable pack. |
| Deterministic trace agreement | Accepted duplicate traces for the same pack, agent, seed, and simulation version must agree on trace hash. |

_Table 3: Initial safety invariants for the self-play promotion model._

## Required liveness properties

The first model should check bounded liveness with explicit fairness
assumptions:

- Every scheduled trial eventually completes, fails, or times out.
- Every promotion candidate eventually becomes approved or rejected.
- Every required agent archetype eventually receives work for each candidate
  pack.

The model may need fairness assumptions for the scheduler and promotion
service. Without those assumptions, the checker can correctly find starvation
traces where the scheduler simply never gives a required agent any work.

## Implementation impact

This ADR forces these implementation choices:

1. Parameter packs are immutable.
2. Every trial result records determinism metadata.
3. Scores point to trace evidence, not just aggregate metrics.
4. Workers write trial outputs but cannot approve packs.
5. The promotion service is the only authority that can update default-pack
   state.
6. The TypeScript `canPromote` function mirrors the TLA+ promotion predicate.
7. TLA+ counterexamples become regression fixtures.

A minimal TypeScript evidence record should resemble this shape:

```ts
type TrialEvidence = Readonly<{
  trialId: TrialId;
  packHash: PackHash;
  simulationVersion: Semverish;
  agentVersion: Semverish;
  seed: Seed;
  traceHash: TraceHash | null;
  traceStatus:
    | "accepted"
    | "rejected"
    | "failed"
    | "timeout"
    | "nondeterministic"
    | "invariantFailed";
  scoreStatus: "none" | "acceptable" | "boring" | "exploitable" | "unstable";
}>;
```

_Figure 2: Minimal TypeScript evidence shape implied by the formal model._

## Migration plan

1. Add `formal/tla/self-play-promotion/` with a small TLA+ specification,
   checker configuration, and README.
2. Model the first constants: `Packs`, `Agents`, `Seeds`, `RequiredAgents`, and
   `RequiredSeeds`.
3. Add bad-worker transitions for duplicate, stale, failed, timed-out,
   nondeterministic, and wrong-hash results.
4. Check the initial safety invariants and liveness properties on a small
   bounded model.
5. Implement the TypeScript evidence model and `canPromote` guard.
6. Add negative fixtures corresponding to the first counterexamples.
7. Wire the self-play report to show coverage, trace status, score status, pack
   hash, and promotion eligibility.
8. Decide whether the checker runs in CI for a small model or remains a manual
   maintainer gate until the toolchain cost is better understood.

## Known risks and limitations

- A small formal model can create false confidence if it omits an important
  implementation behaviour.
- TLA+ state spaces can grow quickly if the model becomes too detailed.
- The model can drift from the TypeScript implementation unless counterexamples
  and promotion predicates are kept synchronized.
- Liveness checks require careful fairness assumptions.
- The model does not prove that the exploit hunter has found every exploit.
- The model does not prove that a parameter pack is fun.

## Outstanding decisions

- Choose the exact checker command, Makefile target, and CI policy.
- Decide whether to include Apalache, TLC only, or another TLA+-compatible
  checker in maintainer tooling.
- Define the smallest useful model size for routine checks.
- Define how counterexamples are serialized into TypeScript fixtures.
- Decide whether `canPromote` should be hand-maintained, generated from a
  shared contract, or checked by contract tests only.

## Architectural rationale

This decision follows the same boundary as ADR 006. Adversarial self-play finds
boring or exploitative parameter packs; TLA+ verifies that the promotion
pipeline cannot ignore or launder those findings.

The split also mirrors the Skyjoust validator precedent: formal or model-based
checking should protect the high-level lifecycle contract rather than duplicate
fine-grained game simulation. Vibe Coder applies that lesson to optimization
infrastructure. The TypeScript simulation owns tick-level behaviour. The TLA+
model owns the promotion safety envelope.

This also supports the project's hexagonal direction. Self-play agents are
inbound adapters over the application core. Workers and persistence are driven
systems. The promotion service owns the application-level decision about which
parameter pack becomes canonical. TLA+ makes that authority boundary explicit
and testable.

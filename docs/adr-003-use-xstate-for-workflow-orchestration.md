# Architectural decision record (ADR) 003: Use XState for workflow orchestration

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

Vibe Coder has several explicit workflows: app boot, asset loading, save
loading, run lifecycle, policy editing, incident prompts, progression unlocks,
autopilot mode, and audio mood. These workflows need visible states and guarded
transitions. Numeric simulation state, however, should remain a domain model
rather than an enormous state-machine context.

## Decision drivers

- Impossible user interface states must be ruled out through explicit
  transitions.
- Long-running workflows need model tests and readable diagrams.
- The simulation tick must remain separate from interaction orchestration.
- Developer tools should inspect state node paths during debugging.
- Future authoring and asset import flows will need the same workflow
  discipline.

## Requirements

### Functional requirements

- The system must model app boot, run lifecycle, policy editing, event prompts,
  unlock review, and ending states explicitly.
- The system must prevent policy drafts, incident resolution, and run
  transitions from entering invalid combinations.
- The system must allow presentation components to render from state-machine
  snapshots.

### Technical requirements

- XState machines must orchestrate workflow state rather than own resource
  equations.
- Simulation ticks must call pure domain services and return events consumed by
  machines and adapters.
- Machine definitions must be testable through transition tests and model
  coverage.
- Machine actions must enqueue commands or call application services instead of
  mutating domain state directly.

## Options considered

### Option A: React component state

Component state is simple at first, but complex workflow combinations can become
implicit and hard to test.

### Option B: Reducers and context only

Reducers are explicit, but guard conditions, parallel states, delayed events,
and dev-tool visibility are weaker than a formal machine model.

### Option C: XState for workflow orchestration

XState provides explicit state nodes, guards, actions, model testing, and visual
inspection while leaving numerical simulation outside the graph.

| Topic                | Chosen direction                   | Main alternative          |
| -------------------- | ---------------------------------- | ------------------------- |
| Invalid states       | Guarded transitions                | Often implicit            |
| Debugging            | Machine node paths are inspectable | Depends on custom logging |
| Simulation equations | Remain pure domain services        | May drift into UI state   |
| Learning cost        | Moderate                           | Low initially             |

_Table 1: Trade-offs for ADR 003._

## Decision outcome / proposed direction

The project will use XState for application and interaction workflows. Machines
will coordinate lifecycle, editing, prompt, unlock, autopilot, and audio mood
states. Domain services will continue to own resource calculation and simulation
transitions.

## Goals and non-goals

- Goals:
  - Represent high-level lifecycle and user interaction states explicitly.
  - Enable transition tests for event prompts, policy commits, and unlock flows.
  - Keep game equations independent of XState runtime concerns.
- Non-goals:
  - Store every resource value or debt vector entry in XState context.
  - Use XState as the persistence format for saves.
  - Replace pure domain tests with machine tests.

## Migration plan

1. Define `app.machine.ts` for boot, asset loading, save loading, title,
   running, and ending states.
2. Define `run.machine.ts` for paused, running, deep chill, catch-up, and ending
   transitions.
3. Define `policy.machine.ts`, `event.machine.ts`, and `progression.machine.ts`
   around their modal workflows.
4. Add model tests for transitions that should never be reachable.

## Known risks and limitations

- Machine context can become a hidden global store if boundaries are not
  enforced.
- Over-modelled machines can slow down iteration on small UI components.
- Guard logic can duplicate domain validation if application services are not
  the source of truth.

## Outstanding decisions

- Machines are centralized under `application/machines/` rather than colocated
  with individual feature directories.
- The model-test harness uses `@xstate/test` with Bun; graph export uses the
  XState developer tools inspector.
- Autopilot is a parallel state region of `run.machine` rather than a separate
  top-level machine.

## Architectural rationale

A policy-driven idle game remains interactive only when player intent and system
response form a clear conversation. Explicit state machines help the application
listen to player commands, think through guarded workflow transitions, and speak
through legible user interface states without smearing those responsibilities
across React components.


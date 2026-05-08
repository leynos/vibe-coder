# Architectural decision record (ADR) 010: Run fixed-tick simulation outside React rendering

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

Vibe Coder will render a living dashboard with React controls, charts, Canvas
animation, audio, and idle catch-up. React rendering is not an appropriate
authority for simulation timing. The game needs stable tick ordering, responsive
controls, and optional worker execution as the model grows.

## Decision drivers

- Simulation should continue at fixed logical intervals regardless of visual
  frame rate.
- React renders should not accidentally advance or repeat authoritative
  simulation steps.
- Canvas and audio presentation need interpolated or derived signals, not
  ownership of state.
- Self-play and tests should run the tick loop without mounting React.
- Large late-game simulations may need Web Worker isolation to keep the user
  interface responsive.

## Requirements

### Functional requirements

- The system must process active simulation, pause, deep chill, and offline
  catch-up through the same application service boundary.
- The system must expose derived view models to React and Canvas after ticks
  complete.
- The system must support throttling or aggregation during offline catch-up.
- The system must keep player commands ordered relative to simulation ticks.

### Technical requirements

- The tick loop must be a driving adapter over the application core.
- The first implementation may run on the main thread, but the design must
  support moving the loop to a Web Worker.
- React components must subscribe to snapshots or selectors rather than mutate
  simulation state directly.
- Presentation interpolation must not feed back into domain state.

## Options considered

### Option A: Advance simulation inside React effects

React effects are easy to wire, but render lifecycle and simulation lifecycle
become entangled.

### Option B: Use a full game engine runtime

A full engine provides tick and rendering conventions, but may overfit the
problem and complicate PWA accessibility.

### Option C: Fixed-tick adapter with React and Canvas presentation

A fixed-tick adapter keeps authority outside React while preserving a web user
interface and enabling worker migration.

| Topic          | Chosen direction                         | Main alternative                   |
| -------------- | ---------------------------------------- | ---------------------------------- |
| Tick authority | Application service owns steps           | React effects can double-run       |
| Responsiveness | Worker migration is available            | Main-thread only may stall         |
| Accessibility  | React DOM remains available for controls | Full engine often needs extra work |
| Testability    | Tick loop can run headless               | UI-mounted simulation is harder    |

_Table 1: Trade-offs for ADR 010._

## Decision outcome / proposed direction

The project will run simulation through a fixed-tick driving adapter outside
React rendering. React owns controls and accessible interface composition.
Canvas owns animated presentation. The domain core owns tick results. Worker
execution remains a planned migration seam.

## Goals and non-goals

- Goals:
  - Keep simulation authority independent of rendering cadence.
  - Maintain responsive policy editing and event prompts during active
    simulation.
  - Prepare for late-game worker execution without changing domain rules.
- Non-goals:
  - Implement a full entity-component-system engine in the first slice.
  - Make Canvas own authoritative game state.
  - Guarantee real-time tick execution during long offline catch-up.

## Migration plan

1. Implement a main-thread fixed-tick service that calls the application core at
   a configured cadence.
2. Expose immutable snapshots or selectors to React and Canvas after each
   committed tick batch.
3. Add offline catch-up through bounded batches and summaries.
4. Move tick execution to a Web Worker once profiling shows the main thread
   needs relief.

## Known risks and limitations

- Worker migration can complicate message serialization and debugging.
- Large snapshots can create memory churn if copied too often.
- Catch-up approximations can diverge from active simulation if not documented
  and tested.

## Outstanding decisions

- Choose the initial fixed tick interval and catch-up batch size.
- Define snapshot shape and structural-sharing strategy.
- Decide how XState machines communicate with a worker-hosted tick loop.

## Architectural rationale

The player watches a civilization compute itself into glory or catastrophe. That
computation needs a clock of its own. React can frame the stained-glass; it
should not decide when the sun rises.


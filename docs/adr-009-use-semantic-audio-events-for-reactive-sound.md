# Architectural decision record (ADR) 009: Use semantic audio events for reactive sound

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

Vibe Coder needs reactive music and sound that reflect policy, debt, incidents,
alignment, power, and regime shifts. Static loops would miss the systemic
drama, while audio logic that reads or mutates game state directly would
violate domain boundaries and complicate deterministic simulation.

## Decision drivers

- Audio should express simulation meaning without becoming simulation authority.
- Frequent events such as commits and debt changes require rate limiting and
  aggregation.
- Music layers should react to stable semantic signals rather than arbitrary UI
  component state.
- Audio must be optional, controllable by bus, and safe for reduced-sensory
  modes.
- The audio engine must remain an outbound adapter.

## Requirements

### Functional requirements

- The system must emit semantic audio events for commits, incidents, policy
  commits, alignment warnings, stage unlocks, power shortages, and endings.
- The system must support music layers for cosy work, startup pulse, debt
  dissonance, open-source trust, alignment shadow, power grid, and cosmic heat.
- The system must provide user controls for music, sound effects, and user
  interface volume.
- The system must allow audio to be disabled without changing simulation
  results.

### Technical requirements

- Simulation and application services must emit audio events without importing
  Web Audio APIs.
- The Web Audio adapter must consume audio events, apply rate limits, schedule
  sounds, and mix music layers.
- Audio playback must never mutate authoritative run state.
- Audio events must be derived from domain events or selectors that are already
  available to visual adapters.

## Options considered

### Option A: Static loops and hand-triggered sound effects

Static loops are simple, but they cannot express changing simulation pressure
or the late-game shift from cash to watts.

### Option B: UI-driven audio triggers

UI components can trigger sounds easily, but the audio becomes coupled to
presentation details rather than domain meaning.

### Option C: One-way semantic audio event pipeline

Semantic events keep audio reactive, testable, and decoupled from both domain
mutation and UI implementation.

| Topic           | Chosen direction                    | Main alternative                    |
| --------------- | ----------------------------------- | ----------------------------------- |
| Domain purity   | Audio is outbound only              | UI-driven audio can leak back       |
| Responsiveness  | Events map to layered music and SFX | Static loops are weak               |
| Testing         | Event routing can be tested         | Direct Web Audio effects are harder |
| Sensory control | Bus-based control is explicit       | Ad hoc triggers vary                |

_Table 1: Trade-offs for ADR 009._

## Decision outcome / proposed direction

The project will use a one-way semantic audio event pipeline. The simulation
emits domain-derived audio events. A Web Audio adapter consumes them, schedules
sound, controls buses, and modulates generative music layers. Audio never
mutates authoritative game state.

## Goals and non-goals

- Goals:
  - Make the simulation audible without coupling sound to React components.
  - Use music as a readable pressure surface for debt, alignment, power, and
    endings.
  - Keep audio optional, accessible, and rate-limited.
- Non-goals:
  - Implement a full digital audio workstation inside the game.
  - Require audio to understand raw simulation internals.
  - Use sound as the only indication of any gameplay-critical event.

## Migration plan

1. Define the `AudioEventSink` port and initial `AudioEvent` union.
2. Implement a silent adapter for tests and environments without audio.
3. Implement a Web Audio adapter with buses, rate limits, and seeded motif
   selection.
4. Map the first domain events to sound effects and music-layer intensity.

## Known risks and limitations

- Generative music can become tiring if density increases with every metric.
- Frequent commit events can cause audio clutter unless aggregated.
- Browser autoplay policy can block audio until a user gesture occurs.

## Outstanding decisions

- Choose whether the first implementation uses AudioWorklet or scheduled
  AudioBuffer sources.
- Define the seed-to-motif algorithm for run identity.
- Choose defaults for reduced-motion and reduced-sensory settings.

## Architectural rationale

The audio layer should be the game world humming back at the player, not a
secret second simulation. A one-way event pipe lets the game sing about debt,
power, and trust without letting the orchestra grab the steering wheel.

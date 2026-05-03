# Architectural decision record (ADR) 002: Adopt hexagonal architecture for domain boundaries

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

Vibe Coder combines a simulation model, React user interface, Dexie persistence,
Canvas presentation, Web Audio, asset catalogues, and development tooling.
Without explicit boundaries, game rules would leak into adapters and adapters
would leak into game rules. That would make the simulation hard to test, tune,
replay, and evolve.

## Decision drivers

- Simulation rules must be testable without React, Dexie, Canvas, or Web Audio.
- Persistence, rendering, audio, and optimization tooling must be replaceable
  adapters.
- Inbound actors include the React interface, simulation worker, tests,
  import/export, and self-play runner.
- Outbound actors include storage, time, random numbers, audio, assets, reports,
  and telemetry.
- Domain values must remain valid without browser framework dependencies.

## Requirements

### Functional requirements

- The system must expose application services for starting runs, applying
  policies, ticking simulation, resolving events, and unlocking stages.
- The system must translate external commands into domain commands at adapter
  boundaries.
- The system must expose deterministic simulation outputs to user interface,
  audio, visual, and telemetry adapters.

### Technical requirements

- Domain modules must not import React, Dexie, Canvas, Web Audio, browser
  storage, or service-worker APIs.
- Port interfaces must live inside the core, while adapter implementations live
  outside the core.
- Tests must be able to bind in-memory or fake adapters to every driven port.
- The composition root must wire concrete adapters into application services.

## Options considered

### Option A: Feature-first React modules only

Feature modules are useful for cohesion, but alone they do not protect
simulation rules from persistence, rendering, and browser dependencies.

### Option B: Traditional layered architecture

Layering clarifies presentation, logic, and data roles, but it can still allow
domain logic to drift into adapters when dependency direction is not enforced.

### Option C: Hexagonal architecture

Ports and adapters make domain boundaries explicit, preserve dependency
inversion, and make the simulation core independently testable.

| Topic              | Chosen direction                  | Main alternative                 |
| ------------------ | --------------------------------- | -------------------------------- |
| Domain testability | Core can run with fake ports      | Often depends on framework setup |
| Technology change  | Adapters can be replaced          | Changes may cross layers         |
| Initial complexity | Higher, due to explicit ports        | Lower, but easier to entangle    |
| Simulation tuning  | Self-play can drive the same core | Tooling may need browser wiring  |

_Table 1: Trade-offs for ADR 002._

## Decision outcome / proposed direction

The project will adopt hexagonal architecture. Application services and domain
rules form the core. React, Dexie, Web Audio, Canvas, workers, asset tooling,
and optimization runners interact with the core through inbound and outbound
ports.

The following sketch illustrates the intended direction of dependencies.

```typescript
type GamePorts = {
  stateRepository: GameStateRepository;
  clock: Clock;
  randomSource: RandomSource;
  audioSink: AudioEventSink;
  assetCatalogue: AssetCatalogue;
  telemetrySink: TelemetrySink;
};

type GameApplication = {
  startRun(command: StartRunCommand): Result<RunState>;
  applyPolicy(command: ApplyPolicyCommand): Result<RunState>;
  simulateTick(command: SimulateTickCommand): Result<TickResult>;
};
```

## Goals and non-goals

- Goals:
  - Keep the game rules independent of browser and rendering implementation
    details.
  - Make self-play, replay, property tests, and save migrations drive the same
    core logic.
  - Allow future storage, renderer, audio, and sync replacements without
    changing domain equations.
- Non-goals:
  - Create many tiny bounded contexts before the first vertical slice proves
    pressure points.
  - Hide every small browser primitive behind an abstraction when it is not part
    of game semantics.
  - Use architecture terminology as a substitute for measurable tests.

## Migration plan

1. Create `domain/`, `application/`, and `adapters/` source boundaries.
2. Define core value objects for resources, policies, debt, alignment, events,
   progression, and endings.
3. Define driven ports for storage, clock, random source, audio events, asset
   catalogue, telemetry, and optimization reports.
4. Move React components to inbound adapter responsibilities and forbid domain
   imports from adapter implementation modules.

## Known risks and limitations

- The architecture adds ceremony before the first playable slice ships.
- Poorly named ports can become abstract wrappers around implementation details.
- A domain split chosen too early may require merge work once the real gameplay
  shape appears.

## Outstanding decisions

- The source tree uses `domain/`, `application/`, and `adapters/` as the chosen
  package boundaries; the `core/` naming option has been set aside.
- Import-boundary lint rules will be defined and enforced via Biome or a custom
  TypeScript rule once the repository scaffold exists.
- Decide whether optimization tooling lives inside the app package or in a
  sibling package.

## Architectural rationale

The game is process-heavy. Its value lies in coupled simulation, not in one
presentation stack. Hexagonal boundaries keep the simulation as the source of
truth while letting the outer ring change. The approach also matches the
attached architecture material, which treats adapters as translation layers that
must not invent domain state.


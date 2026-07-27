# ADR 004: Persist runs with Dexie snapshots and event logs

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

The offline-first MVP needs browser-durable saves. A Vibe Coder run can
continue for long periods, accumulate incidents, change policy, unlock regimes,
and return after offline catch-up. Persistence therefore needs fast loading,
replay evidence, migration support, and bounded storage growth.

## Decision drivers

- Loading a save must be quick even after long idle sessions.
- Debugging and self-play require enough history to explain outcomes.
- Save migration must preserve older runs or archive them safely.
- Offline catch-up must summarize major events rather than spam thousands of
  logs.
- The storage implementation must stay behind a repository port.

## Requirements

### Functional requirements

- The system must save run state, settings, parameter pack identity, and event
  history locally.
- The system must restore the latest usable snapshot and replay later command
  events when needed.
- The system must support export and import of a run for debugging and future
  migration.
- The system must cap or compact histories according to a documented policy.

### Technical requirements

- Dexie must implement the `GameStateRepository` port for the browser adapter.
- Run snapshots must include schema version, run ID, tick, seed, parameter pack
  hash, and updated timestamp.
- Run events must record policy commits, event resolutions, unlock decisions,
  random-seed checkpoints, and ending triggers.
- Migrations must be testable without React components.

## Options considered

### Option A: Snapshot-only persistence

Snapshot-only saves load quickly, but they provide weak debugging and make
replay or forensic analysis difficult.

### Option B: Event-log-only persistence

Event logs are replayable, but long runs can become slow to load and harder to
migrate efficiently.

### Option C: Periodic snapshots plus event logs

A hybrid model balances fast loading, replay evidence, and bounded storage, at
the cost of more persistence logic.

<!-- markdownlint-disable MD013 -->

| Topic               | Chosen direction            | Main alternative                    |
| ------------------- | --------------------------- | ----------------------------------- |
| Load speed          | Fast from latest snapshot   | Snapshot-only fast; log-only slower |
| Debugging           | Recent history is available | Snapshot-only loses cause traces    |
| Storage growth      | Controllable by compaction  | Log-only grows continuously         |
| Implementation cost | Moderate                    | Lower for snapshot-only             |

<!-- markdownlint-enable MD013 -->

_Table 1: Trade-offs for ADR 004._

## Decision outcome / proposed direction

The project will persist runs through Dexie using periodic snapshots and
append-only event logs. Dexie remains an adapter; domain services receive and
return validated run state through the persistence port.

The following Dexie schema is illustrative and not yet normative.

```typescript
db.version(1).stores({
  runs: 'id, createdAt, updatedAt, stage, endingKind',
  runSnapshots: '[runId+tick], runId, tick, createdAt',
  runEvents: '[runId+tick+sequence], runId, tick, type',
  settings: 'key',
  parameterPacks: 'id, version, createdAt, status',
  contentPacks: 'id, version, createdAt, status',
  selfPlayReports: 'id, parameterPackId, createdAt, score'
});
```

## Goals and non-goals

- Goals:
  - Make saves durable, debuggable, and migration-friendly.
  - Support future replay, self-play reports, and player-visible run archives.
  - Keep browser storage details outside the domain core.
- Non-goals:
  - Implement multi-device cloud synchronization in the first persistence slice.
  - Store every visual or audio event as authoritative history.
  - Guarantee infinite archive retention inside browser storage.

## Migration plan

1. Create Dexie tables for runs, run snapshots, run events, settings, parameter
   packs, content packs, and self-play reports.
2. Persist a snapshot after run creation, major unlocks, endings, and periodic
   tick intervals.
3. Persist command events and major domain events with stable sequence numbers.
4. Add import/export after schema validation and migration tests exist.

## Known risks and limitations

- IndexedDB corruption, quota eviction, or browser privacy settings can still
  remove local saves.
- Event logs can expose too much noise unless compaction and summaries are
  designed early.
- A careless migration could make old runs unreadable without a recovery path.

## Outstanding decisions

- Define exact snapshot cadence and compaction thresholds.
- Choose whether self-play reports share the game database or use a
  development-only database.
- Define whether imported saves can include custom parameter packs.
- Define the first import/export save format and compatibility policy.

## Architectural rationale

The hybrid storage model fits an idle simulation: the player needs quick
resume, while maintainers need enough event history to explain why a
civilization melted, assimilated everyone, or became a happy open-source desk
gremlin on universal basic income.

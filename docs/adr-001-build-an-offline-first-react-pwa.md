# Architectural decision record (ADR) 001: Build an offline-first React PWA

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

Vibe Coder needs to run as a low-friction idle game that remains usable without
a server, account, or network connection. The initial product must support local
play, installability, deterministic saves, and future migration to optional
synchronization without reshaping the domain model.

## Decision drivers

- The first vertical slice must prove the policy-driven idle loop before a
  backend exists.
- A browser PWA provides installability, offline boot, and broad platform reach.
- The game state must be durable across refreshes, browser restarts, and app
  updates.
- Future cloud synchronization must remain optional rather than foundational.
- The user interface must stay accessible through ordinary web platform
  semantics.

## Requirements

### Functional requirements

- The system must boot, load, and continue a run while offline.
- The system must allow a new run, saved run, settings, archive, and
  export/import flow without server access.
- The system must expose installable PWA behaviour once service-worker hardening
  is implemented.
- The system must make offline progress explicit when returning to an idle run.

### Technical requirements

- The frontend must use React, TypeScript, and a Vite-compatible build spine.
- The app shell must not require a backend endpoint during the Minimum Viable
  Product.
- Runtime storage must be repository-local and browser-durable through
  IndexedDB-backed adapters.
- Any future network, account, or synchronization feature must enter through
  adapters and must not change domain equations.

## Options considered

### Option A: Native desktop runtime

A desktop runtime could provide strong control over rendering and audio, but
would increase distribution and platform maintenance before the design loop is
proven.

### Option B: Server-backed web application

A server-backed application would simplify cloud features, but it would make the
initial game depend on infrastructure that does not serve the first vertical
slice.

### Option C: Offline-first React PWA

An offline-first PWA maximizes reach, keeps the first release small, and
preserves future adapter seams for sync, telemetry, and content services.

| Topic         | Chosen direction                                 | Main alternative                                  |
| ------------- | ------------------------------------------------ | ------------------------------------------------- |
| Initial reach | Runs in modern browsers and can install as a PWA | Requires native packaging or backend availability |
| Offline play  | Primary design constraint                        | Additional feature or unavailable                 |
| Future sync   | Optional adapter                                 | Often becomes a core dependency                   |
| Accessibility | Native web semantics are available               | Requires more bespoke implementation              |

_Table 1: Trade-offs for ADR 001._

## Decision outcome / proposed direction

The project will build Vibe Coder as an offline-first React PWA. The Minimum
Viable Product will not require backend services. Local persistence,
import/export, and service-worker behaviour will provide the initial durability
and installation story. Networked features remain later adapter work.

## Goals and non-goals

- Goals:
  - Ship a playable policy-driven idle loop without server dependency.
  - Keep future synchronization, analytics, and content feeds additive.
  - Preserve accessibility and semantic web behaviour from the first slice.
- Non-goals:
  - Implement cloud save, accounts, or leaderboards in the Minimum Viable
    Product.
  - Commit to a native desktop shell before browser runtime constraints are
    known.
  - Make server availability part of the core game contract.

## Migration plan

1. Scaffold the React PWA with a deterministic app shell and local settings.
2. Add local save and run archive storage through the persistence port.
3. Add app-shell precaching and installability metadata after the first run loop
   works.
4. Introduce optional sync only after import/export, migrations, and replayable
   saves are stable.

## Known risks and limitations

- Browser storage quotas vary by platform and may constrain very long run
  archives.
- Service-worker update behaviour can surprise players if update prompts are not
  explicit.
- PWA support differs between browsers, so installability must not be required
  for play.

## Outstanding decisions

- Choose the package runner once the repository baseline is created.
- Choose whether the first service worker uses Workbox, Vite PWA tooling, or a
  custom worker.
- Define the first import/export save format and compatibility policy.

## Architectural rationale

The decision aligns with the local-first front-end guidance in the source
documents: render from local state first, treat the network as optional, and
make synchronization observable. It also keeps the game close to its own theme:
a small system that scales through deliberate policies rather than through
hidden infrastructure.


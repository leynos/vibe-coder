# Documentation contents

[Documentation contents](contents.md) is the index for the Vibe Coder
architecture decision pack.

## Decision records

- [ADR 001: Build an offline-first React
  PWA](adr-001-build-an-offline-first-react-pwa.md) - explains the browser,
  offline, and installability direction for the initial product.
- [ADR 002: Adopt hexagonal architecture for domain
  boundaries](adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md) -
  records how the simulation core is separated from React, storage, rendering,
  audio, and tooling.
- [ADR 003: Use XState for workflow
  orchestration](adr-003-use-xstate-for-workflow-orchestration.md) - records the
  state-machine boundary for lifecycle and interaction workflows.
- [ADR 004: Persist runs with Dexie snapshots and event
  logs](adr-004-persist-runs-with-dexie-snapshots-and-event-logs.md) - defines
  local save structure, replay evidence, and migration direction.
- [ADR 005: Use deterministic simulation and parameter
  packs](adr-005-use-deterministic-simulation-and-parameter-packs.md) - records
  the deterministic tick and balance-constant strategy.
- [ADR 006: Use adversarial self-play for parameter
  tuning](adr-006-use-adversarial-self-play-for-parameter-tuning.md) - defines
  the automated tuning approach and working fun criteria.
- [ADR 007: Keep the runtime interface authoritative and
  deterministic](adr-007-keep-runtime-interface-authoritative-and-deterministic.md)
  - separates live user interface truth from generated concept imagery.
- [ADR 008: Use development-time image generation with asset
  promotion](adr-008-use-development-time-image-generation-with-asset-promotion.md)
  - records how generated assets enter the repository safely.
- [ADR 009: Use semantic audio events for reactive
  sound](adr-009-use-semantic-audio-events-for-reactive-sound.md) - defines the
  one-way audio pipeline and reactive music boundary.
- [ADR 010: Run fixed-tick simulation outside React
  rendering](adr-010-run-fixed-tick-simulation-outside-react-rendering.md) -
  records simulation timing, presentation, and worker migration boundaries.
- [ADR 011: Use TLA+ for self-play promotion
  safety](adr-011-use-tla-plus-for-self-play-promotion-safety.md) - records the
  formal model boundary for self-play orchestration, trial evidence, and
  default-parameter-pack promotion.

## Guides

- [Player's Guide](users-guide.md) — core gameplay loop, policy mechanics,
  simulation interpretation, progression, and endings for non-technical
  players.
- [Developer's Guide](developers-guide.md) — toolchain setup, directory
  layout, hexagonal boundary rules, port and adapter conventions, and CI
  pipeline.

## Design references

- [In-Game Design System](in-game-design-system.html) — component palette,
  colour grammar, and layer composition for the in-game interface.
- [Game HUD Mockup](vibe-coder-game-hud-mockup.html) — interactive example of
  the main dashboard and player controls, illustrating the in-game visual style.

## Reference notes

This pack assumes a companion high-level design document will explain the
overall Vibe Coder product architecture. These ADRs intentionally preserve
specific decisions rather than duplicating the full design narrative.

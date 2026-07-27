# Architectural decision record (ADR) 006: Use adversarial self-play for parameter tuning

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

Vibe Coder needs a playable challenge without click farming. The game can fail
if one policy dominates, if passive waiting replaces interaction, if incidents
feel random, or if loopholes allow players to evade the intended challenge.
Parameter tuning therefore needs hostile agents that search for boring,
degenerate, or exploitative strategies.

## Decision drivers

- The game must preserve meaningful player agency while reducing repetitive
  workload.
- The system must detect lock-on-victory policies and dominant strategies before
  release.
- Different ethical, growth, open-source, and power strategies should remain
  viable and distinct.
- Designers need measurable evidence without surrendering judgement to a metric.
- Self-play must run against the same domain core as the game.

## Requirements

### Functional requirements

- The system must run automated policy agents across seeds and parameter packs.
- The system must produce reports covering pacing, exploitability, strategic
  diversity, recovery, and endings.
- The system must flag parameter packs where one strategy bypasses the intended
  challenge.
- The system must support human review before parameter packs become default.

### Technical requirements

- Self-play runners must be inbound adapters over the application and domain
  core.
- Fun scoring must be a versioned part of the parameter-pack review process.
- Reports must include seed, parameter-pack hash, agent identity, score
  components, and notable traces.
- Optimization must not mutate production parameter packs without review.

## Options considered

### Option A: Manual playtest balancing only

Manual playtests capture human taste, but they miss rare exploits and can be
slow across many seeds and parameter variants.

### Option B: Aggregate telemetry only

Telemetry helps after release, but it cannot protect the offline MVP before
players discover degenerate paths.

### Option C: Adversarial self-play plus human review

Self-play finds exploit shapes and pacing failures early, while human review
prevents the fun score from becoming the game designer.

| Topic             | Chosen direction                       | Main alternative                 |
| ----------------- | -------------------------------------- | -------------------------------- |
| Exploit discovery | Active search by hostile agents        | Limited by human coverage        |
| Taste judgement   | Human review remains required          | Telemetry or metrics can overfit |
| Offline MVP fit   | Runs locally or in development harness | Telemetry needs release data     |
| Balancing speed   | Parameter sweeps are automated         | Manual-only tuning is slower     |

_Table 1: Trade-offs for ADR 006._

## Decision outcome / proposed direction

The project will use adversarial self-play to tune game parameter packs. The
working definition of fun for optimization is: meaningful policy influence
under legible systemic conflict, with multiple viable strategies, recoverable
setbacks, and no low-effort route around the challenge.

## Goals and non-goals

- Goals:
  - Detect lock-on-victory strategies, dead time, opacity, and dominant
    policies.
  - Tune pacing so idle play remains interactive through policy consequences.
  - Keep ethical, open-source, growth, and degrowth strategies mechanically
    interesting.
- Non-goals:
  - Replace human playtesting or art direction with automated scoring.
  - Maximize addiction, session length, or compulsion as success metrics.
  - Guarantee mathematical proof of fun.

## Migration plan

1. Define the first fun-score components and make them visible in reports.
2. Implement baseline agents: growth goblin, debt janitor, ethical steward,
   backroom baron, open-source saint, heat-death gremlin, exploit hunter, and
   casual player.
3. Run self-play sweeps against the first three parameter packs.
4. Require a self-play report and human approval before promoting a new default
   pack.

## Known risks and limitations

- The fun score can reward what is measurable instead of what is enjoyable.
- Self-play agents can miss strategies that human players find obvious.
- Overzealous exploit removal can flatten expressive play.

## Outstanding decisions

- Define exact thresholds for rejecting a parameter pack.
- Choose whether self-play runs in browser workers, Node, or both.
- Define the first human playtest questions that validate the fun-score
  components.

## Architectural rationale

The attached Crawford material emphasizes challenge, conflict, interactivity,
loopholes, and process intensity. The decision treats fun as an engineered
conversation: the player expresses policy, the system calculates meaningful
pressure, and the game answers with legible consequences. Self-play is the
gremlin auditor that tries to ruin that conversation before players do.

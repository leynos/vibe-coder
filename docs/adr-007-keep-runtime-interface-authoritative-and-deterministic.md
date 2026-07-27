# Architectural decision record (ADR) 007: Keep the runtime interface authoritative and deterministic

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

The visual design bible uses rich generated concept imagery, dense manual-page
callouts, and painterly pixel-art references. The playable game, however, must
show accurate resources, labels, controls, status, charts, incident causes, and
accessibility semantics. Generated text and static mockup panels cannot be
treated as runtime truth.

## Decision drivers

- Players must trust live numbers, warnings, policy sliders, and incident
  explanations.
- Runtime text must be accessible, localizable, testable, and correct.
- Generated images can contain spelling errors, duplicate labels, or decorative
  copy that should not affect gameplay.
- Charts, hit areas, focus rings, and status semantics must respond to current
  state.
- The rendering architecture should separate visual richness from authoritative
  interface data.

## Requirements

### Functional requirements

- The system must draw critical resource names, values, statuses, and controls
  at runtime.
- The system must render policy sliders, ethics toggles, event prompts, charts,
  and tooltips from domain selectors.
- The system must keep generated signage decorative or reference-only unless
  explicitly promoted as non-critical art.
- The system must provide textual summaries for visual diagnostics such as debt
  constellations and power heat maps.

### Technical requirements

- React and Canvas renderers must own layout, glyphs, charts, focus rings, hit
  boxes, and state-dependent copy.
- Generated art must not be the only source of live gameplay information.
- Asset manifests must state whether text in an image is decorative, ignored, or
  prohibited for runtime use.
- Automated checks must reject runtime assets that bake critical values or
  labels into images.

## Options considered

### Option A: Slice design-book pages into runtime screens

This would preserve the mockup look quickly, but would make text, controls, hit
areas, and live values brittle.

### Option B: Generated screenshots with transparent overlays

This keeps more visual detail but still risks layout authority living in static
imagery.

### Option C: Deterministic runtime interface over approved visual assets

This makes the interface correct, accessible, and testable while still allowing
generated art to supply mood, backplates, ornaments, and sprites.

| Topic            | Chosen direction                        | Main alternative                            |
| ---------------- | --------------------------------------- | ------------------------------------------- |
| Live correctness | Values derive from state selectors      | Static images can become stale              |
| Accessibility    | DOM and runtime text are inspectable    | Image text is weak for assistive technology |
| Visual richness  | Assets still supply backplates and mood | Full generated page is richest initially    |
| Maintenance      | Reusable components and charts          | One-off slices accumulate quickly           |

_Table 1: Trade-offs for ADR 007._

## Decision outcome / proposed direction

The project will make the runtime interface authoritative and deterministic.
Generated imagery may define atmosphere, characters, materials, ornaments, and
source references. Runtime code owns all critical labels, values, charts,
layout, hit areas, and accessibility semantics.

## Goals and non-goals

- Goals:
  - Keep the player-facing simulation readable and trustworthy.
  - Allow generated art to enrich the world without corrupting the interface
    contract.
  - Make UI state testable through selectors, components, and accessibility
    checks.
- Non-goals:
  - Forbid decorative generated text in design-book or concept assets.
  - Require every environmental prop to be algorithmic.
  - Recreate the visual design bible page layout as the final runtime screen.

## Migration plan

1. Define runtime text, chart, and control ownership in the art and asset
   documents.
2. Implement the first dashboard with live top-bar resources, policy controls,
   ethics controls, and event timeline as runtime components.
3. Add asset manifest fields that mark runtime text safety.
4. Add validation checks for generated assets promoted into runtime use.

## Known risks and limitations

- A deterministic interface can feel colder than the concept pages if the visual
  layer is underinvested.
- Runtime layout work may take longer than slicing static mockups.
- Generated decorative signs can still confuse players if placed near live
  panels.

## Outstanding decisions

- Choose the runtime text renderer for Canvas-only panels.
- Decide which parts of the dashboard use DOM controls versus Canvas overlays.
- Define contrast and reduced-motion gates for the first playable dashboard.

## Architectural rationale

This preserves the design bible as art direction rather than a fragile source
of gameplay truth. The runtime becomes a reliable cockpit: the rain can be
beautiful, the goblin can have seventeen mugs, and the CVE counter still
remains correct.

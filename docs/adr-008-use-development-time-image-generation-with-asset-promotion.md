# Architectural decision record (ADR) 008: Use development-time image generation with asset promotion

## Status

Proposed.

## Date

2026-04-30.

## Context and problem statement

Vibe Coder benefits from rapid visual exploration: style pages, character
references, environment concepts, prop sources, endings, and user interface
ornament studies. Built-in image generation is useful for this creative
workflow, but it is not a deterministic runtime asset pipeline or a runtime
application programming interface.

## Decision drivers

- Generated images need prompt provenance, validation, and post-processing
  before runtime use.
- Runtime assets must be repository-local and must not depend on generated-image
  temporary paths.
- Transparent assets, slices, palettes, atlases, and light masks need
  deterministic processing.
- Creative iteration should remain fast without weakening runtime determinism.
- The app must not pretend that development-time tools are available at runtime.

## Requirements

### Functional requirements

- The system must support generated style references, character sheets,
  environment sheets, prop cutouts, and ending thumbnails as development
  artefacts.
- The system must promote only validated, manifest-backed, processed assets into
  runtime use.
- The system must allow runtime asset catalogues to load approved processed
  assets and metadata.
- The system must support a future request workflow for authoring assets without
  treating image generation as a runtime dependency.

### Technical requirements

- Every accepted project-bound generated image must have a prompt file and
  manifest.
- Generated outputs must be copied into repository paths before they are
  referenced by code.
- Bucket, intent class, prompt path, source path, processed path, validation,
  and runtime use must be recorded.
- Post-processing scripts must be deterministic and must update manifests after
  accepted steps.

## Options considered

### Option A: Manual-only art pipeline

Manual-only art keeps control high, but slows exploration of the broad
cosy-to-cosmic world required by Vibe Coder.

### Option B: Runtime image generation

Runtime generation could personalize content, but it introduces network, cost,
determinism, moderation, and tool-availability constraints.

### Option C: Development-time image generation with promotion gates

Development-time generation accelerates art direction while manifests,
processing, and validation keep the runtime deterministic.

| Topic               | Chosen direction                   | Main alternative                        |
| ------------------- | ---------------------------------- | --------------------------------------- |
| Creative speed      | High for references and source art | Manual-only is slower                   |
| Runtime determinism | Preserved through promotion gates  | Runtime generation is variable          |
| Asset provenance    | Manifest-backed                    | Easy to lose in ad hoc workflows        |
| Operational cost    | No runtime image service           | Runtime generation needs service policy |

_Table 1: Trade-offs for ADR 008._

## Decision outcome / proposed direction

The project will use image generation as a development-time creative workflow.
Generated imagery can become reference art, source art, or processed runtime
assets only after manifest, validation, and post-processing gates. Runtime image
generation is out of scope unless a separate future decision accepts it.

## Goals and non-goals

- Goals:
  - Accelerate art direction and asset exploration.
  - Preserve deterministic runtime assets, metadata, and text safety.
  - Make prompts, files, validation, and runtime consumers auditable.
- Non-goals:
  - Call built-in image generation from the shipped PWA.
  - Treat generated character sheets as finished sprite atlases without cleanup.
  - Use generated images as authoritative layout, text, or game-state sources.

## Migration plan

1. Create prompt templates for style pages, characters, environments, props, UI
   ornaments, and edits.
2. Create source, processed, atlas, manifest, palette, validation, and request
   directories as assets arrive.
3. Implement or import post-processing scripts for chroma-key removal,
   quantization, slicing, nine-slice extraction, atlas packing, and light-mask
   generation.
4. Add manifest validation to repository gates before runtime asset loading
   depends on generated sources.

## Known risks and limitations

- Generated assets can drift in style or identity between iterations.
- Post-processing effort can hide inside manual work if manifests are not
  updated.
- Overreliance on generated references can delay decisive runtime
  simplification.

## Outstanding decisions

- Define the first Vibe Coder-specific asset manifest schema by adapting the
  Agentland asset specification.
- Choose the first master palette and quantization strategy.
- Decide whether the repository includes generated design bible pages as
  reference-only assets.

## Architectural rationale

This decision follows the attached image-generation workflow and asset
specification. The creative pipe remains a paintbrush, not a courthouse. It can
inspire the look of a rainy startup district, but it cannot decide whether a
policy slider sums to one hundred.


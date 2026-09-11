---
name: canvas-world-engine
description: Implement a lightweight mobile-first miniature world in Canvas 2D with a clean simulation/render loop, resilient pointer interaction, and sensible performance budgets.
source: adapted from test-knowledge-base/skills/critter-world/canvas-world-engine
---

# Canvas World Engine

## Goal

Use the smallest rendering stack that can prove the interaction and behavior model.

## Architecture

A lightweight first prototype can be one HTML file containing semantic HTML, CSS, Canvas, and structured JavaScript sections with no build step.

Keep simulation and rendering separate:

```text
frame
  → clamp dt
  → update world
  → update entities
  → update effects
  → render
```

## Coordinate systems

Separate CSS/display size from render resolution. Measure CSS size, cap effective DPR when useful, resize the backing buffer, then keep simulation coordinates in CSS/world units.

## Input and picking

Use Pointer Events. Convert client coordinates to world coordinates, choose the closest eligible hit, and use pointer capture during drag.

## Performance budget

For a first mobile prototype prefer a handful of entities and simple effects, avoid per-frame DOM churn, cap particles, and do not stack expensive full-screen filters.

## Pause and recovery

Clamp large time deltas after tab switching or backgrounding so entities do not teleport. Resume gracefully after visibility changes.

## Exit condition

Move to WebGL/WebGPU/Pixi only after Canvas 2D becomes a measured limitation, not because a heavier renderer sounds more impressive.

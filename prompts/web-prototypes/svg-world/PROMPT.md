---
name: svg-world
runtime_input: input
source: adapted from test-knowledge-base/prompts/svgworld
---

# SVG World Prototype

Runtime input:

`{{input}}`

Build a convincing tiny illustrated world as a **single mobile-first HTML file** whose visible world is authored from inline SVG.

## Required approach

Use SVG authoring and SVG motion guidance deliberately. Create terrain, trees, rocks, plants, paths, water, structures, beings, effects, and interaction graphics as real SVG markup or definitions.

## Hard constraints

- inline SVG is the primary rendering system
- do not use raster `<image>` shortcuts
- prefer CSS, Web Animations API, and focused vanilla JavaScript
- no build step
- touch/pointer input must work without hover
- remain visually coherent with animation disabled
- respect `prefers-reduced-motion`

## Quality target

This is not a technical diagram. Build an authored miniature place with composition, depth, character, ambient life, and small causally connected interactions.

## Completion audit

Record which skills were used, which implementation decisions they materially changed, what animation mechanisms were chosen, mobile/performance observations, and what guidance was missing.

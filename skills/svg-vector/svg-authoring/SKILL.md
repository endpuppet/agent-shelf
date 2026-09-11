---
name: svg-authoring
description: Author clean, semantic, motion-ready inline SVG for interactive web scenes, world maps, illustrations, props, terrain, icons, and lightweight characters.
source: adapted from test-knowledge-base/skills/interactive-world/svg/svg-authoring
upstream: https://github.com/linyaosky/svg-skill
---

# SVG Authoring

Create real SVG markup. Do not fake vector artwork with raster `<image>` elements.

## Core principle

Author for composition, reuse, interaction, and animation ownership at the same time.

## Structure

Use a stable root `viewBox` and semantic depth groups such as atmosphere, far terrain, water, ground, paths, structures, vegetation, beings, foreground, and effects. Give interactive objects stable IDs or wrapper groups.

## Reusable assets

Use `<symbol>`, `<g>` definitions, and `<use>` for repeated geometry. Vary transform, scale, rotation, and a small set of CSS custom properties so repetition does not look stamped.

## Motion-ready wrappers

Separate transform ownership:

```text
entity-position
  entity-react
    entity-bob
      visual-parts
```

One layer places the object, another handles reactions, another handles ambient movement.

## Interaction-ready geometry

Thin visuals need larger invisible hit geometry. Configure `pointer-events` intentionally and keep touch targets comfortable without distorting the art.

## Performance

Prefer a few hundred meaningful nodes over thousands of microscopic shapes. Limit large filters, masks, and animated blur regions.

## Quality gate

Before animation, verify that the SVG is already attractive and legible, depth groups are separate, repeated geometry is reused, transform ownership is clear, and the artwork scales cleanly to a narrow phone.

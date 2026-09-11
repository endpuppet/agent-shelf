---
name: scene-decomposition
runtime_input: image_or_scene
source: adapted from the Popackani / ENDNODE scene-separation workflow
---

# Scene Decomposition for Interactive Web

Analyze the supplied flattened scene as source material for a layered interactive 2D/2.5D website, game-like interface, or WebGPU composition.

`{{image_or_scene}}`

## Goal

Split the image into the **smallest useful set of reusable layers**, not hundreds of fragments. The result should support depth, parallax, interaction, lighting, and selective animation while remaining practical to rebuild.

## Method

1. Identify the visual depth planes from far background to foreground.
2. Identify major interactive zones or objects that need independent state/animation.
3. Combine objects that never need to move independently.
4. Separate foreground occluders that are useful for parallax and masking.
5. Mark areas where hidden pixels must be reconstructed after extraction.
6. Distinguish structural layers from decorative overlays and effects.
7. Keep the final layer count deliberately compact.

## Output

For every proposed layer provide:

- stable asset name
- what it contains
- approximate depth/order
- whether it is static, animated, or interactive
- whether hidden-area reconstruction/inpainting is required
- ideal export format
- any masking or transparency notes

Then provide the final front-to-back layer stack and a short recommendation for which layers should become meshes, planes, sprites, or DOM/SVG elements.

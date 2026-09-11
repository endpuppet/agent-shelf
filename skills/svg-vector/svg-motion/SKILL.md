---
name: svg-motion
description: Animate and add touch-friendly interaction to inline SVG using CSS, Web Animations API, SVG path techniques, and focused JavaScript.
source: adapted from test-knowledge-base/skills/interactive-world/svg/svg-motion
upstream: https://github.com/iart-ai/web-animation-skills/tree/main/skills/svg-animation
---

# SVG Motion

Animate a designed SVG without turning it into a screensaver.

## Motion hierarchy

Use four layers:

1. **Ambient** — slow background life.
2. **Entity** — locomotion, idle behavior, personality.
3. **Reactive** — immediate response to touch or state change.
4. **Effect** — short causal ripples, dust, sparks, highlights, etc.

Reactive motion should usually be stronger and shorter than ambient motion.

## Pick the lightest mechanism

Use CSS for simple perpetual motion, Web Animations API when runtime state and cancellation matter, and `requestAnimationFrame` only when continuous simulation or steering is genuinely required.

Use SVG-specific path tools such as `stroke-dasharray`, `stroke-dashoffset`, `pathLength`, or offset paths when they are the clearest solution.

## Never let transforms fight

Ambient bobbing and reactive squash should not own the same transform. Use nested wrappers for world placement, behavior transforms, ambient transforms, and visual parts.

## Interaction

Design for touch first. Every interaction should create immediate visible feedback, then optionally continue into a longer animation or world reaction.

## Performance

Prefer `transform` and `opacity`. Use filters and path morphing sparingly. Reuse short-lived effect nodes and pause or reduce autonomous motion when hidden or when `prefers-reduced-motion` is active.

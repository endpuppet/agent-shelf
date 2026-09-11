---
name: critter-prototype
alias: /critterproto
runtime_input: request
source: adapted from test-knowledge-base/prompts/critterproto
---

# Critter Prototype

Create or improve a small mobile-first interactive critter-world prototype.

## Runtime request

`{{request}}`

## Experience goal

Create a tiny world that feels inhabited rather than a conventional UI demo.

Critters should:

- have distinct personality tendencies
- keep doing things without user input
- notice the environment
- occasionally react to one another
- react differently to at least one user action
- return to autonomous behavior after being disturbed

The visitor should affect the world directly through touch/pointer interaction.

## Implementation bias

Prefer a lightweight Canvas 2D implementation and no build step unless the request gives a strong reason otherwise.

Prioritize:

1. convincing life
2. touch interaction
3. expressive motion
4. mobile performance
5. visual polish

Do not spend most of the effort on menus, settings, framework setup, or decorative UI.

## Completion check

Observe the world without interaction, test taps and drags, resize/mobile behavior, recovery after interaction, and accidental page scrolling.

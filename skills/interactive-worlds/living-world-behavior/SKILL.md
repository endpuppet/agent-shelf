---
name: living-world-behavior
description: Design lightweight autonomous creature behavior that makes a tiny interactive world feel alive even when the user does nothing.
source: adapted from test-knowledge-base/skills/critter-world/living-world-behavior
---

# Living World Behavior

## Goal

Create the illusion of independent lives with small readable systems instead of heavyweight AI.

## Core model

Give each entity stable traits such as curiosity, sociability, energy, bravery, and speed; short-term needs; a current state; a target or point of interest; a small recent-event memory; and cooldowns that prevent repetitive loops.

Prefer 4–7 states at first: `idle`, `wander`, `inspect`, `socialize`, `react`, `rest`.

## Decision rhythm

Separate fast movement from slower decisions. Movement can update every frame while high-level choices happen roughly every 0.5–2 seconds with per-entity jitter.

Use bounded randomness to choose between plausible actions, not to replace logic.

## Local awareness

React to nearby entities, objects, taps, disturbances, and local world events. Prefer local rules over one global script controlling everyone.

## Social behavior

Small rules are enough: look at a passing entity, approach someone interesting, copy an action occasionally, form a loose pair, avoid crowds, or inspect a dramatic reaction.

## User influence

The user should perturb rather than permanently puppet the world. After interruption, return control to the autonomous loop.

## Quality check

Watch for at least 30 seconds without interaction. You should be able to infer what individuals are doing, notice differences between them, and see the world continue to produce small events on its own.

---
name: expressive-critter-motion
description: Make tiny characters feel expressive and readable using procedural motion, gaze, timing, pose changes, and reaction animation.
source: adapted from test-knowledge-base/skills/critter-world/expressive-critter-motion
---

# Expressive Critter Motion

## Goal

Create personality from simple shapes and a small reusable animation vocabulary.

## Animation hierarchy

Prioritize body translation and facing, body scale/tilt, eyes or gaze, secondary parts, and then tiny environmental response. Do not animate every property continuously. Stillness makes reactions visible.

## Procedural vocabulary

Useful primitives include `breathe`, `bob`, `blink`, `lookAt`, `leanToward`, `squash`, `stretch`, `recoil`, `hop`, `settle`, `wobble`, `shiver`, `perkUp`, and `doze`.

## Timing

For a strong reaction use:

`notice → pause → anticipation → main motion → overshoot → settle`

Small timing differences based on personality traits prevent synchronized, mechanical behavior.

## Gaze

Eyes are high-value animation. Characters can glance at a touch point, another character, or an object, look away before moving, blink after surprise, or narrow/widen eyes. Do not track the user constantly.

## Personality mapping

Map stable traits to visible motion. High energy can mean faster idle tempo and larger hops; cautious characters hesitate and recoil more; curious characters lean and track new objects longer.

## Reduced motion

Reduce large travel, bouncing, and continuous oscillation while preserving readable pose and expression changes.

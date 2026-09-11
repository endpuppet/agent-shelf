---
name: touch-first-play
description: Design playful mobile-first interactions using touch, pointer, drag, hold, forgiving hit areas, and direct manipulation without relying on hover.
source: adapted from test-knowledge-base/skills/critter-world/touch-first-play
---

# Touch-First Play

## Goal

Make interaction feel immediate on a phone with one thumb. Prefer touching the thing itself over surrounding the experience with controls.

## Interaction priorities

Design for tap, drag, press/hold, and multi-touch only when it adds major value. Use Pointer Events where possible so mouse, pen, and touch share one path. Never make hover required.

## Hit areas

Small visuals still need forgiving targets. Aim for roughly 44 CSS px or larger where practical, or expand the invisible hit region without enlarging the art.

## Gesture arbitration

Decide whether a gesture means navigation or object manipulation. Establish a small movement threshold before turning a tap into a drag, use pointer capture during drag, and recover cleanly from pointer cancellation.

## Feedback stack

Every meaningful touch should respond immediately. Layer direct target response, a small visual effect at the touch point, nearby response, and a delayed behavioral consequence.

## Discoverability

Teach by affordance rather than tutorial panels. Use subtle pulses, first-touch reactions, tiny hints, or idle demonstrations.

## Mobile layout

Use the safe viewport and dynamic viewport units where useful. Keep important controls away from cutouts and awkward extreme corners. Prevent accidental page scrolling while manipulating the experience.

## Failure modes

Avoid hover-only discovery, tiny exact targets, unexplained gestures, broken drag states, modal interruptions, and interfaces with more chrome than content.

## Quality check

Test one-handed on a real phone. Verify rapid taps, interrupted drags, edge touches, resize/orientation changes, and recovery from messy input.

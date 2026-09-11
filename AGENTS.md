# Agent Shelf — agent instructions

Agent Shelf is a public registry and visual browser for reusable skills and prompts.

## Content rules

- Everything committed here is public. Do not copy secrets, credentials, private personal notes, or sensitive project data into this repository.
- Keep `skills/` and `prompts/` organized by broad use case, not by source repository.
- A skill lives at `skills/<category>/<slug>/SKILL.md`.
- A prompt lives at `prompts/<category>/<slug>/PROMPT.md`.
- Prefer stable lowercase kebab-case paths.
- Preserve useful provenance/upstream links inside imported skills where licensing allows it.

## Catalog rules

Every visible item needs one matching `catalog.json` entry with `id`, `type`, `category`, `slug`, `title`, `description`, `tags`, and `path`.

Do not leave category folders empty.

## Interface rules

- Mobile first.
- Comfortable touch targets; do not require hover.
- Keep the static site build-free and GitHub Pages friendly.
- Preserve hash-based deep links for every item.
- Preserve Copy content, Copy shelf link, Copy source link, and Open on GitHub.
- Respect `prefers-reduced-motion`.
- Never add client-side secrets or write tokens.

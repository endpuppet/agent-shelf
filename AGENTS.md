# Agent Shelf — agent instructions

Agent Shelf is a public registry and visual browser for reusable skills and prompts.

## Public-content rule

Everything committed here is public. Do not copy secrets, credentials, private personal notes, or sensitive project data into this repository.

## Immutable imported-skill policy

**NEVER author or modify an imported SKILL.md.**

A file inside the verified `skills/` namespace is an immutable upstream artifact. It must be **byte-for-byte** identical to the source file in a public GitHub repository at a **full 40-character commit SHA**.

Never summarize, improve, shorten, translate, normalize, reformat, inject frontmatter into, or tailor an imported `SKILL.md` for an experiment. If a skill needs adaptation, create a prompt, note, experiment, or derivative outside the verified `skills/` namespace. Never present a derivative as the original upstream skill.

The only supported import path is:

```bash
node tools/import-skill.mjs \
  --repo owner/repo \
  --commit 0123456789abcdef0123456789abcdef01234567 \
  --path path/to/SKILL.md \
  --category frontend \
  --slug example-skill
```

The importer writes two siblings:

```text
skills/<category>/<slug>/
├── SKILL.md          # exact upstream bytes; immutable
└── agent-shelf.json  # Agent Shelf provenance + integrity metadata
```

Do not add Agent Shelf metadata to `SKILL.md`. Titles, Slovenian translations, descriptions, categories and tags belong in `catalog.json` or `agent-shelf.json`, never in the imported source.

Every imported skill must pass:

```bash
node tools/verify-imported-skills.mjs
```

The verifier re-fetches the commit-pinned upstream source and checks byte identity, SHA-256, byte count, provenance, and catalog trust fields. A failed integrity check blocks completion and GitHub Pages publication. If upstream verification cannot complete, do not bypass it.

## Content organization

- Keep `skills/` and `prompts/` organized by broad use case, not by source repository.
- A verified imported skill lives at `skills/<category>/<slug>/SKILL.md` with sibling `agent-shelf.json`.
- A prompt lives at `prompts/<category>/<slug>/PROMPT.md`.
- Prefer stable lowercase kebab-case destination paths.
- The cleanup state with zero imported skills is valid.

## Catalog rules

Every visible item needs one matching `catalog.json` entry with `id`, `type`, `category`, `slug`, `title`, `description`, `tags`, and `path`.

A skill entry must additionally declare `verification: "exact-upstream"` and provenance fields that match its sibling `agent-shelf.json`. Prompt content is authored Agent Shelf content and is outside the upstream byte-identity contract.

## Interface rules

- Mobile first.
- Comfortable touch targets; do not require hover.
- Keep the static site build-free and GitHub Pages friendly.
- Preserve hash-based deep links for every item.
- Preserve Copy content, Copy shelf link, Copy source link, and Open on GitHub.
- Verified skills must expose their pinned upstream provenance.
- The EN/SL switch may translate interface/catalog metadata only; it must never translate source skill content.
- Respect `prefers-reduced-motion`.
- Never add client-side secrets or write tokens.

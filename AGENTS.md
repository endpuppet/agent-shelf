# Agent Shelf — agent instructions

Agent Shelf is a public Git-backed registry and visual browser for reusable skills and prompts.

## Public-content rule

Everything committed here is public. Do not copy secrets, credentials, private personal notes, or sensitive project data into this repository.

## Trusted-main workflow

`main` is the trusted published shelf state.

Content changes should normally happen on a short-lived branch, pass CI, and land through a Pull Request. Do not introduce a permanent content branch unless a future release explicitly changes the architecture. Do not write directly to `main` from browser code.

## Immutable imported-skill policy

**NEVER author or modify an imported SKILL.md.**

A verified `github-upstream` skill is an immutable upstream artifact. It must be **byte-for-byte** identical to the source file in a public GitHub repository at a **full 40-character commit SHA**.

Never summarize, improve, shorten, translate, normalize, reformat, inject frontmatter into, or tailor an exact-upstream `SKILL.md`. If a skill needs adaptation, create a separate `derived`, `personal`, or `generated` item. Never present a derivative as the original upstream skill.

The supported exact-upstream import path is:

```bash
node tools/import-skill.mjs \
  --repo owner/repo \
  --commit 0123456789abcdef0123456789abcdef01234567 \
  --path path/to/SKILL.md \
  --category frontend \
  --slug example-skill
```

The importer writes:

```text
skills/<category>/<slug>/
├── SKILL.md   # exact upstream bytes; immutable
└── item.json  # Agent Shelf metadata, provenance, integrity, tracking
```

Do not add Agent Shelf metadata to `SKILL.md`.

Every imported upstream skill must pass:

```bash
node tools/verify-imported-skills.mjs
```

The verifier re-fetches the commit-pinned upstream source and checks byte identity, SHA-256, byte count, provenance, and filesystem agreement. A failed integrity check blocks completion and GitHub Pages publication. If upstream verification cannot complete, do not bypass it.

`.gitattributes` must continue to contain:

```gitattributes
skills/**/SKILL.md -text
```

This protects exact source bytes from line-ending normalization.

## Canonical item model

The filesystem plus each item's sibling `item.json` are the canonical source of truth.

```text
skills/<category>/<slug>/
├── SKILL.md
└── item.json

prompts/<category>/<slug>/
├── PROMPT.md
└── item.json
```

Every item must have explicit origin/provenance. Supported schema-v1 origin types are:

- `github-upstream`
- `github-owned`
- `personal`
- `derived`
- `generated`

`external-url` is reserved for a later release and is not a verified origin mode today.

Only a valid `github-upstream` skill with `integrity.mode = "exact-upstream"`, a full immutable commit SHA, matching local integrity metadata, and a successful network verifier run may be displayed as `EXACT UPSTREAM`.

Never add authored `verification`, `badge`, or `trust_label` fields to `item.json`. Trust state is derived.

Use stable lowercase kebab-case category and slug paths. Metadata `type`, `category`, and `slug` must agree with the filesystem location.

## Generated catalog

`catalog.json` is generated output. It is ignored by Git and must never be hand-maintained or treated as an authority.

Generate it with:

```bash
node tools/generate-catalog.mjs
```

The generator scans canonical item folders, validates metadata and sibling content, verifies local hashes/byte lengths, derives trust state, and emits deterministic UI data.

Deleting an item folder removes that item from the next generated catalog automatically. Do not add catalog tombstones or parallel inventory records.

## Translation boundary

Only WebUI chrome is translated between English and Slovenian.

Translate UI words such as navigation, search, categories, actions, status messages, trust labels, and provenance field labels.

Do **not** translate or create locale aliases for:

- skill titles
- prompt titles
- skill descriptions
- prompt descriptions
- source-authored tags
- `SKILL.md`
- `PROMPT.md`
- repository names
- author names
- source paths
- commit SHAs
- provenance values

For example, `Research Max` remains `Research Max` in Slovenian mode.

## Interface rules

- Mobile first.
- Comfortable touch targets; do not require hover.
- Keep the public site static, read-only, build-free, and GitHub Pages friendly.
- Preserve hash-based deep links for every item.
- Preserve Copy content, Copy shelf link, Copy source link, and Open on GitHub.
- Exact-upstream skills must expose their pinned upstream provenance.
- Respect `prefers-reduced-motion`.
- Never add client-side secrets or write tokens.

## Required verification before completion

For Release A and later canonical-model work, run the same sequence CI uses:

```bash
node tests/item-schema.mjs
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
node tools/verify-imported-skills.mjs
node tests/catalog-builder.mjs
node tools/generate-catalog.mjs
node tests/catalog-authority.mjs
node tests/verify.mjs
```

Do not claim completion while any integrity, generation, or publication check fails.

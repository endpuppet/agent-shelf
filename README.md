# Agent Shelf

A public, Git-backed visual shelf for reusable **agent skills** and **prompts**.

`main` is the trusted published state. The canonical source of truth is the repository filesystem plus each item's `item.json`; the browser catalog is generated from that state.

Imported upstream skills use a deliberately strict trust model: a skill marked `VERIFIED · EXACT UPSTREAM` is an exact copy of one immutable GitHub revision, not an Agent Shelf rewrite.

## What the interface does

- browse Skills and Prompts separately
- filter by use-case category
- search canonical title, description, tags, and category
- preview Markdown or inspect raw source
- copy full file content
- copy a shareable Agent Shelf deep link
- copy/open the canonical source link
- show provenance and integrity information
- expose commit-pinned provenance for exact-upstream skills
- switch WebUI chrome between English and Slovenian without translating item-authored/source-authored metadata or content
- use a mobile-first, touch-safe interface with reduced-motion support

## Canonical structure

```text
skills/
  <category>/
    <slug>/
      SKILL.md
      item.json

prompts/
  <category>/
    <slug>/
      PROMPT.md
      item.json

lib/item-schema.mjs             # canonical schema + trust classification
lib/skill-integrity.mjs         # binary exact-upstream checks
lib/catalog-builder.mjs         # filesystem scan + deterministic projection
tools/import-skill.mjs          # exact-upstream skill importer
tools/verify-imported-skills.mjs# production upstream verifier
tools/generate-catalog.mjs      # generated UI catalog
catalog.json                    # generated locally/in CI; ignored by Git
index.html                      # static shell
app.js                          # routing, UI state, provenance, copy actions
styles.css                      # mobile-first UI
```

The current cleanup state with zero imported skills is valid. Existing prompts use canonical sibling `item.json` metadata.

## `item.json`

Every item records explicit origin/provenance plus integrity metadata.

Schema-v1 origin types:

- `github-upstream` — exact imported upstream skill
- `github-owned` — content whose source is another owner-controlled GitHub repository
- `personal` — directly authored Agent Shelf content
- `derived` — intentionally adapted from another source
- `generated` — generated content accepted as a new owned artifact

`external-url` is reserved for a later release.

Trust labels are derived. An item cannot grant itself `EXACT UPSTREAM` by writing a badge or verification string into metadata.

## Import a skill safely

Do not manually create or edit an exact-upstream `SKILL.md`.

Import from a public GitHub repository using a **full 40-character commit SHA**:

```bash
node tools/import-skill.mjs \
  --repo owner/repo \
  --commit 0123456789abcdef0123456789abcdef01234567 \
  --path path/to/SKILL.md \
  --category frontend \
  --slug example-skill
```

Optional display metadata may be supplied with `--title`, `--description`, and comma-separated `--tags`.

The importer:

1. rejects mutable/short commit refs and unsafe paths;
2. downloads the commit-pinned raw file;
3. writes those response bytes directly to `SKILL.md` without decoding/re-encoding;
4. computes SHA-256 and byte count from the exact buffer;
5. writes provenance/integrity separately to sibling `item.json`.

Before publishing, run:

```bash
node tools/verify-imported-skills.mjs
```

The same network-backed verifier runs in normal CI and again in the GitHub Pages job before the Pages artifact is uploaded.

## What `EXACT UPSTREAM` means

For an item labeled `VERIFIED · EXACT UPSTREAM`, Agent Shelf guarantees that its stored `SKILL.md` exactly matches the recorded upstream file at the recorded immutable Git commit.

The verifier checks:

- full 40-character pinned commit provenance
- local byte length
- upstream byte length
- local SHA-256
- upstream SHA-256
- direct byte-for-byte buffer equality

The guarantee covers provenance and byte identity. It does **not** claim that upstream instructions are safe, correct, current, or high quality.

`.gitattributes` protects `skills/**/SKILL.md` from line-ending normalization.

## Generate the shelf catalog

`catalog.json` is not edited by hand and is not tracked in Git.

Generate it from the filesystem:

```bash
node tools/generate-catalog.mjs
```

The generator validates each `item.json`, verifies the sibling content hash/byte length, derives the item path and trust code, rejects conflicts, sorts deterministically, and writes `catalog.json`.

This means inventory follows structure naturally:

```text
delete item folder
→ regenerate catalog
→ item disappears from the WebUI
```

There is no separate manual catalog record to clean up.

## Translation policy

The EN/SL switch translates **WebUI chrome only**.

Translated examples include navigation, search, category labels, buttons, trust labels, errors, and provenance field labels.

The locale switch never translates or substitutes:

- skill/prompt titles
- descriptions
- tags
- `SKILL.md`
- `PROMPT.md`
- author names
- repository names
- source paths
- commit SHAs
- provenance values

`Research Max` therefore remains `Research Max` in both language modes.

## Prompts and owned content

Prompts are normal canonical Agent Shelf items with explicit origin and local content integrity. Existing adapted prompts are classified as `derived` and retain their known lineage without pretending to have exact-upstream verification.

Future personal and generated skills use the same folder + `item.json` model but never inherit the upstream byte-identity label.

## Verification

Run the publication-equivalent sequence:

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

CI performs the same trust-critical steps and verifies that the generated catalog is untracked output.

## GitHub Pages

In the repository: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Pages publication uses this order:

```text
checkout
→ verify commit-pinned exact-upstream skills
→ generate catalog.json
→ run static verification against generated catalog
→ upload Pages artifact
→ deploy
```

If integrity or generation fails, the new deployment is blocked before artifact upload.

Expected project URL:

`https://endpuppet.github.io/agent-shelf/`

## Mutation direction

The public site remains read-only. Future ChatGPT, CLI, automation, and authenticated Admin UI writes should converge on the same mutation pipeline and create short-lived branches/PRs instead of writing directly to `main`.

Never embed GitHub write credentials in client-side JavaScript.

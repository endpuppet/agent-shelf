# Agent Shelf

A public, Git-backed visual shelf for reusable **agent skills** and **prompts**.

The repository is the source of truth. The root static site is the browsing interface. Imported skills use a deliberately strict trust model: a skill marked verified is an exact copy of one immutable upstream GitHub revision, not an Agent Shelf rewrite.

## What the interface does

- browse Skills and Prompts separately
- filter by use-case category
- full-text search across title, description, tags, and category
- preview Markdown or inspect raw source
- copy full file content
- copy a shareable Agent Shelf deep link
- copy/open the canonical pinned source link
- show verified upstream repository, commit and SHA-256 provenance for imported skills
- switch UI/catalog metadata between English and Slovenian without touching source skill content
- mobile-first layout with touch-safe controls and reduced-motion support

## Structure

```text
skills/
  <category>/
    <slug>/
      SKILL.md          # immutable exact upstream bytes
      agent-shelf.json  # source commit + SHA-256 + byte count

prompts/
  research/
  web-prototypes/
  visual-assets/

lib/skill-integrity.mjs          # shared byte/provenance checks
tools/import-skill.mjs           # only supported skill import path
tools/verify-imported-skills.mjs # production integrity verifier
catalog.json                     # UI index/translated metadata
index.html                       # static shell
app.js                           # catalog, routing, copy actions, Markdown viewer
styles.css                       # mobile-first UI
```

A repository with zero skills is valid. That is the intentional state after removing the earlier unverified/adapted copies.

## Import a skill safely

Do not manually create or edit an imported `SKILL.md`.

Import from a public GitHub repository using a **full 40-character commit SHA**:

```bash
node tools/import-skill.mjs \
  --repo owner/repo \
  --commit 0123456789abcdef0123456789abcdef01234567 \
  --path path/to/SKILL.md \
  --category frontend \
  --slug example-skill
```

The importer downloads the commit-pinned raw file, writes those bytes directly without decoding/re-encoding, computes its SHA-256 and byte count, and stores provenance separately in `agent-shelf.json`.

Agent Shelf metadata can be added to `catalog.json`, but imported skill content must remain **byte-for-byte** identical to upstream. Never summarize, shorten, improve, translate, normalize or adapt it in place.

Before publishing, run:

```bash
node tools/verify-imported-skills.mjs
```

The same verifier runs in normal CI and again in the GitHub Pages job **before** the Pages artifact is uploaded. Any mismatch blocks the new deployment.

## What the guarantee means

For an item labeled `VERIFIED · EXACT UPSTREAM`, Agent Shelf guarantees that its stored `SKILL.md` exactly matches the recorded file at the recorded immutable Git commit. The guarantee covers provenance and byte identity. It does not claim that the upstream instructions are safe, correct, current or high quality.

Adapted or experiment-specific derivatives belong outside the verified `skills/` namespace and must never be presented as the original skill.

## Prompts

Prompts are authored/custom Agent Shelf content and are not subject to the upstream byte-identity contract. Add a prompt under `prompts/<category>/<slug>/PROMPT.md` and add its display metadata to `catalog.json`.

## GitHub Pages setup

In the repository: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Pushes to `main` deploy through `.github/workflows/pages.yml`, but only after imported-skill integrity verification succeeds.

Expected project Pages URL:

`https://endpuppet.github.io/agent-shelf/`

## Design notes

The interface intentionally remains read-only. Editing/committing from the browser can be added later behind proper GitHub authentication, never by embedding a token in client-side code. Even if browser editing is added, verified `SKILL.md` files must remain immutable and updates must go through the pinned import/verification path.

# Agent Shelf — Future Releases Roadmap

This file records implemented foundations plus planned and suggested future workflows for Agent Shelf. It defines the product direction so future conversations and agents can continue without re-litigating core decisions.

## Current baseline

- `main` is the published, trusted state of Agent Shelf.
- GitHub Pages publishes from `main` only after verification passes.
- Imported upstream skills are protected by the exact-upstream safety system.
- Verified upstream `SKILL.md` files must remain byte-for-byte identical to the recorded source at a full 40-character Git commit SHA.
- Release A established the canonical per-item `item.json` model.
- The filesystem plus `item.json` are the canonical source of truth.
- `catalog.json` is deterministic generated output and is ignored by Git.
- Only WebUI chrome is translated between English and Slovenian.
- Current shelf state after cleanup: zero imported skills; existing prompts remain and have canonical sibling metadata.
- Prompts are not covered by the exact-upstream skill guarantee unless a future provenance mode explicitly adds such a guarantee.

## Core direction

Agent Shelf is evolving from a manually maintained catalog into a Git-backed content registry with provenance, version history, safe write workflows, and multiple input paths.

Release A completed the read-side data foundation. Future releases should build writes and update tracking on top of the same canonical filesystem + `item.json` model rather than introducing parallel metadata stores.

## Branching and versioning model

Recommended model:

- `main` = last accepted, published shelf state.
- Every add/edit/delete/update happens on a short-lived branch.
- CI validates the branch.
- Changes land through a Pull Request.
- Git history is the primary version history.
- Do not maintain a permanent `content` branch unless a future multi-environment requirement makes it necessary.
- Avoid direct browser writes to `main`.

This keeps deployment, rollback, audit, provenance, and content history aligned.

Optional future snapshot tags may be used for major milestones, for example `shelf-v1` or `shelf-2026-09`, but item-level version counters should not duplicate Git history unless an external source already provides a real version.

## Canonical content structure

Implemented in Release A:

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
```

`SKILL.md` and `PROMPT.md` are the actual agent inputs.

`item.json` stores Agent Shelf metadata, provenance, tracking, origin, integrity information, and future workflow state. Metadata must never be injected into an immutable upstream `SKILL.md`.

Filesystem type/category/slug and item metadata must agree. Content paths, routes, and visible trust labels are derived rather than independently authored.

## Provenance for every skill

Every skill should always record its origin. Provenance must remain visible and machine-readable even for personal skills.

Schema-v1 origin types:

- `github-upstream` — exact imported skill from a public GitHub repository.
- `github-owned` — source lives in another repository owned/controlled by the user.
- `personal` — authored directly for Agent Shelf by the user.
- `derived` — intentionally adapted from another source.
- `generated` — created with AI or another generator and then owned as a new artifact.
- `external-url` — reserved for a later release; not enabled as a verified origin mode today.

Example verified upstream metadata:

```json
{
  "schema_version": 1,
  "id": "skill-svg-authoring",
  "type": "skill",
  "category": "svg-vector",
  "slug": "svg-authoring",
  "title": "SVG Authoring",
  "description": "...",
  "tags": ["svg"],
  "origin": {
    "type": "github-upstream",
    "repository": "owner/repo",
    "path": "path/to/SKILL.md",
    "commit": "40-character-commit-sha"
  },
  "integrity": {
    "mode": "exact-upstream",
    "sha256": "...",
    "bytes": 12345
  },
  "tracking": {
    "imported_at": "..."
  }
}
```

Example personal origin:

```json
{
  "origin": {
    "type": "personal",
    "author": "endpuppet"
  },
  "integrity": {
    "mode": "content-hash",
    "sha256": "...",
    "bytes": 12345
  }
}
```

Personal skills are editable, but still need origin, hashes, timestamps/tracking metadata, and Git history so they are traceable.

## Trust labels

Do not use one generic verification label for all content.

Suggested UI labels:

- `VERIFIED · EXACT UPSTREAM`
- `PERSONAL`
- `OWN REPOSITORY`
- `DERIVED`
- `GENERATED`

Only byte-verified commit-pinned upstream content may use `EXACT UPSTREAM`.

Trust is derived from canonical metadata and verification state. `item.json` must not contain an authored field capable of self-asserting `EXACT UPSTREAM`.

The guarantee remains narrow: provenance and byte identity are guaranteed, not quality, safety, correctness, or freshness of upstream instructions.

## Translation policy

Only WebUI chrome is translated.

Translate interface text such as:

- Skills / Prompts
- Search
- Categories
- Copy content
- Open source
- Import
- Delete
- Update available
- Settings
- verification/trust labels
- provenance field labels
- interface status messages

Do **not** translate:

- skill titles
- prompt titles
- `SKILL.md`
- `PROMPT.md`
- source-authored or owner-authored item descriptions
- source-authored or owner-authored tags
- repository names
- author names
- source paths
- commit SHAs
- provenance values

A prompt called `Research Max` remains `Research Max` in both English and Slovenian UI.

## Catalog generation

Implemented in Release A.

The flow is:

1. Scan canonical `skills/<category>/<slug>/item.json` and `prompts/<category>/<slug>/item.json`.
2. Validate each item against its filesystem location and sibling content file.
3. Verify local SHA-256 and byte length.
4. Reject duplicate IDs and routes.
5. Derive path and trust projection.
6. Sort deterministically.
7. Generate `catalog.json` for the static WebUI.

`catalog.json` is ignored by Git and must never be hand-maintained.

Deleting an item folder automatically removes it from the next generated UI after merge/deploy. There is no catalog tombstone or separate inventory record.

## Prompt workflows

Prompts should support multiple safe entry paths.

### From ChatGPT

Example request:

```text
Add this prompt under research:
[pasted prompt]
```

Desired workflow:

1. create short-lived branch;
2. create `prompts/<category>/<slug>/PROMPT.md` exactly from the supplied prompt;
3. create/update `item.json`;
4. generate catalog;
5. run CI;
6. open PR;
7. merge after verification.

### From the WebUI

Future authenticated Admin mode should offer:

- Add prompt
- Edit personal prompt
- Delete prompt
- Change category/tags/metadata
- Preview resulting PR

WebUI writes should create a branch/PR, not push directly to `main`.

### From CLI/GitHub

A simple CLI should remain available for direct repository workflows and automation.

## Skill import from URL

Future release: allow convenient GitHub URLs while preserving the strict verifier underneath.

Accepted user input could include:

```text
https://github.com/owner/repo/blob/main/path/to/SKILL.md
```

The system should:

1. parse and validate the GitHub URL;
2. resolve mutable refs such as `main` to the current immutable 40-character commit SHA;
3. fetch the exact bytes at that commit;
4. preview repository, path, resolved commit, hash, size, and source content;
5. classify origin;
6. write exact bytes without transformation;
7. write canonical provenance/integrity metadata separately;
8. generate catalog data;
9. create a short-lived branch/PR;
10. run exact-upstream verification before merge and again before Pages publication.

Friendly URL input is allowed. Mutable storage is not. The stored source must always be pinned to the resolved immutable commit.

## Personal skills

Future Agent Shelf will include user-authored skills.

Personal skills should:

- live in the same visual shelf;
- have `origin.type = "personal"` or another explicit owned origin;
- have Git-backed history;
- have content hashes and tracking timestamps;
- be editable through safe workflows;
- never pretend to be exact upstream content;
- preserve title/content exactly as authored;
- optionally record inspiration or derived-from provenance when relevant.

A later design decision is still open: whether private personal skills should appear in the same UI without existing in the public repository. For now, assume all Agent Shelf content is public unless a separate private-content architecture is explicitly introduced.

## Update tracking for upstream skills

Future release: check whether an upstream source has changed after the pinned commit.

Suggested workflow:

```text
check upstream
→ newer source revision detected
→ show diff
→ mark "update available"
→ create update PR on user request
→ import exact new bytes
→ update provenance/hash
→ CI verify
→ merge
```

Never silently rewrite or auto-merge upstream skill changes.

Old versions remain recoverable through Git history.

## Unified mutation pipeline

All write entry points should converge on one internal workflow:

```text
Agent Shelf Admin UI
ChatGPT
CLI / GitHub automation
        ↓
normalize request
        ↓
identify origin
        ↓
validate content/provenance
        ↓
create short-lived branch
        ↓
write content + item.json
        ↓
generate catalog
        ↓
run CI / integrity checks
        ↓
create or update PR
        ↓
merge
        ↓
Pages deploys trusted main
```

This prevents UI, ChatGPT, and CLI workflows from developing different trust rules.

## Admin UI direction

Recommended long-term direction: keep the public site read-only by default and add an authenticated Admin mode for the owner.

Possible actions:

```text
+ Add
  Import skill from URL
  Add personal skill
  Add prompt
```

Additional admin actions:

- edit personal content;
- move category;
- edit metadata;
- delete item;
- check upstream;
- review source diff;
- create update PR;
- inspect provenance/history.

Authentication should use a proper GitHub/OAuth/server-side flow. Never place long-lived write tokens in client-side JavaScript.

## Useful future filters

As the shelf grows, consider filters for:

- All
- Upstream
- Mine
- Owned repos
- Derived
- Generated
- Update available
- Verified exact upstream

Other useful dimensions may include category, author, source repository, tags, date imported, last checked, and status.

## Release sequence recommendation

### Release A — Canonical data model — implemented

- Introduced `item.json` for prompts and skills.
- Defined origin/provenance and integrity schema.
- Removed translated prompt/skill title/description/tag aliases.
- Limited translation to WebUI chrome.
- Generated `catalog.json` from filesystem metadata.
- Made structural item deletion remove catalog entries after regeneration.
- Preserved exact-upstream byte verification and Pages pre-upload safety gate.

### Release B — Unified write pipeline

- Add branch/PR mutation utilities.
- Add prompt create/edit/delete commands.
- Add personal skill create/edit/delete commands.
- Ensure ChatGPT and CLI use the same logic.

### Release C — Friendly skill URL importer

- Accept GitHub file URLs.
- Resolve branch/tag input to immutable commit SHA.
- Preview source and provenance.
- Import through the existing exact-upstream verifier.
- Create PR rather than writing to `main`.

### Release D — Owner Admin UI

- GitHub-authenticated owner mode.
- Add prompt.
- Add personal skill.
- Import skill URL.
- Delete/move/edit metadata.
- PR preview/status.

### Release E — Upstream tracking

- Check for newer upstream revisions.
- Display `update available`.
- Show diffs.
- Create controlled update PRs.

### Release F — Private/personal expansion

Only if needed later:

- design a separate private source or authenticated private registry;
- decide how private and public items coexist in one UI;
- preserve the same origin and versioning model.

## Non-negotiable rules

- Never alter a verified exact-upstream `SKILL.md`.
- Never translate skill or prompt content/titles/descriptions/tags as part of the Slovenian UI mode.
- WebUI chrome is the translation boundary.
- Every skill has explicit origin/provenance.
- `main` is published trusted state.
- Prefer short-lived branches and PRs for mutations.
- Do not allow browser clients to write directly to `main`.
- Do not expose write credentials in client-side code.
- One mutation pipeline should serve UI, ChatGPT, and CLI entry points.
- Generated catalog/index files must never become an independent source of truth.
- Upstream updates must never silently overwrite content.

## Open questions for future design sessions

- Should personal/private skills eventually be supported without being public?
- Should prompts also support optional external-source provenance and exact-copy verification?
- Should upstream checks run manually, on a schedule, or both?
- Should admin UI merge automatically after green CI, or always require manual confirmation?
- Should categories remain filesystem paths or become metadata-only with generated routing?

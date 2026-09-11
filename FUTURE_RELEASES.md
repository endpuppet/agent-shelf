# Agent Shelf — Future Releases Roadmap

This file records planned and suggested future workflows for Agent Shelf. It is intentionally broader than a task list: it defines the direction of the product so future conversations and agents can continue without re-litigating core decisions.

## Current baseline

- `main` is the published, trusted state of Agent Shelf.
- GitHub Pages publishes from `main` only after verification passes.
- Imported upstream skills are protected by the exact-upstream safety system.
- Verified upstream `SKILL.md` files must remain byte-for-byte identical to the recorded source at a full 40-character Git commit SHA.
- Current shelf state after cleanup: zero imported skills; existing prompts remain.
- Prompts are not covered by the exact-upstream skill integrity guarantee unless a future provenance mode explicitly adds such a guarantee.

## Core direction

Agent Shelf should evolve from a manually maintained catalog into a Git-backed content registry with provenance, version history, safe write workflows, and multiple input paths.

The filesystem plus item metadata should become the canonical source. Generated UI indexes such as `catalog.json` should be derived artifacts, not manually maintained parallel state.

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

Target structure:

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

`item.json` stores Agent Shelf metadata, provenance, tracking, origin, integrity information, display metadata, and future workflow state. Metadata must never be injected into an immutable upstream `SKILL.md`.

## Provenance for every skill

Every skill should always record its origin. Provenance must remain visible and machine-readable even for personal skills.

Suggested origin types:

- `github-upstream` — exact imported skill from a repository not owned by the user.
- `github-owned` — source lives in another repository owned by the user.
- `personal` — authored directly for Agent Shelf by the user.
- `derived` — intentionally adapted from another source.
- `generated` — created with AI or another generator and then owned as a new artifact.
- `external-url` — future fallback for non-GitHub sources if exact verification can be made trustworthy.

Example verified upstream metadata:

```json
{
  "schema_version": 1,
  "id": "skill-svg-authoring",
  "type": "skill",
  "name": "SVG Authoring",
  "category": "svg-vector",
  "origin": {
    "type": "github-upstream",
    "repository": "owner/repo",
    "path": "path/to/SKILL.md",
    "commit": "40-character-commit-sha",
    "url": "https://github.com/owner/repo/..."
  },
  "integrity": {
    "sha256": "...",
    "bytes": 12345
  },
  "tracking": {
    "imported_at": "...",
    "last_checked_at": "...",
    "upstream_status": "current"
  }
}
```

Example personal origin:

```json
{
  "origin": {
    "type": "personal",
    "author": "endpuppet"
  }
}
```

Personal skills are editable, but still need origin, timestamps, hashes, and Git history so they are traceable.

## Trust labels

Do not use one generic verification label for all content.

Suggested labels:

- `VERIFIED · EXACT UPSTREAM`
- `PERSONAL`
- `OWN REPOSITORY`
- `DERIVED`
- `GENERATED`

Only byte-verified commit-pinned upstream content may use `EXACT UPSTREAM`.

The guarantee should remain narrow: provenance and byte identity are guaranteed, not quality, safety, correctness, or freshness of upstream instructions.

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
- Verification labels and interface status messages

Do **not** translate:

- skill titles
- prompt titles
- `SKILL.md`
- `PROMPT.md`
- source-authored descriptions
- source-authored tags
- repository names
- author names
- provenance values

A prompt called `Research Max` must remain `Research Max` in both English and Slovenian UI. The previous Slovenian title aliases should eventually be removed from the catalog/data model.

## Catalog generation

Future release: stop maintaining prompt/skill inventory manually in `catalog.json`.

Recommended flow:

1. Scan `skills/**/item.json` and `prompts/**/item.json`.
2. Validate each item and sibling content file.
3. Generate `catalog.json` as a build/deploy artifact.
4. CI fails on invalid or conflicting metadata.
5. The UI consumes the generated catalog.

Result: deleting an item folder from the repository automatically removes it from the generated UI after merge/deploy.

This avoids the current failure mode where a content file can be deleted while a stale catalog card remains.

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
7. write provenance metadata separately;
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
- have content hashes and timestamps;
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
write content + metadata
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

### Release A — Canonical data model

- Introduce `item.json` for prompts and skills.
- Define origin/provenance schema.
- Remove translated prompt/skill titles.
- Translate WebUI chrome only.
- Generate `catalog.json` from filesystem metadata.
- Make file deletion automatically remove an item from the UI after regeneration.

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
- Never translate skill or prompt content/titles as part of the Slovenian UI mode.
- WebUI chrome is the translation boundary.
- Every skill has explicit origin/provenance.
- `main` is published trusted state.
- Prefer short-lived branches and PRs for mutations.
- Do not allow browser clients to write directly to `main`.
- Do not expose write credentials in client-side code.
- One mutation pipeline should serve UI, ChatGPT, and CLI entry points.
- Generated catalog/index files should not become an independent source of truth.

## Open questions for future design sessions

- Should personal/private skills eventually be supported without being public?
- Should prompts also support optional external-source provenance and exact-copy verification?
- Should upstream checks run manually, on a schedule, or both?
- Should admin UI merge automatically after green CI, or always require manual confirmation?
- Should categories remain filesystem paths or become metadata-only with generated routing?

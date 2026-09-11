# Verified Skill Import Design

## Purpose

Agent Shelf must never present an adapted, shortened, translated, rewritten, or experiment-specific file as an imported skill. A skill shown as verified must be the exact upstream file from a specific immutable source revision.

## Core invariant

> An imported `SKILL.md` is immutable upstream content. Agent Shelf may categorize, describe, translate metadata for, and visually present that file, but must never modify its bytes.

For a verified skill, the repository copy must be byte-for-byte identical to the upstream `SKILL.md` at the recorded 40-character Git commit SHA.

## Scope of v1

Verified imports support public GitHub repositories only, pinned to a full 40-character commit SHA. Branches such as `main`, tags, shortened SHAs, mutable web pages, generated summaries, copied snippets, and manually authored skill content are rejected from the verified `skills/` namespace.

Prompts remain authored Agent Shelf content and are not subject to upstream byte-identity rules.

## Repository layout

Each imported skill uses this shape:

```text
skills/<category>/<slug>/
├── SKILL.md
└── agent-shelf.json
```

`SKILL.md` is the immutable upstream artifact.

`agent-shelf.json` contains Agent Shelf metadata only:

```json
{
  "schema_version": 1,
  "kind": "verified-upstream-skill",
  "source": {
    "repository": "owner/repo",
    "path": "path/to/SKILL.md",
    "commit": "40-character-git-sha"
  },
  "integrity": {
    "sha256": "64-character-lowercase-hex",
    "bytes": 12345
  },
  "imported_at": "2026-09-11T13:00:00.000Z"
}
```

Display metadata such as category, Slovenian title, translated description, tags, or notes may live in `catalog.json` and may change independently. None of it may be injected into `SKILL.md`.

## Import flow

The only supported import path is the repository import tool.

1. User supplies public GitHub repository, full commit SHA, source path, destination category, and slug.
2. Importer rejects mutable refs or invalid paths.
3. Importer downloads the raw source file from the commit-pinned GitHub URL.
4. Importer writes the response bytes directly to destination `SKILL.md` without decoding/re-encoding or text transformation.
5. Importer computes SHA-256 and byte length from those exact bytes.
6. Importer writes `agent-shelf.json` separately.
7. Catalog metadata is added separately from source content.
8. Verification must pass before a Pages artifact can be deployed.

The importer never appends provenance, frontmatter, headings, comments, translations, or formatting to the source file.

## Integrity verifier

A verifier scans every `skills/**/agent-shelf.json` and enforces all of the following:

- exactly one sibling `SKILL.md` exists;
- metadata schema is valid;
- source repository is `owner/repo` format;
- source commit is exactly 40 hexadecimal characters;
- source path is relative and contains no traversal;
- local `SKILL.md` SHA-256 equals the recorded hash;
- local byte length equals the recorded byte length;
- verifier downloads the commit-pinned upstream file;
- upstream bytes equal local bytes exactly;
- upstream SHA-256 equals the recorded hash;
- matching catalog entry, when present, points to the exact local `SKILL.md` path and declares `verification: "exact-upstream"`.

Any mismatch exits non-zero and identifies the skill and failed invariant.

## Line-ending protection

`.gitattributes` marks imported skill files as non-text:

```gitattributes
skills/**/SKILL.md -text
```

This prevents Git checkout settings from rewriting CRLF/LF line endings and invalidating byte identity on different machines.

## Publication safety

The integrity verifier must run in two places:

1. normal verification CI;
2. the GitHub Pages deployment job immediately before the site artifact is uploaded.

A bad direct push therefore cannot publish a modified skill merely because a separate verification workflow failed. If upstream verification is unavailable or fails, the new Pages deployment fails and the previous verified deployment remains published.

## UI trust model

Only a skill that has passed the verified metadata contract may be displayed as an imported skill. Skill cards/details may show:

- `VERIFIED · EXACT UPSTREAM` badge;
- upstream repository;
- pinned short commit display, linked to the full pinned source;
- SHA-256 fingerprint;
- `Copy exact content` action.

The English/Slovenian language switch translates Agent Shelf metadata and interface chrome only. It never translates the source skill content.

## Repository rules for agents

`AGENTS.md` must state:

- never author or modify an imported `SKILL.md`;
- never summarize, improve, normalize, translate, reformat, or tailor imported skill content;
- never copy an experiment-specific derivative into `skills/`;
- imports must use the import tool and a full immutable commit SHA;
- adaptations belong outside the verified `skills/` namespace;
- a failed integrity check blocks completion and publication.

## Cleanup before re-import

All currently stored skills are considered untrusted because their provenance and byte identity were not enforced at import time. They must be removed from `skills/` and their skill entries removed from `catalog.json` before the verified import system becomes authoritative.

The Prompts section remains intact.

## Testing strategy

Tests must prove the safety properties, not only the happy path:

- exact bytes pass;
- one-byte mutation fails;
- altered line ending fails;
- wrong recorded hash fails;
- wrong byte count fails;
- mutable branch ref is rejected;
- shortened commit SHA is rejected;
- path traversal is rejected;
- missing metadata is rejected;
- missing source file is rejected;
- Pages workflow contains the integrity gate before artifact upload;
- zero imported skills is valid during the cleanup state.

A fixture-based test exercises byte comparison without depending on external network access. The production verifier additionally performs the real commit-pinned upstream fetch.

## Security boundary

The guarantee is deliberately narrow and strong: Agent Shelf guarantees exact identity to the recorded upstream Git commit, not that the upstream author is trustworthy, safe, current, or correct. Provenance and integrity are guaranteed; quality and security of upstream instructions are separate concerns.

# Release A — Canonical Data Model Design

## Status

Design approved in chat on 2026-09-11. This document defines Release A only. It does not authorize implementation until the written spec is reviewed and approved.

## Purpose

Release A moves Agent Shelf from a manually maintained catalog to a filesystem-backed canonical content registry while preserving the existing exact-upstream skill integrity guarantees.

The canonical source of truth becomes each item folder plus its sibling `item.json`. `catalog.json` becomes generated output consumed by the read-only WebUI.

The release also establishes the provenance model that later releases will reuse for ChatGPT, CLI, Admin UI, upstream tracking, and PR-based mutation workflows.

## Non-negotiable invariants

1. `main` remains the trusted published state.
2. A skill labeled `EXACT UPSTREAM` must be byte-for-byte identical to a public GitHub source file at a full immutable 40-character commit SHA.
3. Exact-upstream `SKILL.md` bytes are never decoded and rewritten, normalized, translated, reformatted, adapted, or decorated with Agent Shelf metadata.
4. `.gitattributes` continues to protect `skills/**/SKILL.md` with `-text`.
5. Network-backed exact-upstream verification runs before the GitHub Pages artifact is uploaded.
6. Metadata cannot self-assert trusted publication state. `EXACT UPSTREAM` is derived from valid provenance and a successful verifier run.
7. Only WebUI chrome is translated. Item-authored content and source-authored metadata are language invariant.
8. Deleting an item folder removes that item from the next generated catalog.
9. Generated files never become a second source of truth.

## Current-system compatibility issue

The current verifier reads `catalog.json` and cross-checks skill path, `verification: "exact-upstream"`, source repository, source path, commit, and SHA-256 against `agent-shelf.json`.

Release A must not simply remove that check. Instead, the trust relationship changes so both the verifier and catalog generator read the same canonical `item.json` input. This removes manually duplicated provenance while retaining the underlying integrity assertions.

Because the trusted `main` state currently contains zero imported skills, Release A can perform a clean schema cutover without maintaining two provenance manifests for live imported content.

## Canonical filesystem structure

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

The filesystem location is authoritative for item type, category, slug, and content path.

`item.json` must agree with its folder location. A mismatch is a validation error, not an alternate routing mechanism.

## Canonical `item.json` model

All items use one top-level envelope.

```json
{
  "schema_version": 1,
  "id": "skill-svg-authoring",
  "type": "skill",
  "category": "svg-vector",
  "slug": "svg-authoring",
  "title": "SVG Authoring",
  "description": "Source-authored or owner-authored description.",
  "tags": ["svg", "vector"],
  "origin": {},
  "integrity": {},
  "tracking": {}
}
```

### Core fields

- `schema_version`: integer, initially `1`.
- `id`: stable globally unique item identifier.
- `type`: `skill` or `prompt`.
- `category`: lowercase kebab-case and identical to the category directory.
- `slug`: lowercase kebab-case and identical to the item directory.
- `title`: one canonical title only. No locale variants.
- `description`: one canonical description only. No locale variants.
- `tags`: canonical source/owner-authored tags only. No locale variants.
- `origin`: required provenance envelope.
- `integrity`: content integrity information appropriate to the origin type.
- `tracking`: timestamps and future upstream-tracking state.

`path`, GitHub shelf URLs, raw URLs, route URLs, visible trust labels, and translated strings are derived values and are not canonical item fields.

## Origin and provenance model

Every item must have an explicit `origin.type`.

### `github-upstream`

Used for exact imported content from a GitHub repository that is not treated as owner-authored shelf content.

Required provenance:

```json
{
  "origin": {
    "type": "github-upstream",
    "repository": "owner/repo",
    "path": "path/to/SKILL.md",
    "commit": "0123456789abcdef0123456789abcdef01234567"
  },
  "integrity": {
    "mode": "exact-upstream",
    "sha256": "64-character-lowercase-hex",
    "bytes": 12345
  }
}
```

Rules:

- `commit` must be exactly 40 hexadecimal characters.
- `origin.path` must be a safe relative path with no traversal.
- `integrity.mode` must be `exact-upstream`.
- `sha256` and `bytes` describe the exact local bytes and exact pinned upstream bytes.
- Only a skill satisfying this schema and passing the exact-upstream verifier may render the `EXACT UPSTREAM` trust class.

### `github-owned`

Used for content whose canonical source lives in another GitHub repository owned/controlled by the Agent Shelf owner.

It records repository/path/commit provenance when available, but does not receive `EXACT UPSTREAM` merely because it is Git-backed. Its visible trust class is `OWN REPOSITORY`.

Release A defines the schema shape but does not add update automation.

### `personal`

Used for directly authored Agent Shelf content.

Minimum provenance:

```json
{
  "origin": {
    "type": "personal",
    "author": "endpuppet"
  }
}
```

Personal content is editable in future releases but remains public under the current repository model. It must retain Git history and a content hash.

### `derived`

Used when content intentionally adapts another source.

It must not claim exact identity. It may record a source repository, URL, path, author, note, or other lineage evidence when known. Existing adapted prompts should preserve their real lineage without inventing immutable source commits that are not known.

### `generated`

Used for AI- or generator-created content accepted as a new owned artifact. It may record generator/model metadata, but such metadata is descriptive provenance, not a trust label.

### `external-url`

Reserved for a later schema revision or later release. Release A must not enable `external-url` as a verified exact-copy mode because no trustworthy external verification contract has yet been defined.

## Integrity model

Integrity is distinct from origin.

Supported Release A integrity modes:

- `exact-upstream`: only for verified commit-pinned `github-upstream` skills.
- `content-hash`: for owned, personal, derived, generated, and prompt content where Agent Shelf records local content identity without claiming upstream byte identity.

The validator must reject incompatible combinations, including:

- `personal` + `exact-upstream`;
- `generated` + `exact-upstream`;
- `derived` + `exact-upstream`;
- `github-upstream` skill without a full commit SHA;
- exact-upstream metadata without SHA-256 and byte length.

## Trust labels are derived, never authored

`item.json` must not contain a user-authored `verification`, `badge`, `trust_label`, or equivalent field that can assert `EXACT UPSTREAM`.

The catalog generator derives a machine trust code from canonical metadata. The WebUI translates that machine code into visible chrome.

For example:

```text
origin.type = github-upstream
+ integrity.mode = exact-upstream
+ schema valid
+ verifier passes
= generated trust code: exact-upstream
```

Other origin types derive non-verification classifications such as `personal`, `own-repository`, `derived`, or `generated`.

The guarantee remains deliberately narrow: exact upstream proves provenance and byte identity, not quality, safety, correctness, freshness, or trustworthiness of the instructions.

## Validation boundary

A shared validator should be the canonical schema authority used by import, verification, generation, tests, and future mutation commands.

Validation covers:

- known schema version;
- globally unique ID;
- valid item type;
- valid lowercase kebab-case category/slug;
- metadata type/category/slug matching filesystem location;
- expected sibling content file exists;
- no unexpected second canonical content file;
- required origin fields by origin type;
- required integrity fields by integrity mode;
- full SHA for exact-upstream GitHub provenance;
- valid lowercase SHA-256;
- non-negative integer byte length;
- safe relative source paths;
- no forbidden translated item fields such as `title_sl`, `description_sl`, or `tags_sl`;
- no authored exact-upstream trust field;
- duplicate ID rejection.

For local `content-hash` items, generation/verification should confirm the recorded hash and byte count against the sibling content file.

## Exact-upstream verification after Release A

The exact-upstream verifier stops trusting `catalog.json` as input.

It scans canonical skill `item.json` files and, for every `github-upstream` + `exact-upstream` skill:

1. validates the item schema and filesystem location;
2. finds the sibling `SKILL.md`;
3. reads local skill bytes without text normalization;
4. confirms local byte length and SHA-256;
5. constructs the raw commit-pinned GitHub URL from canonical provenance;
6. fetches upstream bytes;
7. confirms upstream byte length and SHA-256;
8. confirms local and upstream buffers are byte-for-byte equal;
9. exits non-zero on any mismatch or unavailable upstream verification.

The verifier must also reject orphan `SKILL.md` files that lack a valid sibling `item.json`.

The current CRLF/LF mutation, one-byte mutation, wrong hash, wrong byte count, mutable commit, shortened SHA, traversal, and missing-content safety cases remain mandatory regression tests.

## Catalog generation

`catalog.json` becomes deterministic generated output.

Generation algorithm:

1. scan `skills/*/*/item.json` and `prompts/*/*/item.json`;
2. validate every item plus sibling content;
3. verify local content hashes;
4. derive content path from filesystem location;
5. derive route/display trust code from metadata;
6. reject duplicate IDs or duplicate type/category/slug tuples;
7. sort deterministically;
8. emit `catalog.json`.

The generator must not inject a current-time value that causes identical source trees to produce different catalogs.

`catalog.json` is allowed to contain flattened derived fields useful to the static UI, including content path and normalized provenance fields. Those values are generated projections only and are never edited by hand.

## Catalog storage decision

Release A should treat `catalog.json` as generated rather than canonical.

Preferred implementation:

- local development generates it when needed;
- CI generates it before static verification;
- Pages generates it before artifact upload;
- source validation can fail if a tracked catalog is stale if the implementation temporarily keeps it committed during migration;
- the end-state should not require human catalog edits.

Whether the generated file remains checked into Git for static convenience is an implementation detail, but CI must prove it is reproducible from canonical item metadata. A checked-in generated catalog may never override filesystem state.

## Deletion semantics

Deletion is structural.

If an item folder is absent, it is absent from the next catalog. There is no independent catalog tombstone and no manual inventory cleanup step.

Required integration test:

1. create at least two valid fixture item folders;
2. generate catalog;
3. assert both are present;
4. delete one fixture folder;
5. regenerate catalog;
6. assert the deleted item is absent and the remaining item is unchanged.

This is the acceptance test for the Release A deletion guarantee.

## Prompt migration

The current prompts keep their existing `PROMPT.md` bytes.

Each receives an `item.json` with:

- current canonical English title;
- current canonical English description;
- current canonical tags;
- explicit origin classification;
- local content hash and byte count;
- preserved known lineage where the prompt frontmatter currently says it was adapted from another source.

No Slovenian prompt title/description/tag copies are migrated.

Release A does not rewrite prompt bodies merely to move provenance out of frontmatter. Removing or normalizing existing prompt frontmatter would be a separate content mutation unless explicitly approved.

## Skill importer migration

The existing exact-upstream import semantics remain intact:

- caller supplies repository, full commit SHA, source path, destination category, and slug;
- importer rejects mutable refs and invalid destination/source paths;
- upstream response bytes are written directly to `SKILL.md`;
- SHA-256 and byte length are computed from those exact bytes;
- provenance/integrity is written to sibling `item.json`;
- importer never writes display/provenance material into `SKILL.md`.

Release A changes the metadata manifest, not the binary-safe import behavior.

Friendly mutable GitHub URLs remain Release C scope.

## Translation boundary

The locale switch affects WebUI chrome only.

Translated examples:

- Skills / Prompts;
- Search;
- Categories;
- copy/open actions;
- empty/error states;
- trust/status labels;
- `Repository`, `Commit`, `Fingerprint` UI labels;
- category display names.

Never translated by locale switching:

- item title;
- item description;
- item tags;
- `SKILL.md`;
- `PROMPT.md`;
- repository name;
- author name;
- source path;
- commit SHA;
- provenance values.

The browser functions that currently select `title_sl`, `description_sl`, and `tags_sl` must disappear. Search indexes canonical item metadata plus translated UI category labels where useful.

`Research Max` therefore renders exactly as `Research Max` in both English and Slovenian mode.

## WebUI provenance rendering

The current provenance module independently fetches `catalog.json` and contains hardcoded English trust chrome. Release A should converge provenance rendering with the primary application state so that:

- catalog data has one client-side owner;
- trust rendering uses derived catalog trust codes;
- trust labels and provenance field labels are translated as WebUI chrome;
- pinned source URLs remain constructed from immutable provenance;
- no locale operation changes provenance values.

This is a focused consolidation required by the new data contract, not a general frontend refactor.

## CI and Pages workflow

Recommended verification order:

```text
checkout
  -> schema/filesystem validation
  -> local content-hash verification
  -> exact-upstream network verification
  -> generate catalog.json
  -> deterministic/stale-output check if catalog is tracked
  -> static/UI tests against generated catalog
  -> upload Pages artifact
  -> deploy
```

The exact-upstream network gate must remain before `actions/upload-pages-artifact`.

The regular pull-request verification workflow should run the same canonical schema/generator tests so a PR cannot merge metadata that Pages would later reject.

## Tests and acceptance criteria

Release A is complete only when tests prove all of the following:

### Schema/provenance

- each supported origin type validates with its required fields;
- unknown origin types fail;
- incompatible origin/integrity combinations fail;
- exact-upstream requires a full 40-character SHA;
- traversal source paths fail;
- duplicate IDs fail;
- filesystem/category/slug mismatch fails;
- translated item fields fail schema validation;
- authored exact-upstream trust fields fail validation.

### Integrity

- exact upstream bytes pass;
- one-byte local mutation fails;
- line-ending mutation fails;
- upstream mutation fails;
- wrong hash fails;
- wrong byte count fails;
- missing `SKILL.md` fails;
- orphan `SKILL.md` without canonical metadata fails;
- zero imported skills remains valid.

### Generated catalog

- valid filesystem state generates deterministic catalog output;
- generated paths match actual content files;
- provenance projection matches canonical metadata;
- deletion followed by regeneration removes the item;
- hand-maintained translated title/description/tag fields cannot reappear.

### UI

- EN/SL switch changes chrome but not item title/description/tags/content/provenance;
- `Research Max` remains `Research Max` in both locales;
- exact-upstream provenance is shown only for generated `exact-upstream` trust state;
- pinned source link uses the full recorded commit;
- existing hash deep links continue to resolve.

### Publication

- normal CI runs canonical validation and exact-upstream verification;
- Pages runs exact-upstream verification before artifact upload;
- catalog generation happens before the deployed artifact is assembled;
- failure in any integrity step blocks the new deployment.

## Migration sequence

Implementation should be ordered to avoid a temporary trust gap:

1. Add shared item-schema validation and tests without changing import behavior.
2. Add `item.json` fixtures/model support and migrate current prompts while preserving `PROMPT.md` bytes.
3. Teach exact-upstream importer and verifier to use `item.json`; retain all existing byte-integrity regression tests.
4. Add deterministic catalog generation from canonical filesystem metadata.
5. Switch static/UI tests to generated catalog semantics, including deletion regression coverage.
6. Remove translated item metadata and change locale behavior to chrome-only translation.
7. Consolidate provenance rendering into the primary app data flow.
8. Update CI and Pages generation/verification order.
9. Remove obsolete `agent-shelf.json` assumptions and old catalog-authoring rules.
10. Update `AGENTS.md`, `README.md`, and roadmap status to describe the new contract.

At no point should implementation relax the existing exact-byte comparison, immutable commit requirement, line-ending protection, or Pages pre-upload gate.

## Release A non-goals

Release A does not implement:

- permanent content branches;
- browser writes;
- OAuth/admin authentication;
- branch/PR mutation utilities;
- friendly mutable GitHub URL resolution;
- automatic upstream update checks;
- update diffs/PRs;
- private personal content;
- automatic merges;
- external URL exact verification;
- translated prompt/skill content or metadata.

Those belong to later releases in `FUTURE_RELEASES.md`.

## Operational note: trusted-main enforcement

The current repository reports `main` as unprotected. The Pages verifier protects publication integrity, but the preferred short-lived-branch + PR model is not yet fully enforced by repository branch protection.

Release A code does not require changing branch protection. After the new verification job names stabilize, enabling required pull-request/status checks for `main` is recommended as a repository administration step.

## Resulting architecture

```text
SKILL.md / PROMPT.md
        +
     item.json
        |
        v
shared schema + provenance validation
        |
        +--> local content-hash verification
        |
        +--> exact-upstream byte verification
        |
        v
deterministic catalog generator
        |
        v
     catalog.json
        |
        v
read-only static WebUI
```

The security-critical direction is one-way: canonical files produce verified generated UI data. The generated catalog never confers trust back onto canonical content.

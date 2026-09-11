# Release A — Canonical Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Agent Shelf's manually maintained catalog and legacy `agent-shelf.json` metadata with canonical per-item `item.json` files, deterministic catalog generation, chrome-only translation, and an exact-upstream verifier that preserves every existing byte-integrity guarantee.

**Architecture:** Canonical item folders contain the immutable/editable content file plus `item.json`. Shared validation reads that canonical metadata; the exact-upstream verifier reads the same source of truth and performs network-backed byte comparison; the catalog generator projects validated filesystem state into `catalog.json` for the static WebUI. `catalog.json` is generated during local/CI/Pages workflows and is not an authority.

**Tech Stack:** Node.js ESM, built-in `fs`, `path`, `crypto`, native `fetch`, static HTML/CSS/vanilla JS, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-11-release-a-canonical-data-model-design.md`

## Global Constraints

- `main` remains the trusted published state.
- `skills/**/SKILL.md` exact-upstream files remain byte-for-byte identical to a public GitHub source file pinned to a full 40-character commit SHA.
- Never normalize, translate, rewrite, re-encode, or decorate exact-upstream `SKILL.md` bytes.
- Keep `.gitattributes` rule `skills/**/SKILL.md -text` unchanged.
- `EXACT UPSTREAM` is derived trust state, never an author-written metadata flag.
- Only WebUI chrome is translated between English and Slovenian.
- Item titles, descriptions, tags, source content, repository names, authors, and provenance values are language invariant.
- Deleting an item folder must remove it from the next generated catalog.
- The exact-upstream network verifier must run before `actions/upload-pages-artifact`.
- A repository with zero imported skills must remain valid.
- Do not implement Release B mutation/PR utilities, Release C friendly URL resolution, upstream update tracking, private content, or browser writes in this release.

---

## Planned File Structure

### New files

- `lib/item-schema.mjs` — canonical item schema validation, filesystem agreement checks, origin/integrity compatibility, trust-code derivation.
- `lib/catalog-builder.mjs` — filesystem scan, local content verification, deterministic catalog projection.
- `tools/generate-catalog.mjs` — CLI wrapper that writes generated `catalog.json`.
- `tests/item-schema.mjs` — schema/provenance contract tests.
- `tests/catalog-builder.mjs` — deterministic generation, duplicate detection, deletion semantics, local hash validation.
- `prompts/research/research-max/item.json`
- `prompts/web-prototypes/svg-world/item.json`
- `prompts/web-prototypes/critter-prototype/item.json`
- `prompts/visual-assets/scene-decomposition/item.json`

### Modified files

- `lib/skill-integrity.mjs` — keep binary helpers; consume canonical item provenance shape.
- `tools/import-skill.mjs` — write `item.json` instead of `agent-shelf.json`; keep exact byte write behavior.
- `tools/verify-imported-skills.mjs` — scan canonical `item.json`, reject orphan skills, stop trusting catalog input.
- `tests/skill-integrity.mjs`
- `tests/import-skill.mjs`
- `tests/verify-imported-skills.mjs`
- `tests/verify.mjs`
- `app.js`
- `index.html`
- `styles.css`
- `.github/workflows/verify.yml`
- `.github/workflows/pages.yml`
- `AGENTS.md`
- `README.md`
- `FUTURE_RELEASES.md`

### Removed files after migration

- `catalog.json` as a hand-maintained tracked source artifact.
- `verified-provenance.js` after its behavior is folded into `app.js`.
- `verified-provenance.css` after its styles are folded into `styles.css`.
- Legacy `agent-shelf.json` assumptions in code/tests/docs. No live skill manifest files currently exist on `main`.

---

### Task 1: Add the canonical item schema

**Files:**
- Create: `lib/item-schema.mjs`
- Create: `tests/item-schema.mjs`

**Interfaces:**
- Produces: `validateItem(item, context)` where `context = { expectedType, expectedCategory, expectedSlug }`.
- Produces: `deriveTrustCode(item)` returning one of `exact-upstream`, `own-repository`, `personal`, `derived`, `generated`.
- Produces: `contentFilename(type)` returning `SKILL.md` or `PROMPT.md`.
- Produces: `isSafeRelativePath(value)` for provenance path validation.

- [ ] **Step 1: Write schema tests before implementation**

Create `tests/item-schema.mjs` with fixtures covering every allowed origin and all forbidden combinations. Include assertions equivalent to:

```js
import assert from 'node:assert/strict';
import { validateItem, deriveTrustCode, contentFilename } from '../lib/item-schema.mjs';

const SHA40 = '0123456789abcdef0123456789abcdef01234567';
const HASH64 = 'a'.repeat(64);

const upstream = {
  schema_version: 1,
  id: 'skill-svg-authoring',
  type: 'skill',
  category: 'svg-vector',
  slug: 'svg-authoring',
  title: 'SVG Authoring',
  description: 'Author SVG assets.',
  tags: ['svg'],
  origin: {
    type: 'github-upstream',
    repository: 'owner/repo',
    path: 'skills/svg/SKILL.md',
    commit: SHA40
  },
  integrity: { mode: 'exact-upstream', sha256: HASH64, bytes: 123 },
  tracking: { imported_at: '2026-09-11T13:00:00.000Z' }
};

assert.doesNotThrow(() => validateItem(upstream, {
  expectedType: 'skill', expectedCategory: 'svg-vector', expectedSlug: 'svg-authoring'
}));
assert.equal(deriveTrustCode(upstream), 'exact-upstream');
assert.equal(contentFilename('skill'), 'SKILL.md');
assert.equal(contentFilename('prompt'), 'PROMPT.md');

for (const badCommit of ['main', 'abc123']) {
  const item = structuredClone(upstream);
  item.origin.commit = badCommit;
  assert.throws(() => validateItem(item), /40-character/i);
}

for (const forbiddenField of ['title_sl', 'description_sl', 'tags_sl', 'verification', 'trust_label', 'badge']) {
  const item = structuredClone(upstream);
  item[forbiddenField] = 'forbidden';
  assert.throws(() => validateItem(item), /forbidden|translated|trust/i);
}

for (const originType of ['personal', 'derived', 'generated']) {
  const item = structuredClone(upstream);
  item.origin = originType === 'personal'
    ? { type: 'personal', author: 'endpuppet' }
    : originType === 'derived'
      ? { type: 'derived', reference: 'test-knowledge-base/prompts/research' }
      : { type: 'generated', author: 'endpuppet', generator: 'ChatGPT' };
  item.integrity = { mode: 'content-hash', sha256: HASH64, bytes: 123 };
  assert.doesNotThrow(() => validateItem(item));
  assert.notEqual(deriveTrustCode(item), 'exact-upstream');
}

{
  const item = structuredClone(upstream);
  item.origin = { type: 'personal', author: 'endpuppet' };
  assert.throws(() => validateItem(item), /exact-upstream|incompatible/i);
}

assert.throws(() => validateItem({ ...upstream, origin: { type: 'unknown' } }), /origin/i);
assert.throws(() => validateItem(upstream, { expectedCategory: 'other' }), /category/i);
assert.throws(() => validateItem(upstream, { expectedSlug: 'other' }), /slug/i);
```

Also include explicit valid fixtures for `github-owned`, `personal`, `derived`, and `generated`.

- [ ] **Step 2: Run the schema test and verify it fails**

Run:

```bash
node tests/item-schema.mjs
```

Expected: failure because `lib/item-schema.mjs` does not exist.

- [ ] **Step 3: Implement `lib/item-schema.mjs` minimally**

Implement constants and checks directly with built-in JavaScript. Use this public shape:

```js
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA40 = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const TYPES = new Set(['skill', 'prompt']);
const ORIGINS = new Set(['github-upstream', 'github-owned', 'personal', 'derived', 'generated']);
const FORBIDDEN_FIELDS = new Set(['title_sl', 'description_sl', 'tags_sl', 'verification', 'trust_label', 'badge']);

export function contentFilename(type) {
  if (type === 'skill') return 'SKILL.md';
  if (type === 'prompt') return 'PROMPT.md';
  throw new Error(`Unsupported item type: ${type}`);
}

export function isSafeRelativePath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.startsWith('/')
    && !value.split('/').includes('..');
}
```

`validateItem` must check required top-level fields, forbidden translated/trust fields, kebab-case category/slug, optional filesystem expectations, origin-specific requirements, integrity shape, and incompatible combinations. `external-url` must fail as unsupported in schema version 1.

`deriveTrustCode` must be pure metadata classification only:

```js
export function deriveTrustCode(item) {
  validateItem(item);
  if (item.origin.type === 'github-upstream' && item.integrity.mode === 'exact-upstream') return 'exact-upstream';
  if (item.origin.type === 'github-owned') return 'own-repository';
  return item.origin.type;
}
```

This function does not claim the network verifier passed; publication safety comes from CI ordering.

- [ ] **Step 4: Run schema tests**

Run:

```bash
node tests/item-schema.mjs
```

Expected: PASS with a single final success line.

- [ ] **Step 5: Commit Task 1**

```bash
git add lib/item-schema.mjs tests/item-schema.mjs
git commit -m "feat: add canonical item schema"
```

---

### Task 2: Migrate existing prompts to canonical `item.json`

**Files:**
- Create four prompt `item.json` files listed in Planned File Structure.
- Test: extend `tests/item-schema.mjs` or add migration assertions to `tests/verify.mjs` only after generation exists.

**Interfaces:**
- Consumes: `validateItem` from Task 1.
- Produces: four valid canonical prompt records with `origin.type = derived` and `integrity.mode = content-hash`.

- [ ] **Step 1: Prove prompt bytes before metadata changes**

Run this exact command and save the output in the implementation notes/terminal log:

```bash
node --input-type=module - <<'NODE'
import fs from 'node:fs';
import { createHash } from 'node:crypto';
for (const file of [
  'prompts/research/research-max/PROMPT.md',
  'prompts/web-prototypes/svg-world/PROMPT.md',
  'prompts/web-prototypes/critter-prototype/PROMPT.md',
  'prompts/visual-assets/scene-decomposition/PROMPT.md'
]) {
  const bytes = fs.readFileSync(file);
  console.log(file, bytes.length, createHash('sha256').update(bytes).digest('hex'));
}
NODE
```

Do not edit any `PROMPT.md` in this task.

- [ ] **Step 2: Create each `item.json`**

Use current English catalog metadata exactly for `title`, `description`, and `tags`. Use the existing prompt frontmatter lineage as `origin.reference`:

- `research-max`: `test-knowledge-base/prompts/research`
- `svg-world`: `test-knowledge-base/prompts/svgworld`
- `critter-prototype`: `test-knowledge-base/prompts/critterproto`
- `scene-decomposition`: `Popackani / ENDNODE scene-separation workflow`

Each file follows:

```json
{
  "schema_version": 1,
  "id": "prompt-research-research-max",
  "type": "prompt",
  "category": "research",
  "slug": "research-max",
  "title": "Research Max",
  "description": "Evidence-first research orchestration with depth levels, modifiers, source verification, and practical synthesis.",
  "tags": ["research", "verification", "tools", "sources"],
  "origin": {
    "type": "derived",
    "reference": "test-knowledge-base/prompts/research"
  },
  "integrity": {
    "mode": "content-hash",
    "sha256": "<insert hash printed by Step 1>",
    "bytes": 2094
  },
  "tracking": {}
}
```

Use the Step 1 output for every hash and byte count rather than copying assumed values from Git metadata.

- [ ] **Step 3: Validate all four prompt items**

Run:

```bash
node --input-type=module - <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { validateItem } from './lib/item-schema.mjs';
for (const file of [
  'prompts/research/research-max/item.json',
  'prompts/web-prototypes/svg-world/item.json',
  'prompts/web-prototypes/critter-prototype/item.json',
  'prompts/visual-assets/scene-decomposition/item.json'
]) {
  const item = JSON.parse(fs.readFileSync(file, 'utf8'));
  const [, category, slug] = file.split('/');
  validateItem(item, { expectedType: 'prompt', expectedCategory: category, expectedSlug: slug });
}
console.log('Prompt item metadata validates.');
NODE
```

Expected: `Prompt item metadata validates.`

- [ ] **Step 4: Confirm prompt bodies are unchanged**

Re-run the hash command from Step 1 and compare all four outputs byte-for-byte with the saved pre-change output.

- [ ] **Step 5: Commit Task 2**

```bash
git add prompts/*/*/item.json
git commit -m "feat: add canonical prompt metadata"
```

---

### Task 3: Migrate exact-upstream import and verification to `item.json`

**Files:**
- Modify: `lib/skill-integrity.mjs`
- Modify: `tools/import-skill.mjs`
- Modify: `tools/verify-imported-skills.mjs`
- Modify: `tests/skill-integrity.mjs`
- Modify: `tests/import-skill.mjs`
- Modify: `tests/verify-imported-skills.mjs`

**Interfaces:**
- Consumes: `validateItem` from Task 1.
- Produces: importer writing exact upstream bytes plus sibling `item.json`.
- Produces: verifier scanning canonical skill items and rejecting orphan `SKILL.md` files.

- [ ] **Step 1: Rewrite tests first for the canonical metadata shape**

Change exact-upstream fixtures to:

```js
const itemFor = (bytes = original) => ({
  schema_version: 1,
  id: 'skill-frontend-exact-skill',
  type: 'skill',
  category: 'frontend',
  slug: 'exact-skill',
  title: 'Exact Skill',
  description: 'Exact upstream fixture.',
  tags: [],
  origin: { repository: 'owner/repo', path: 'SKILL.md', commit: COMMIT, type: 'github-upstream' },
  integrity: { mode: 'exact-upstream', sha256: sha256(bytes), bytes: bytes.length },
  tracking: { imported_at: '2026-09-11T13:00:00.000Z' }
});
```

Update temporary fixture directories to write `item.json`, not `agent-shelf.json`.

Add an orphan test that writes `skills/frontend/orphan/SKILL.md` without `item.json` and expects rejection matching `/orphan|item\.json/i`.

Keep all current mutation cases: one-byte local mutation, upstream mutation, wrong hash, wrong byte count, mutable/short commit, traversal, missing source file, and zero imported skills.

- [ ] **Step 2: Run the three integrity/import tests and verify failure**

```bash
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
```

Expected: failures due to legacy metadata shape/filename until implementation changes are made.

- [ ] **Step 3: Refactor `lib/skill-integrity.mjs` without changing binary comparison semantics**

Keep `sha256(bytes)` and `verifyByteIdentity(localBytes, upstreamBytes, item)` binary-safe. Change URL construction to read:

```js
export function rawGitHubUrl(item) {
  validateItem(item);
  if (item.origin.type !== 'github-upstream' || item.integrity.mode !== 'exact-upstream') {
    throw new Error('Raw upstream URL requires an exact-upstream GitHub item.');
  }
  const [owner, repo] = item.origin.repository.split('/');
  const encodedPath = item.origin.path.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${item.origin.commit}/${encodedPath}`;
}
```

`verifyByteIdentity` must continue using `Buffer.from(...)`, exact byte length, local SHA-256, upstream SHA-256, and `Buffer.equals`.

- [ ] **Step 4: Change importer output to `item.json`**

Keep these required CLI inputs: `repo`, `commit`, `path`, `category`, `slug`. Add optional `title`, `description`, and comma-separated `tags`. If `title` is omitted, derive a deterministic display title from the slug by replacing hyphens with spaces and title-casing words. Default description to an empty string and tags to `[]`.

The importer must construct:

```js
const item = {
  schema_version: 1,
  id: `skill-${category}-${slug}`,
  type: 'skill',
  category,
  slug,
  title: title || slug.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  description: description || '',
  tags: tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
  origin: { type: 'github-upstream', repository: repo, path: sourcePath, commit },
  integrity: { mode: 'exact-upstream', sha256: sha256(bytes), bytes: bytes.length },
  tracking: { imported_at: now().toISOString() }
};
```

Write upstream response bytes directly with `fs.writeFileSync(skillFsPath, bytes)` and write only metadata JSON as UTF-8.

- [ ] **Step 5: Rewrite verifier scanning logic**

`tools/verify-imported-skills.mjs` must scan `skills/<category>/<slug>/` item directories, require `item.json` for every `SKILL.md`, validate filesystem agreement, and run network byte verification only for `github-upstream + exact-upstream` items.

It must not read `catalog.json`.

Reject:

- `SKILL.md` without `item.json`;
- `item.json` declaring type other than skill inside `skills/`;
- exact-upstream metadata without a sibling skill;
- any local/upstream byte mismatch;
- unsupported trust combinations.

- [ ] **Step 6: Run all three tests**

```bash
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
```

Expected: all PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add lib/skill-integrity.mjs tools/import-skill.mjs tools/verify-imported-skills.mjs tests/skill-integrity.mjs tests/import-skill.mjs tests/verify-imported-skills.mjs
git commit -m "feat: migrate verified skills to item metadata"
```

---

### Task 4: Add deterministic filesystem-driven catalog generation

**Files:**
- Create: `lib/catalog-builder.mjs`
- Create: `tools/generate-catalog.mjs`
- Create: `tests/catalog-builder.mjs`

**Interfaces:**
- Consumes: `validateItem`, `deriveTrustCode`, `contentFilename`.
- Produces: `buildCatalog({ rootDir }) -> { version: 4, items: [...] }`.
- Produces: `writeCatalog({ rootDir, outputPath })`.

- [ ] **Step 1: Write generation tests first**

Create fixture helpers that build temporary `skills/` and `prompts/` trees. Test all of these behaviors explicitly:

```js
assert.deepEqual(buildCatalog({ rootDir }).items.map((item) => item.id), [
  'prompt-research-a',
  'prompt-research-b'
]);
```

Also assert:

- output order is deterministic across two runs;
- generated `path` is the actual sibling content path;
- generated `trust` equals `deriveTrustCode(item)`;
- duplicate IDs fail;
- duplicate type/category/slug tuples fail;
- metadata/filesystem mismatch fails;
- wrong local content hash fails;
- forbidden translated fields fail through schema validation;
- deleting one fixture folder and rebuilding removes it from output.

Use real bytes and `sha256` to construct valid fixture hashes.

- [ ] **Step 2: Run generator tests and verify failure**

```bash
node tests/catalog-builder.mjs
```

Expected: failure because generator modules do not exist.

- [ ] **Step 3: Implement `lib/catalog-builder.mjs`**

Scan only the two canonical glob shapes by walking exactly two directory levels beneath `skills/` and `prompts/`. Do not infer items from arbitrary nested JSON.

For each item:

1. read and parse `item.json`;
2. validate type/category/slug against directory location;
3. require sibling `SKILL.md` or `PROMPT.md`;
4. read bytes and verify `integrity.bytes` and SHA-256;
5. project canonical metadata into a UI record;
6. sort by `type`, `category`, `slug`, then `id`.

Generated projection shape:

```js
{
  id: item.id,
  type: item.type,
  category: item.category,
  slug: item.slug,
  title: item.title,
  description: item.description,
  tags: item.tags,
  path: `${item.type}s/${item.category}/${item.slug}/${contentFilename(item.type)}`,
  trust: deriveTrustCode(item),
  origin: item.origin,
  integrity: item.integrity,
  tracking: item.tracking
}
```

Do not add timestamps to catalog output.

- [ ] **Step 4: Implement CLI writer**

`tools/generate-catalog.mjs` should call `writeCatalog({ rootDir: process.cwd(), outputPath: 'catalog.json' })`, format JSON with two-space indentation and a trailing newline, and print the item count.

- [ ] **Step 5: Run generator tests**

```bash
node tests/catalog-builder.mjs
```

Expected: PASS.

- [ ] **Step 6: Generate the real catalog and inspect it**

```bash
node tools/generate-catalog.mjs
cat catalog.json
```

Expected: exactly four prompt items, no `*_sl` fields, no skill items, and all paths point to existing prompt files.

- [ ] **Step 7: Commit Task 4**

```bash
git add lib/catalog-builder.mjs tools/generate-catalog.mjs tests/catalog-builder.mjs
git commit -m "feat: generate catalog from filesystem metadata"
```

Do not commit generated `catalog.json` yet; Task 7 finalizes its lifecycle.

---

### Task 5: Make UI metadata language-invariant and integrate provenance rendering

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Remove after integration: `verified-provenance.js`, `verified-provenance.css`

**Interfaces:**
- Consumes: generated catalog fields `title`, `description`, `tags`, `trust`, `origin`, `integrity`.
- Produces: one client-side catalog state owner in `app.js`.

- [ ] **Step 1: Change tests first in `tests/verify.mjs`**

Replace tests that require `title_sl`/`description_sl` with assertions that generated catalog entries contain none of:

```js
for (const item of catalog.items) {
  for (const forbidden of ['title_sl', 'description_sl', 'tags_sl']) {
    assert.equal(forbidden in item, false, `${item.id} must not contain ${forbidden}`);
  }
}
```

Add source assertions that `app.js` no longer defines `itemTitle`, `itemDescription`, or `itemTags` locale fallbacks using `*_sl`.

Add assertions that WebUI translation dictionaries contain trust/provenance chrome keys such as:

```text
trust_exact_upstream
trust_personal
trust_own_repository
trust_derived
trust_generated
provenance_repository
provenance_commit
provenance_fingerprint
```

- [ ] **Step 2: Run `tests/verify.mjs` and verify failure**

```bash
node tests/verify.mjs
```

Expected: failure against current localized item metadata behavior.

- [ ] **Step 3: Remove item-level locale switching from `app.js`**

Delete locale-dependent item helpers. Card/detail rendering must use:

```js
item.title
item.description
item.tags || []
```

Search text becomes:

```js
function searchText(item) {
  return [item.title, item.description, item.category, ...(item.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
```

Category labels remain localized chrome through `categoryLabels`.

- [ ] **Step 4: Integrate provenance UI into `app.js`**

Move provenance state/rendering out of `verified-provenance.js`.

Add translation keys in both locales for trust labels and provenance field labels. Keep values such as repository, commit, source path, and hash unchanged.

Construct pinned source URLs only when:

```js
item.trust === 'exact-upstream'
&& item.origin?.type === 'github-upstream'
```

Use full commit in the URL:

```js
function pinnedSourceUrl(item) {
  const encodedPath = item.origin.path.split('/').map(encodeURIComponent).join('/');
  return `https://github.com/${item.origin.repository}/blob/${item.origin.commit}/${encodedPath}`;
}
```

Render the visible commit shortened only for display.

- [ ] **Step 5: Move provenance markup/styles into primary files**

Either keep provenance markup in `index.html` hidden by default or build it once from `app.js`; whichever is chosen, remove the duplicate catalog fetch. Move `.verification-badge` and provenance layout CSS into `styles.css`.

Then remove script/style references to `verified-provenance.js` and `verified-provenance.css` from `index.html`.

- [ ] **Step 6: Run static verification**

First generate catalog:

```bash
node tools/generate-catalog.mjs
node tests/verify.mjs
```

Expected: PASS after Task 5 code changes.

- [ ] **Step 7: Manual locale smoke test**

Serve the repository with any static server, open the shelf, switch EN/SL, and confirm:

- `Research Max` remains exactly `Research Max`;
- description/tags do not change language;
- buttons/categories/status chrome do change language;
- no duplicate catalog request is emitted by a separate provenance module;
- hash deep links still open the expected item.

- [ ] **Step 8: Commit Task 5**

```bash
git add app.js index.html styles.css tests/verify.mjs
git rm verified-provenance.js verified-provenance.css
git commit -m "feat: limit translation to WebUI chrome"
```

---

### Task 6: Make CI and Pages generate catalog from canonical state

**Files:**
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/verify.mjs`

**Interfaces:**
- Consumes: `tools/generate-catalog.mjs`, canonical verifier.
- Produces: generated catalog before static tests and before Pages artifact upload.

- [ ] **Step 1: Add workflow-order assertions first**

Update `tests/verify.mjs` so it asserts both workflow files contain `node tools/generate-catalog.mjs`.

For Pages, assert ordering:

```js
const verifyIndex = pagesWorkflow.indexOf('node tools/verify-imported-skills.mjs');
const generateIndex = pagesWorkflow.indexOf('node tools/generate-catalog.mjs');
const uploadIndex = pagesWorkflow.indexOf('actions/upload-pages-artifact');
assert.ok(verifyIndex >= 0 && verifyIndex < generateIndex && generateIndex < uploadIndex);
```

Also assert regular CI generates before `node tests/verify.mjs`.

- [ ] **Step 2: Run static test and verify failure**

```bash
node tests/verify.mjs
```

Expected: failure because workflows have not yet been updated.

- [ ] **Step 3: Update verification workflow order**

Use this order in `.github/workflows/verify.yml`:

```yaml
- name: Run item schema tests
  run: node tests/item-schema.mjs
- name: Run skill integrity tests
  run: node tests/skill-integrity.mjs
- name: Run importer tests
  run: node tests/import-skill.mjs
- name: Run imported skill verifier tests
  run: node tests/verify-imported-skills.mjs
- name: Verify imported skills against pinned upstream bytes
  run: node tools/verify-imported-skills.mjs
- name: Run catalog builder tests
  run: node tests/catalog-builder.mjs
- name: Generate catalog from canonical metadata
  run: node tools/generate-catalog.mjs
- name: Run static verification
  run: node tests/verify.mjs
```

- [ ] **Step 4: Update Pages workflow order**

Keep the network verifier before generated artifact creation:

```yaml
- name: Verify imported skills against pinned upstream bytes
  run: node tools/verify-imported-skills.mjs
- name: Generate catalog from canonical metadata
  run: node tools/generate-catalog.mjs
- name: Run static verification
  run: node tests/verify.mjs
- name: Upload static site
  uses: actions/upload-pages-artifact@v4
  with:
    path: .
```

Do not move verification after artifact upload.

- [ ] **Step 5: Run local workflow-equivalent commands**

```bash
node tests/item-schema.mjs
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
node tools/verify-imported-skills.mjs
node tests/catalog-builder.mjs
node tools/generate-catalog.mjs
node tests/verify.mjs
```

Expected: every command succeeds; production verifier prints `Verified 0 imported skills.` on the current repository state.

- [ ] **Step 6: Commit Task 6**

```bash
git add .github/workflows/verify.yml .github/workflows/pages.yml tests/verify.mjs
git commit -m "ci: generate catalog from canonical metadata"
```

---

### Task 7: Remove manual catalog authority and prove deletion semantics end-to-end

**Files:**
- Remove tracked: `catalog.json`
- Create or modify: `.gitignore`
- Modify: `tests/catalog-builder.mjs`
- Modify: `tests/verify.mjs` only if necessary for generated-file precondition messaging.

**Interfaces:**
- Consumes: generator and CI behavior from Tasks 4 and 6.
- Produces: no human-maintained inventory file; generated catalog exists only after generation.

- [ ] **Step 1: Strengthen deletion regression test**

In `tests/catalog-builder.mjs`, ensure the test sequence is exactly:

```js
const before = buildCatalog({ rootDir });
assert.equal(before.items.length, 2);
fs.rmSync(path.join(rootDir, 'prompts/research/remove-me'), { recursive: true, force: true });
const after = buildCatalog({ rootDir });
assert.deepEqual(after.items.map((item) => item.slug), ['keep-me']);
```

- [ ] **Step 2: Add `catalog.json` to `.gitignore`**

If `.gitignore` does not exist, create it with:

```gitignore
catalog.json
```

If it exists by implementation time, append only the missing line.

- [ ] **Step 3: Remove tracked `catalog.json`**

```bash
git rm catalog.json
```

- [ ] **Step 4: Prove clean regeneration from a catalog-less checkout**

```bash
rm -f catalog.json
node tools/generate-catalog.mjs
test -f catalog.json
node tests/verify.mjs
rm -f catalog.json
```

Expected: generation creates the file; tests pass while it exists; deleting the generated artifact leaves Git clean because it is ignored.

- [ ] **Step 5: Run deletion regression again**

```bash
node tests/catalog-builder.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 7**

```bash
git add .gitignore tests/catalog-builder.mjs
git rm --cached catalog.json 2>/dev/null || true
git commit -m "refactor: make catalog a generated artifact"
```

If `git rm catalog.json` from Step 3 already staged the deletion, do not run a second removal command.

---

### Task 8: Update repository policy/docs to the new contract

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `FUTURE_RELEASES.md`

**Interfaces:**
- Produces: agent guidance consistent with actual Release A implementation.

- [ ] **Step 1: Update `AGENTS.md` immutable-skill policy**

Replace references to sibling `agent-shelf.json` with `item.json` and state explicitly:

- imported `SKILL.md` remains immutable exact upstream bytes;
- canonical metadata is in `item.json`;
- trust labels are derived;
- `catalog.json` is generated and must never be hand-maintained;
- only WebUI chrome is translated;
- deleting an item folder removes it from generated UI state;
- imports still require the import tool and full SHA;
- verifier failure blocks completion/publication.

Keep the existing `NEVER author or modify an imported SKILL.md` warning intact.

- [ ] **Step 2: Update `README.md` structure and workflow**

Document:

```text
skills/<category>/<slug>/SKILL.md + item.json
prompts/<category>/<slug>/PROMPT.md + item.json
```

Document local preview sequence:

```bash
node tools/generate-catalog.mjs
# then serve the repository with a static server
```

State that generated `catalog.json` is ignored by Git and recreated by CI/Pages.

- [ ] **Step 3: Mark Release A status in `FUTURE_RELEASES.md`**

Keep the roadmap intact but annotate Release A as implemented once all tests pass. Do not alter later release scope.

- [ ] **Step 4: Run policy/static tests**

Generate catalog first, then run:

```bash
node tools/generate-catalog.mjs
node tests/verify.mjs
```

Expected: PASS, including AGENTS policy assertions.

- [ ] **Step 5: Commit Task 8**

```bash
git add AGENTS.md README.md FUTURE_RELEASES.md
git commit -m "docs: document canonical Agent Shelf model"
```

---

### Task 9: Final Release A verification and PR preparation

**Files:**
- No new implementation files expected.
- Review all files changed by Tasks 1–8.

**Interfaces:**
- Produces: one reviewable short-lived Release A implementation branch ready for PR into trusted `main`.

- [ ] **Step 1: Start from no generated catalog**

```bash
rm -f catalog.json
```

- [ ] **Step 2: Run the complete test suite in publication order**

```bash
node tests/item-schema.mjs
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
node tools/verify-imported-skills.mjs
node tests/catalog-builder.mjs
node tools/generate-catalog.mjs
node tests/verify.mjs
```

Expected:

- every command exits 0;
- production exact-upstream verifier reports zero imported skills on current shelf state;
- generated catalog contains four prompts and zero skills;
- generated catalog has no `title_sl`, `description_sl`, or `tags_sl`;
- generated catalog is ignored by Git.

- [ ] **Step 3: Verify exact-upstream regression behavior with fixtures**

Re-run specifically:

```bash
node tests/skill-integrity.mjs
node tests/verify-imported-skills.mjs
```

Confirm logs show the mutation and line-ending cases are exercised by the test file and the suite passes only because those cases are correctly rejected.

- [ ] **Step 4: Confirm no legacy authority remains**

Run:

```bash
git grep -n "agent-shelf.json" -- ':!docs/superpowers/**' || true
git grep -n "title_sl\|description_sl\|tags_sl" -- ':!docs/superpowers/**' || true
git grep -n 'verification.*exact-upstream' -- ':!docs/superpowers/**' || true
```

Expected: no live code/config/docs references requiring legacy metadata or translated item fields. References inside historical Superpowers design documents are allowed.

- [ ] **Step 5: Confirm generated catalog is not authoritative**

```bash
git status --short
```

Expected: `catalog.json` is absent from status even after generation because it is ignored.

- [ ] **Step 6: Review diff for trust regressions**

```bash
git diff main...HEAD -- .gitattributes lib/skill-integrity.mjs tools/import-skill.mjs tools/verify-imported-skills.mjs .github/workflows/pages.yml
```

Reviewer must confirm:

- `.gitattributes` remains unchanged;
- importer still writes exact upstream bytes directly;
- verifier still compares local/upstream buffers exactly;
- full SHA enforcement remains;
- Pages verifier still occurs before artifact upload.

- [ ] **Step 7: Commit any test-only final fixes, then open PR**

If no changes are needed, do not create an empty commit. Open a PR from the implementation branch to `main` with a summary containing:

```text
Release A: canonical item model

- adds per-item item.json provenance/integrity metadata
- preserves exact-upstream byte verification
- generates catalog.json from filesystem state
- removes translated item metadata
- limits EN/SL switching to WebUI chrome
- makes folder deletion remove catalog entries on regeneration
```

The PR must not be merged until GitHub CI is green.

---

## Self-Review Result

The plan covers every Release A design requirement: canonical `item.json`, all defined origin classes except intentionally disabled `external-url`, exact-upstream verifier migration, local content hashing, deterministic generated catalog, deletion semantics, translation boundary, provenance UI consolidation, CI/Pages ordering, documentation, and regression protection.

No Release B–F mutation, authentication, update-tracking, private-content, or friendly-URL functionality is included.

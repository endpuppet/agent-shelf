# Release A — Canonical Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Agent Shelf's manually maintained catalog and legacy `agent-shelf.json` metadata with canonical per-item `item.json` files, deterministic catalog generation, chrome-only translation, and an exact-upstream verifier that preserves every existing byte-integrity guarantee.

**Architecture:** Each item folder contains its content file plus canonical `item.json`. Shared validation reads that metadata; exact-upstream verification reads the same source of truth and independently fetches commit-pinned bytes; catalog generation projects validated filesystem state into `catalog.json` for the static WebUI. Generated catalog data never grants trust back to canonical content.

**Tech Stack:** Node.js ESM, built-in `fs`, `path`, `crypto`, native `fetch`, vanilla JS/CSS/HTML, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-11-release-a-canonical-data-model-design.md`

## Global Constraints

- `main` remains the trusted published state.
- Exact-upstream `SKILL.md` files remain byte-for-byte identical to a public GitHub source file at a full 40-character commit SHA.
- Never normalize, translate, rewrite, re-encode, or decorate exact-upstream skill bytes.
- Keep `skills/**/SKILL.md -text` in `.gitattributes` unchanged.
- `EXACT UPSTREAM` is derived trust state, never an author-written metadata flag.
- Only WebUI chrome is translated between English and Slovenian.
- Item titles, descriptions, tags, content, repository names, authors, and provenance values are language invariant.
- Deleting an item folder removes it from the next generated catalog.
- The network-backed exact-upstream verifier must run before `actions/upload-pages-artifact`.
- Zero imported skills remains a valid repository state.
- Release B–F features remain out of scope.

## File Map

**Create:** `lib/item-schema.mjs`, `lib/catalog-builder.mjs`, `tools/generate-catalog.mjs`, `tests/item-schema.mjs`, `tests/catalog-builder.mjs`, four prompt `item.json` files.

**Modify:** `lib/skill-integrity.mjs`, `tools/import-skill.mjs`, `tools/verify-imported-skills.mjs`, the three existing integrity/import tests, `tests/verify.mjs`, `app.js`, `index.html`, `styles.css`, both GitHub Actions workflows, `AGENTS.md`, `README.md`, `FUTURE_RELEASES.md`.

**Remove after migration:** tracked manual `catalog.json`, `verified-provenance.js`, `verified-provenance.css`, and all live assumptions that verified skills use `agent-shelf.json`.

---

### Task 1: Canonical item schema

**Files:**
- Create: `lib/item-schema.mjs`
- Create: `tests/item-schema.mjs`

**Interfaces:**
- `validateItem(item, { expectedType, expectedCategory, expectedSlug } = {})`
- `deriveTrustCode(item)`
- `contentFilename(type)`
- `isSafeRelativePath(value)`

- [ ] **Step 1: Write failing schema tests**

Use fixtures with these exact rules:

```js
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
```

Tests must prove:
- all five enabled origins validate: `github-upstream`, `github-owned`, `personal`, `derived`, `generated`;
- `external-url` fails in schema v1;
- mutable/short commits fail for exact upstream;
- unsafe source paths fail;
- `personal`, `derived`, and `generated` cannot use `exact-upstream` integrity;
- translated fields `title_sl`, `description_sl`, `tags_sl` fail;
- authored trust fields `verification`, `trust_label`, `badge` fail;
- filesystem category/slug/type mismatches fail;
- trust derivation returns only `exact-upstream`, `own-repository`, `personal`, `derived`, or `generated`.

- [ ] **Step 2: Run the test**

```bash
node tests/item-schema.mjs
```

Expected: failure because the module does not yet exist.

- [ ] **Step 3: Implement the schema module**

Use:

```js
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA40 = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const TYPES = new Set(['skill', 'prompt']);
const ORIGINS = new Set(['github-upstream', 'github-owned', 'personal', 'derived', 'generated']);
const FORBIDDEN_FIELDS = new Set(['title_sl', 'description_sl', 'tags_sl', 'verification', 'trust_label', 'badge']);
```

Require non-empty `id`, `title`; allow empty `description`; require `tags` array; require `origin`, `integrity`, and `tracking` objects. `github-upstream` requires `repository`, safe `path`, full `commit`, and `integrity.mode === 'exact-upstream'`. Other origins require `content-hash`. `derived` requires a non-empty `reference`; `personal` requires `author`; `generated` requires `author`; `github-owned` requires `repository` and `path` and may include a full `commit`.

`deriveTrustCode` must classify metadata only and must never imply the remote verifier passed.

- [ ] **Step 4: Run schema tests**

```bash
node tests/item-schema.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/item-schema.mjs tests/item-schema.mjs
git commit -m "feat: add canonical item schema"
```

---

### Task 2: Migrate the four existing prompts without touching prompt bytes

**Files:**
- Create: `prompts/research/research-max/item.json`
- Create: `prompts/web-prototypes/svg-world/item.json`
- Create: `prompts/web-prototypes/critter-prototype/item.json`
- Create: `prompts/visual-assets/scene-decomposition/item.json`

**Interfaces:** Uses `validateItem` from Task 1.

- [ ] **Step 1: Record current prompt hashes and byte lengths**

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

- [ ] **Step 2: Generate all four metadata files programmatically**

Run a Node script that reads each prompt byte buffer, computes SHA-256 and byte length, and writes `item.json`. Use these canonical catalog values and lineage references:

```js
const prompts = [
  {
    category: 'research', slug: 'research-max', id: 'prompt-research-research-max',
    title: 'Research Max',
    description: 'Evidence-first research orchestration with depth levels, modifiers, source verification, and practical synthesis.',
    tags: ['research', 'verification', 'tools', 'sources'],
    reference: 'test-knowledge-base/prompts/research'
  },
  {
    category: 'web-prototypes', slug: 'svg-world', id: 'prompt-web-svg-world',
    title: 'SVG World',
    description: 'Build a mobile-first single-file interactive world authored from inline SVG with constrained skill routing and an implementation audit.',
    tags: ['svg', 'prototype', 'mobile-first', 'interactive'],
    reference: 'test-knowledge-base/prompts/svgworld'
  },
  {
    category: 'web-prototypes', slug: 'critter-prototype', id: 'prompt-web-critter-prototype',
    title: 'Critter Prototype',
    description: 'Create a tiny mobile-first world whose critters behave autonomously, react to touch, and recover naturally after interaction.',
    tags: ['canvas', 'critters', 'prototype', 'interaction'],
    reference: 'test-knowledge-base/prompts/critterproto'
  },
  {
    category: 'visual-assets', slug: 'scene-decomposition', id: 'prompt-assets-scene-decomposition',
    title: 'Scene Decomposition',
    description: 'Analyze a flattened scene and plan a compact set of clean, reusable layers for interactive 2D/2.5D or WebGPU reconstruction.',
    tags: ['assets', 'layers', '2.5d', 'webgpu'],
    reference: 'Popackani / ENDNODE scene-separation workflow'
  }
];
```

For each entry, the script must create:

```js
const bytes = fs.readFileSync(contentPath);
const item = {
  schema_version: 1,
  id: prompt.id,
  type: 'prompt',
  category: prompt.category,
  slug: prompt.slug,
  title: prompt.title,
  description: prompt.description,
  tags: prompt.tags,
  origin: { type: 'derived', reference: prompt.reference },
  integrity: {
    mode: 'content-hash',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length
  },
  tracking: {}
};
```

Write with `JSON.stringify(item, null, 2) + '\n'`.

- [ ] **Step 3: Validate every new item and re-check prompt hashes**

Run validation against filesystem expectations, then re-run Step 1's hash command. The before/after output must match exactly.

- [ ] **Step 4: Commit**

```bash
git add prompts/*/*/item.json
git commit -m "feat: add canonical prompt metadata"
```

---

### Task 3: Move exact-upstream import and verification to `item.json`

**Files:** Modify `lib/skill-integrity.mjs`, `tools/import-skill.mjs`, `tools/verify-imported-skills.mjs`, `tests/skill-integrity.mjs`, `tests/import-skill.mjs`, `tests/verify-imported-skills.mjs`.

**Interfaces:** Importer writes exact bytes + `item.json`; verifier scans canonical item folders and rejects orphan `SKILL.md`.

- [ ] **Step 1: Rewrite tests first**

Change test fixtures from legacy metadata to:

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
  origin: { type: 'github-upstream', repository: 'owner/repo', path: 'SKILL.md', commit: COMMIT },
  integrity: { mode: 'exact-upstream', sha256: sha256(bytes), bytes: bytes.length },
  tracking: { imported_at: '2026-09-11T13:00:00.000Z' }
});
```

Preserve all existing negative cases and add `SKILL.md` without `item.json` as an explicit failure.

- [ ] **Step 2: Confirm tests fail before implementation**

```bash
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
```

- [ ] **Step 3: Refactor binary helpers without weakening them**

`sha256(bytes)` remains unchanged. `rawGitHubUrl(item)` must validate canonical item metadata and use `item.origin.repository`, `item.origin.commit`, and `item.origin.path`. `verifyByteIdentity(localBytes, upstreamBytes, item)` must still check exact byte length, local hash, upstream hash, and `Buffer.equals`.

- [ ] **Step 4: Migrate importer output**

Keep required CLI inputs `repo`, `commit`, `path`, `category`, `slug`. Add optional `title`, `description`, comma-separated `tags`. If title is omitted, derive a deterministic title from the slug. Write fetched response bytes directly to `SKILL.md`; compute integrity from that exact buffer; write sibling `item.json` as UTF-8 metadata only.

- [ ] **Step 5: Migrate verifier scanning**

Scan `skills/<category>/<slug>/`. Every `SKILL.md` requires sibling `item.json`; every skill item requires sibling `SKILL.md`. Validate filesystem agreement. For `github-upstream + exact-upstream`, fetch the commit-pinned raw URL and perform exact binary verification. Do not read `catalog.json`.

- [ ] **Step 6: Run tests**

```bash
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/skill-integrity.mjs tools/import-skill.mjs tools/verify-imported-skills.mjs tests/skill-integrity.mjs tests/import-skill.mjs tests/verify-imported-skills.mjs
git commit -m "feat: migrate verified skills to item metadata"
```

---

### Task 4: Deterministic catalog builder

**Files:** Create `lib/catalog-builder.mjs`, `tools/generate-catalog.mjs`, `tests/catalog-builder.mjs`.

**Interfaces:**
- `buildCatalog({ rootDir }) -> { version: 4, items: [...] }`
- `writeCatalog({ rootDir, outputPath = 'catalog.json' })`

- [ ] **Step 1: Write failing generator tests**

Tests must prove deterministic sort order, actual filesystem-derived content paths, derived trust codes, duplicate ID rejection, duplicate route rejection, metadata/filesystem mismatch rejection, wrong local content hash rejection, and structural deletion:

```js
const before = buildCatalog({ rootDir });
assert.equal(before.items.length, 2);
fs.rmSync(path.join(rootDir, 'prompts/research/remove-me'), { recursive: true, force: true });
const after = buildCatalog({ rootDir });
assert.deepEqual(after.items.map((item) => item.slug), ['keep-me']);
```

- [ ] **Step 2: Run test and confirm failure**

```bash
node tests/catalog-builder.mjs
```

- [ ] **Step 3: Implement builder**

Scan only `skills/*/*/item.json` and `prompts/*/*/item.json`. Validate each item against directory type/category/slug, require the correct sibling content file, verify local byte count and SHA-256, reject duplicate IDs/routes, and sort by type/category/slug/id.

Project each item to:

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

No generated current-time field is allowed.

- [ ] **Step 4: Implement CLI writer and run tests**

```bash
node tests/catalog-builder.mjs
node tools/generate-catalog.mjs
```

Expected: tests pass and real catalog contains four prompts, zero skills, no localized item fields.

- [ ] **Step 5: Commit**

```bash
git add lib/catalog-builder.mjs tools/generate-catalog.mjs tests/catalog-builder.mjs
git commit -m "feat: generate catalog from filesystem metadata"
```

Do not stage generated `catalog.json`.

---

### Task 5: Chrome-only translation and integrated provenance UI

**Files:** Modify `app.js`, `index.html`, `styles.css`, `tests/verify.mjs`; remove `verified-provenance.js` and `verified-provenance.css`.

- [ ] **Step 1: Make static tests fail against old behavior**

Replace requirements for `title_sl`/`description_sl` with assertions that catalog items contain none of `title_sl`, `description_sl`, `tags_sl`. Add source assertions that trust/provenance chrome keys exist in both locale dictionaries.

Required keys: `trust_exact_upstream`, `trust_personal`, `trust_own_repository`, `trust_derived`, `trust_generated`, `provenance_repository`, `provenance_commit`, `provenance_fingerprint`.

- [ ] **Step 2: Run test**

```bash
node tools/generate-catalog.mjs
node tests/verify.mjs
```

Expected: failure against current locale-dependent item rendering.

- [ ] **Step 3: Make item metadata invariant**

Cards/details/search use only `item.title`, `item.description`, `item.tags`. Category labels remain translated chrome. `Research Max` must render unchanged in EN and SL.

- [ ] **Step 4: Fold provenance state into `app.js`**

Use generated `item.trust`, `item.origin`, `item.integrity`. Build pinned source URL only when `item.trust === 'exact-upstream'` and `origin.type === 'github-upstream'`. URL uses the full immutable commit; visible commit may be shortened. Translate label names, never provenance values.

- [ ] **Step 5: Remove duplicate provenance module**

Move provenance styles to `styles.css`, remove its standalone JS/CSS includes, and ensure catalog is fetched once by primary application state.

- [ ] **Step 6: Run tests and manual locale smoke**

```bash
node tools/generate-catalog.mjs
node tests/verify.mjs
```

Then serve statically and verify EN/SL changes chrome only, deep links still resolve, and prompt metadata never changes language.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html styles.css tests/verify.mjs
git rm verified-provenance.js verified-provenance.css
git commit -m "feat: limit translation to WebUI chrome"
```

---

### Task 6: CI and Pages generation pipeline

**Files:** Modify `.github/workflows/verify.yml`, `.github/workflows/pages.yml`, `tests/verify.mjs`.

- [ ] **Step 1: Add workflow-order tests first**

Assert both workflows call `node tools/generate-catalog.mjs`. For Pages assert:

```js
const verifyIndex = pagesWorkflow.indexOf('node tools/verify-imported-skills.mjs');
const generateIndex = pagesWorkflow.indexOf('node tools/generate-catalog.mjs');
const uploadIndex = pagesWorkflow.indexOf('actions/upload-pages-artifact');
assert.ok(verifyIndex >= 0 && verifyIndex < generateIndex && generateIndex < uploadIndex);
```

Also require static verification after generation.

- [ ] **Step 2: Update verification workflow**

Use this order: item-schema tests, integrity tests, importer tests, imported-skill verifier tests, production network verifier, catalog-builder tests, catalog generation, static verification.

- [ ] **Step 3: Update Pages workflow**

Use: checkout → configure Pages → exact-upstream network verification → generate catalog → static verification → upload Pages artifact → deploy → existing smoke test.

- [ ] **Step 4: Run local publication-equivalent sequence**

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

Expected: all succeed; production verifier reports zero imported skills on current state.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/verify.yml .github/workflows/pages.yml tests/verify.mjs
git commit -m "ci: generate catalog from canonical metadata"
```

---

### Task 7: Remove manual catalog authority

**Files:** Remove tracked `catalog.json`; create/modify `.gitignore`; strengthen `tests/catalog-builder.mjs`.

- [ ] **Step 1: Ensure structural deletion regression exists**

The builder test must delete an item folder, regenerate, and prove the deleted route is absent with no other edit.

- [ ] **Step 2: Ignore generated catalog**

Add exactly:

```gitignore
catalog.json
```

- [ ] **Step 3: Remove tracked manual catalog and prove clean regeneration**

```bash
git rm catalog.json
rm -f catalog.json
node tools/generate-catalog.mjs
test -f catalog.json
node tests/verify.mjs
rm -f catalog.json
git status --short
```

Expected: generated catalog is absent from Git status because it is ignored.

- [ ] **Step 4: Commit**

```bash
git add .gitignore tests/catalog-builder.mjs
git commit -m "refactor: make catalog a generated artifact"
```

The staged deletion of `catalog.json` must be included in the same commit.

---

### Task 8: Documentation and policy cutover

**Files:** Modify `AGENTS.md`, `README.md`, `FUTURE_RELEASES.md`.

- [ ] **Step 1: Update `AGENTS.md`**

Keep `NEVER author or modify an imported SKILL.md`. Replace `agent-shelf.json` rules with canonical `item.json`; state catalog is generated; trust labels are derived; only WebUI chrome is translated; folder deletion removes items after regeneration; full-SHA importer/verifier rules remain mandatory.

- [ ] **Step 2: Update `README.md`**

Document canonical structure:

```text
skills/<category>/<slug>/SKILL.md + item.json
prompts/<category>/<slug>/PROMPT.md + item.json
```

Document local preview requirement:

```bash
node tools/generate-catalog.mjs
```

State that `catalog.json` is generated and ignored by Git.

- [ ] **Step 3: Update roadmap status**

Mark Release A implemented only after all tests pass. Do not rewrite Release B–F scope.

- [ ] **Step 4: Run verification and commit**

```bash
node tools/generate-catalog.mjs
node tests/verify.mjs
git add AGENTS.md README.md FUTURE_RELEASES.md
git commit -m "docs: document canonical Agent Shelf model"
```

---

### Task 9: Final verification and PR gate

**Files:** Review all Release A changes; no new production files expected.

- [ ] **Step 1: Start without generated catalog**

```bash
rm -f catalog.json
```

- [ ] **Step 2: Run the complete suite in publication order**

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

Expected: every command exits 0; generated catalog has four prompts and zero skills; no translated item metadata exists.

- [ ] **Step 3: Scan for obsolete live assumptions**

```bash
git grep -n "agent-shelf.json" -- ':!docs/superpowers/**' || true
git grep -n "title_sl\|description_sl\|tags_sl" -- ':!docs/superpowers/**' || true
git grep -n 'verification.*exact-upstream' -- ':!docs/superpowers/**' || true
```

Expected: no live code/config/current docs depend on legacy metadata, translated item fields, or authored exact-upstream trust. Historical Superpowers docs may mention the old architecture.

- [ ] **Step 4: Review the security-critical diff**

```bash
git diff main...HEAD -- .gitattributes lib/skill-integrity.mjs tools/import-skill.mjs tools/verify-imported-skills.mjs .github/workflows/pages.yml
```

Confirm `.gitattributes` remains unchanged, exact bytes are still written directly, `Buffer.equals` verification remains, full SHA validation remains, and Pages verification still precedes artifact upload.

- [ ] **Step 5: Open the implementation PR**

PR summary:

```text
Release A: canonical item model

- adds per-item item.json provenance/integrity metadata
- preserves exact-upstream byte verification
- generates catalog.json from filesystem state
- removes translated item metadata
- limits EN/SL switching to WebUI chrome
- makes folder deletion remove catalog entries on regeneration
```

Do not merge until CI is green.

## Self-Review Result

Every Release A design requirement maps to a task above: canonical metadata, origin/provenance schema, exact-upstream preservation, local hashes, deterministic catalog generation, structural deletion semantics, translation boundary, provenance UI consolidation, CI/Pages ordering, and repository documentation. No unresolved placeholders or Release B–F implementation work remain in this plan.

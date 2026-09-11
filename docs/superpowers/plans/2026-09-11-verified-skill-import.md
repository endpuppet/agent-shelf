# Verified Skill Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Agent Shelf's editable skill copies with a commit-pinned, byte-for-byte verified import system and remove every currently untrusted skill before any new skill is admitted.

**Architecture:** Imported skills are immutable blobs paired with separate provenance metadata. A shared integrity module validates metadata, hashes bytes, and compares local content with commit-pinned upstream content; both CI and the Pages deployment invoke the production verifier so modified skills cannot be published. UI metadata remains editable and bilingual, but `SKILL.md` bytes are never transformed.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 22+, GitHub Actions, GitHub raw content URLs, Node `crypto` SHA-256, Node built-in `fetch`.

**Spec:** `docs/superpowers/specs/2026-09-11-verified-skill-import-design.md`

## Global Constraints

- Verified imports support public GitHub repositories only in v1.
- Every source revision must be a full 40-character Git commit SHA.
- Imported `SKILL.md` must be byte-for-byte identical to the recorded upstream file.
- No rewriting, summarizing, translating, frontmatter injection, normalization, or experiment-specific adaptation is permitted in imported `SKILL.md`.
- Prompt content remains outside this integrity contract.
- A failed integrity check must block the Pages deployment.
- The cleanup state with zero skills is valid.

---

### Task 1: Remove the untrusted skill inventory

**Files:**
- Delete: every existing `skills/**/SKILL.md`
- Modify: `catalog.json`
- Modify: `tests/verify.mjs`

**Interfaces:**
- Consumes: current catalog schema.
- Produces: a prompt-only catalog and a valid zero-skill state for later integrity tooling.

- [ ] **Step 1: Add a failing cleanup assertion**

Extend `tests/verify.mjs` with assertions that the catalog contains zero `type === "skill"` entries and that no `skills/**/SKILL.md` files exist after cleanup.

- [ ] **Step 2: Run the verification workflow and confirm RED**

Run: `node tests/verify.mjs`

Expected: FAIL because current skills and skill catalog entries still exist.

- [ ] **Step 3: Remove current skill files and catalog skill entries**

Delete all existing `SKILL.md` files under `skills/`. Preserve every prompt entry and prompt file exactly as-is. Update the catalog version/update timestamp without altering prompt content.

- [ ] **Step 4: Run the verification test and confirm GREEN**

Run: `node tests/verify.mjs`

Expected: PASS with zero skills and all prompts intact.

- [ ] **Step 5: Commit**

Commit message: `Remove unverified skill copies`

---

### Task 2: Add byte-identity primitives with mutation tests

**Files:**
- Create: `lib/skill-integrity.mjs`
- Create: `tests/skill-integrity.mjs`

**Interfaces:**
- Produces:
  - `sha256(bytes: Uint8Array | Buffer): string`
  - `validateMetadata(metadata: object): void`
  - `rawGitHubUrl(metadata: object): string`
  - `verifyByteIdentity(localBytes, upstreamBytes, metadata): void`

- [ ] **Step 1: Write failing tests for the integrity contract**

`tests/skill-integrity.mjs` must cover:

```js
const original = Buffer.from([0x23,0x20,0x53,0x4b,0x49,0x4c,0x4c,0x0d,0x0a]);
const mutated = Buffer.from([0x23,0x20,0x53,0x4b,0x49,0x4c,0x4c,0x0a]);
```

Assert that exact bytes pass and that the CRLF-to-LF mutation fails. Also assert failures for wrong hash, wrong byte count, shortened commit SHA, branch name `main`, repository strings outside `owner/repo`, and source paths containing `..`.

- [ ] **Step 2: Run and confirm RED**

Run: `node tests/skill-integrity.mjs`

Expected: FAIL because `lib/skill-integrity.mjs` does not exist.

- [ ] **Step 3: Implement the minimal integrity module**

Use `node:crypto` `createHash('sha256')`. `validateMetadata` must require:

```js
metadata.schema_version === 1
metadata.kind === 'verified-upstream-skill'
/^[^/\s]+\/[^/\s]+$/.test(metadata.source.repository)
/^[0-9a-f]{40}$/i.test(metadata.source.commit)
metadata.source.path.length > 0
!metadata.source.path.startsWith('/')
!metadata.source.path.split('/').includes('..')
/^[0-9a-f]{64}$/.test(metadata.integrity.sha256)
Number.isInteger(metadata.integrity.bytes) && metadata.integrity.bytes >= 0
```

`rawGitHubUrl` must return:

```text
https://raw.githubusercontent.com/<owner>/<repo>/<40-char-commit>/<encoded-path>
```

`verifyByteIdentity` must compare byte length, local SHA-256, upstream SHA-256, and `Buffer.equals`.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node tests/skill-integrity.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Add skill byte integrity primitives`

---

### Task 3: Add the only supported skill importer

**Files:**
- Create: `tools/import-skill.mjs`
- Create: `tests/import-skill.mjs`

**Interfaces:**
- Consumes CLI flags: `--repo`, `--commit`, `--path`, `--category`, `--slug`.
- Produces exact bytes at `skills/<category>/<slug>/SKILL.md` and provenance at `skills/<category>/<slug>/agent-shelf.json`.

- [ ] **Step 1: Write failing importer tests**

The test must run the importer's pure argument/path helpers and assert rejection of:

```text
--commit main
--commit abc123
--path ../SKILL.md
--category ../escape
--slug ../escape
```

It must also test a fixture fetch returning a `Buffer` with CRLF and assert the written `SKILL.md` bytes are exactly equal to the fixture bytes.

- [ ] **Step 2: Run and confirm RED**

Run: `node tests/import-skill.mjs`

Expected: FAIL because importer helpers do not exist.

- [ ] **Step 3: Implement importer without text transformations**

The importer must:

1. validate all identifiers;
2. construct the commit-pinned raw URL using `rawGitHubUrl` logic;
3. call `fetch` and read `arrayBuffer()`;
4. convert directly to `Buffer`;
5. create destination directory only after a successful fetch;
6. refuse an existing destination directory;
7. write `SKILL.md` using the exact `Buffer`;
8. compute hash and byte length from that same `Buffer`;
9. write only `agent-shelf.json` as generated metadata.

No decode/re-encode step may touch the skill bytes.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node tests/import-skill.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Add exact upstream skill importer`

---

### Task 4: Add production verification of every imported skill

**Files:**
- Create: `tools/verify-imported-skills.mjs`
- Create: `tests/verify-imported-skills.mjs`

**Interfaces:**
- Consumes: `skills/**/agent-shelf.json`, sibling `SKILL.md`, `catalog.json`.
- Produces: exit code 0 only when every imported skill is exact and provenance-complete.

- [ ] **Step 1: Write failing verifier tests**

Use temporary fixture directories and injected fetch behavior to prove:

- zero skills returns success;
- metadata without sibling `SKILL.md` fails;
- local one-byte mutation fails;
- upstream one-byte mutation fails;
- catalog skill path mismatch fails;
- a catalog skill lacking `verification: "exact-upstream"` fails;
- matching local/upstream bytes and metadata pass.

- [ ] **Step 2: Run and confirm RED**

Run: `node tests/verify-imported-skills.mjs`

Expected: FAIL because production verifier does not exist.

- [ ] **Step 3: Implement verifier**

The production verifier must recursively find `agent-shelf.json`, validate each metadata file through `lib/skill-integrity.mjs`, read local bytes as `Buffer`, fetch commit-pinned upstream bytes, call `verifyByteIdentity`, and cross-check any matching `catalog.json` skill entry.

If `skills/` does not exist or contains no metadata files, print:

```text
Verified 0 imported skills.
```

and exit 0.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node tests/verify-imported-skills.mjs && node tools/verify-imported-skills.mjs`

Expected: PASS; production verifier reports zero imported skills.

- [ ] **Step 5: Commit**

Commit message: `Verify imported skills against pinned upstream bytes`

---

### Task 5: Make verification a publication gate

**Files:**
- Create or Modify: `.gitattributes`
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/verify.mjs`

**Interfaces:**
- Consumes: production verifier from Task 4.
- Produces: a Pages pipeline that cannot upload an artifact when skill integrity fails.

- [ ] **Step 1: Add failing workflow assertions**

`tests/verify.mjs` must require:

```gitattributes
skills/**/SKILL.md -text
```

and must verify that both workflows invoke:

```bash
node tools/verify-imported-skills.mjs
```

For `pages.yml`, the verifier step must appear textually before `actions/upload-pages-artifact`.

- [ ] **Step 2: Run and confirm RED**

Run: `node tests/verify.mjs`

Expected: FAIL because the publication gate and `.gitattributes` are not yet present.

- [ ] **Step 3: Add line-ending and workflow protections**

Add `.gitattributes` with `skills/**/SKILL.md -text`. Add Node verification before artifact upload in `pages.yml`. Add the same verifier to the normal verification workflow after unit tests.

- [ ] **Step 4: Run and confirm GREEN**

Run:

```bash
node tests/verify.mjs
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
node tools/verify-imported-skills.mjs
```

Expected: all pass.

- [ ] **Step 5: Commit**

Commit message: `Block publication of modified upstream skills`

---

### Task 6: Make provenance visible without touching source content

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `tests/verify.mjs`

**Interfaces:**
- Consumes future catalog fields:
  - `verification: "exact-upstream"`
  - `source_repository`
  - `source_path`
  - `source_commit`
  - `sha256`
- Produces a visible trust badge and pinned-source metadata for verified skill entries.

- [ ] **Step 1: Add failing UI assertions**

Require the app to contain the literal label `EXACT UPSTREAM`, a pinned-source link constructor using the full commit SHA, and detail fields for repository/commit/hash that are hidden for prompts or non-verified items.

- [ ] **Step 2: Run and confirm RED**

Run: `node tests/verify.mjs`

Expected: FAIL because provenance UI is absent.

- [ ] **Step 3: Implement provenance UI**

For `verification === 'exact-upstream'`, render:

```text
VERIFIED · EXACT UPSTREAM
owner/repo · <first 7 chars of commit>
sha256:<first 12 chars>…
```

The source link must be:

```text
https://github.com/<owner>/<repo>/blob/<full-commit>/<source-path>
```

`Copy content` continues copying the loaded `SKILL.md` content. Do not translate or alter source content when the language switch changes.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node tests/verify.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Show verified upstream provenance in Agent Shelf`

---

### Task 7: Lock the rules into agent documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `tests/verify.mjs`

**Interfaces:**
- Produces: repository-level instructions that forbid hand-authored imported skills and document the import/verification workflow.

- [ ] **Step 1: Add failing documentation assertions**

Require `AGENTS.md` to contain all of these exact concepts:

```text
NEVER author or modify an imported SKILL.md
byte-for-byte
full 40-character commit SHA
node tools/import-skill.mjs
node tools/verify-imported-skills.mjs
```

- [ ] **Step 2: Run and confirm RED**

Run: `node tests/verify.mjs`

Expected: FAIL until documentation is updated.

- [ ] **Step 3: Update documentation**

Document the verified import command, metadata separation, publication gate, and the rule that adaptations belong outside `skills/`.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node tests/verify.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Document immutable skill import policy`

---

### Task 8: Final end-to-end verification and deployment

**Files:**
- No new production files.

**Interfaces:**
- Consumes all prior tasks.
- Produces: a deployed prompt-only shelf whose future skill imports are guarded by exact upstream verification.

- [ ] **Step 1: Run the complete local/static suite**

Run:

```bash
node tests/verify.mjs
node tests/skill-integrity.mjs
node tests/import-skill.mjs
node tests/verify-imported-skills.mjs
node tools/verify-imported-skills.mjs
```

Expected: all commands exit 0 and production verifier reports `Verified 0 imported skills.`

- [ ] **Step 2: Verify catalog state**

Confirm `catalog.json` contains every existing prompt and zero skills.

- [ ] **Step 3: Verify GitHub Actions**

Confirm the latest `Verify Agent Shelf` workflow passes and the Pages deployment passes its integrity gate before upload.

- [ ] **Step 4: Verify the published site**

Open the live Pages deployment and confirm the Skills tab contains no imported skills while Prompts remain browsable.

- [ ] **Step 5: Stop before importing a real skill**

Do not add any upstream skill in this implementation. The first real import is a separate, auditable test after the safety system itself is green.

## Self-review

- Spec coverage: cleanup, immutable source bytes, provenance metadata, pinned commits, SHA-256, byte count, line-ending safety, importer, production verification, CI gate, Pages gate, UI trust badge, documentation, and zero-skill state are all covered.
- Placeholder scan: no TBD/TODO/"implement later" steps remain.
- Interface consistency: all later tasks consume the same `agent-shelf.json` schema and `lib/skill-integrity.mjs` function names defined in Task 2.

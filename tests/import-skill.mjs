import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateImportOptions, importSkill } from '../tools/import-skill.mjs';

const base = {
  repo: 'owner/repo',
  commit: '0123456789abcdef0123456789abcdef01234567',
  path: 'path/to/SKILL.md',
  category: 'frontend',
  slug: 'example-skill'
};

for (const commit of ['main', 'abc123']) {
  assert.throws(() => validateImportOptions({...base, commit}), /40-character commit/i);
}
assert.throws(() => validateImportOptions({...base, path: '../SKILL.md'}), /path/i);
assert.throws(() => validateImportOptions({...base, category: '../escape'}), /category/i);
assert.throws(() => validateImportOptions({...base, slug: '../escape'}), /slug/i);

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-import-'));
const fixture = Buffer.from('# Skill\r\n\r\nExact upstream bytes.\r\n', 'utf8');
const fetchImpl = async () => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength)
});
const result = await importSkill({
  ...base,
  title: 'Example Skill',
  description: 'Exact fixture.',
  tags: 'frontend,testing',
  rootDir,
  fetchImpl,
  now: () => new Date('2026-09-11T13:00:00.000Z')
});
const written = fs.readFileSync(path.join(rootDir, 'skills/frontend/example-skill/SKILL.md'));
assert.ok(written.equals(fixture), 'Importer must preserve exact CRLF bytes.');
const item = JSON.parse(fs.readFileSync(path.join(rootDir, 'skills/frontend/example-skill/item.json'), 'utf8'));
assert.equal(item.schema_version, 1);
assert.equal(item.type, 'skill');
assert.equal(item.category, 'frontend');
assert.equal(item.slug, 'example-skill');
assert.equal(item.title, 'Example Skill');
assert.deepEqual(item.tags, ['frontend', 'testing']);
assert.equal(item.origin.type, 'github-upstream');
assert.equal(item.origin.repository, base.repo);
assert.equal(item.origin.path, base.path);
assert.equal(item.origin.commit, base.commit);
assert.equal(item.integrity.mode, 'exact-upstream');
assert.equal(item.integrity.bytes, fixture.length);
assert.equal(item.tracking.imported_at, '2026-09-11T13:00:00.000Z');
assert.equal(result.skillPath, 'skills/frontend/example-skill/SKILL.md');
assert.equal(result.metadataPath, 'skills/frontend/example-skill/item.json');

const fallbackRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-import-title-'));
const fallback = await importSkill({...base, rootDir:fallbackRoot, fetchImpl, now: () => new Date('2026-09-11T13:00:00.000Z')});
assert.equal(fallback.item.title, 'Example Skill');

await assert.rejects(() => importSkill({...base, rootDir, fetchImpl}), /already exists/i);

console.log('Skill importer tests passed.');

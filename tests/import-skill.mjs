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
assert.throws(() => validateImportOptions({...base, path: '../SKILL.md'}), /source path/i);
assert.throws(() => validateImportOptions({...base, category: '../escape'}), /category/i);
assert.throws(() => validateImportOptions({...base, slug: '../escape'}), /slug/i);

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-import-'));
const fixture = Buffer.from('# Skill\r\n\r\nExact upstream bytes.\r\n', 'utf8');
const fetchImpl = async () => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength)
});
const result = await importSkill({...base, rootDir, fetchImpl, now: () => new Date('2026-09-11T13:00:00.000Z')});
const written = fs.readFileSync(path.join(rootDir, 'skills/frontend/example-skill/SKILL.md'));
assert.ok(written.equals(fixture), 'Importer must preserve exact CRLF bytes.');
const metadata = JSON.parse(fs.readFileSync(path.join(rootDir, 'skills/frontend/example-skill/agent-shelf.json'), 'utf8'));
assert.equal(metadata.integrity.bytes, fixture.length);
assert.equal(metadata.source.commit, base.commit);
assert.equal(metadata.imported_at, '2026-09-11T13:00:00.000Z');
assert.equal(result.skillPath, 'skills/frontend/example-skill/SKILL.md');

await assert.rejects(() => importSkill({...base, rootDir, fetchImpl}), /already exists/i);

console.log('Skill importer tests passed.');

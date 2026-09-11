import assert from 'node:assert/strict';
import { sha256, rawGitHubUrl, verifyByteIdentity } from '../lib/skill-integrity.mjs';

const original = Buffer.from([0x23,0x20,0x53,0x4b,0x49,0x4c,0x4c,0x0d,0x0a]);
const mutated = Buffer.from([0x23,0x20,0x53,0x4b,0x49,0x4c,0x4c,0x0a]);

const item = {
  schema_version: 1,
  id: 'skill-example',
  type: 'skill',
  category: 'frontend',
  slug: 'example',
  title: 'Example Skill',
  description: 'Fixture.',
  tags: [],
  origin: {
    type: 'github-upstream',
    repository: 'owner/repo',
    path: 'skills/example/SKILL.md',
    commit: '0123456789abcdef0123456789abcdef01234567'
  },
  integrity: { mode: 'exact-upstream', sha256: sha256(original), bytes: original.length },
  tracking: { imported_at: '2026-09-11T13:00:00.000Z' }
};

assert.equal(rawGitHubUrl(item), 'https://raw.githubusercontent.com/owner/repo/0123456789abcdef0123456789abcdef01234567/skills/example/SKILL.md');
assert.doesNotThrow(() => verifyByteIdentity(original, original, item));
assert.throws(() => verifyByteIdentity(mutated, original, item), /byte length|hash|byte identity/i);
assert.throws(() => verifyByteIdentity(original, mutated, item), /byte length|hash|byte identity/i);

const clone = () => structuredClone(item);
{
  const m = clone(); m.integrity.sha256 = '0'.repeat(64);
  assert.throws(() => verifyByteIdentity(original, original, m), /hash/i);
}
{
  const m = clone(); m.integrity.bytes += 1;
  assert.throws(() => verifyByteIdentity(original, original, m), /byte length/i);
}
for (const badCommit of ['abc123', 'main']) {
  const m = clone(); m.origin.commit = badCommit;
  assert.throws(() => rawGitHubUrl(m), /40-character commit/i);
}
for (const badRepo of ['repo', 'owner/repo/extra', 'owner /repo', '/repo']) {
  const m = clone(); m.origin.repository = badRepo;
  assert.throws(() => rawGitHubUrl(m), /owner\/repo/i);
}
for (const badPath of ['../SKILL.md', 'a/../SKILL.md', '/SKILL.md', '']) {
  const m = clone(); m.origin.path = badPath;
  assert.throws(() => rawGitHubUrl(m), /path/i);
}

console.log('Skill integrity unit tests passed.');

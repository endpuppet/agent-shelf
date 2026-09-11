import assert from 'node:assert/strict';
import { sha256, validateMetadata, rawGitHubUrl, verifyByteIdentity } from '../lib/skill-integrity.mjs';

const original = Buffer.from([0x23,0x20,0x53,0x4b,0x49,0x4c,0x4c,0x0d,0x0a]);
const mutated = Buffer.from([0x23,0x20,0x53,0x4b,0x49,0x4c,0x4c,0x0a]);

const metadata = {
  schema_version: 1,
  kind: 'verified-upstream-skill',
  source: {
    repository: 'owner/repo',
    path: 'skills/example/SKILL.md',
    commit: '0123456789abcdef0123456789abcdef01234567'
  },
  integrity: { sha256: sha256(original), bytes: original.length },
  imported_at: '2026-09-11T13:00:00.000Z'
};

assert.doesNotThrow(() => validateMetadata(metadata));
assert.equal(rawGitHubUrl(metadata), 'https://raw.githubusercontent.com/owner/repo/0123456789abcdef0123456789abcdef01234567/skills/example/SKILL.md');
assert.doesNotThrow(() => verifyByteIdentity(original, original, metadata));
assert.throws(() => verifyByteIdentity(mutated, original, metadata), /byte length|hash|byte identity/i);
assert.throws(() => verifyByteIdentity(original, mutated, metadata), /byte length|hash|byte identity/i);

const clone = () => structuredClone(metadata);
{
  const m = clone(); m.integrity.sha256 = '0'.repeat(64);
  assert.throws(() => verifyByteIdentity(original, original, m), /hash/i);
}
{
  const m = clone(); m.integrity.bytes += 1;
  assert.throws(() => verifyByteIdentity(original, original, m), /byte length/i);
}
for (const badCommit of ['abc123', 'main']) {
  const m = clone(); m.source.commit = badCommit;
  assert.throws(() => validateMetadata(m), /40-character commit/i);
}
for (const badRepo of ['repo', 'owner/repo/extra', 'owner /repo', '/repo']) {
  const m = clone(); m.source.repository = badRepo;
  assert.throws(() => validateMetadata(m), /owner\/repo/i);
}
for (const badPath of ['../SKILL.md', 'a/../SKILL.md', '/SKILL.md', '']) {
  const m = clone(); m.source.path = badPath;
  assert.throws(() => validateMetadata(m), /source path/i);
}

console.log('Skill integrity unit tests passed.');

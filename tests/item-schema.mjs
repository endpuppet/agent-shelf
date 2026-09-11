import assert from 'node:assert/strict';
import { validateItem, deriveTrustCode, contentFilename, isSafeRelativePath } from '../lib/item-schema.mjs';

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
assert.equal(isSafeRelativePath('path/to/SKILL.md'), true);
assert.equal(isSafeRelativePath('../SKILL.md'), false);
assert.equal(isSafeRelativePath('/SKILL.md'), false);

const owned = structuredClone(upstream);
owned.id = 'skill-owned';
owned.slug = 'owned';
owned.origin = { type: 'github-owned', repository: 'endpuppet/other-repo', path: 'skills/owned/SKILL.md', commit: SHA40 };
owned.integrity = { mode: 'content-hash', sha256: HASH64, bytes: 123 };
assert.doesNotThrow(() => validateItem(owned));
assert.equal(deriveTrustCode(owned), 'own-repository');

const personal = structuredClone(upstream);
personal.id = 'skill-personal';
personal.slug = 'personal';
personal.origin = { type: 'personal', author: 'endpuppet' };
personal.integrity = { mode: 'content-hash', sha256: HASH64, bytes: 123 };
assert.doesNotThrow(() => validateItem(personal));
assert.equal(deriveTrustCode(personal), 'personal');

const derived = structuredClone(upstream);
derived.id = 'prompt-derived';
derived.type = 'prompt';
derived.category = 'research';
derived.slug = 'derived';
derived.origin = { type: 'derived', reference: 'owner/repo/path' };
derived.integrity = { mode: 'content-hash', sha256: HASH64, bytes: 123 };
assert.doesNotThrow(() => validateItem(derived));
assert.equal(deriveTrustCode(derived), 'derived');

const generated = structuredClone(upstream);
generated.id = 'skill-generated';
generated.slug = 'generated';
generated.origin = { type: 'generated', author: 'endpuppet', generator: 'ChatGPT' };
generated.integrity = { mode: 'content-hash', sha256: HASH64, bytes: 123 };
assert.doesNotThrow(() => validateItem(generated));
assert.equal(deriveTrustCode(generated), 'generated');

for (const badCommit of ['main', 'abc123']) {
  const item = structuredClone(upstream);
  item.origin.commit = badCommit;
  assert.throws(() => validateItem(item), /40-character/i);
}

for (const badPath of ['../SKILL.md', 'a/../SKILL.md', '/SKILL.md', '']) {
  const item = structuredClone(upstream);
  item.origin.path = badPath;
  assert.throws(() => validateItem(item), /path/i);
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
      ? { type: 'derived', reference: 'source' }
      : { type: 'generated', author: 'endpuppet' };
  assert.throws(() => validateItem(item), /exact-upstream|content-hash|incompatible/i);
}

{
  const item = structuredClone(upstream);
  item.type = 'prompt';
  assert.throws(() => validateItem(item), /skill|exact-upstream|github-upstream/i);
}

{
  const item = structuredClone(upstream);
  item.origin = { type: 'external-url', url: 'https://example.com/SKILL.md' };
  item.integrity = { mode: 'content-hash', sha256: HASH64, bytes: 123 };
  assert.throws(() => validateItem(item), /origin|unsupported/i);
}

assert.throws(() => validateItem(upstream, { expectedType: 'prompt' }), /type/i);
assert.throws(() => validateItem(upstream, { expectedCategory: 'other' }), /category/i);
assert.throws(() => validateItem(upstream, { expectedSlug: 'other' }), /slug/i);
assert.throws(() => validateItem({ ...upstream, tags: 'svg' }), /tags/i);
assert.throws(() => validateItem({ ...upstream, integrity: { ...upstream.integrity, sha256: 'ABC' } }), /sha-256|sha256/i);
assert.throws(() => validateItem({ ...upstream, integrity: { ...upstream.integrity, bytes: -1 } }), /byte/i);

console.log('Canonical item schema tests passed.');

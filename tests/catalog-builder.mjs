import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildCatalog, assertUniqueCatalogItems } from '../lib/catalog-builder.mjs';

const SHA40 = '0123456789abcdef0123456789abcdef01234567';

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function writePrompt(root, { category = 'research', slug, id = `prompt-${category}-${slug}`, title = slug, body = `# ${slug}\n`, itemOverrides = {} }) {
  const dir = path.join(root, 'prompts', category, slug);
  fs.mkdirSync(dir, { recursive: true });
  const bytes = Buffer.from(body, 'utf8');
  fs.writeFileSync(path.join(dir, 'PROMPT.md'), bytes);
  const item = {
    schema_version: 1,
    id,
    type: 'prompt',
    category,
    slug,
    title,
    description: '',
    tags: ['fixture'],
    origin: { type: 'derived', reference: 'fixture' },
    integrity: { mode: 'content-hash', sha256: hash(bytes), bytes: bytes.length },
    tracking: {},
    ...itemOverrides
  };
  fs.writeFileSync(path.join(dir, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);
  return { dir, item };
}

function writeUpstreamSkill(root, { category = 'frontend', slug = 'exact', body = '# Exact\r\n' } = {}) {
  const dir = path.join(root, 'skills', category, slug);
  fs.mkdirSync(dir, { recursive: true });
  const bytes = Buffer.from(body, 'utf8');
  fs.writeFileSync(path.join(dir, 'SKILL.md'), bytes);
  const item = {
    schema_version: 1,
    id: `skill-${category}-${slug}`,
    type: 'skill',
    category,
    slug,
    title: 'Exact Skill',
    description: '',
    tags: ['fixture'],
    origin: { type: 'github-upstream', repository: 'owner/repo', path: 'SKILL.md', commit: SHA40 },
    integrity: { mode: 'exact-upstream', sha256: hash(bytes), bytes: bytes.length },
    tracking: { imported_at: '2026-09-11T13:00:00.000Z' }
  };
  fs.writeFileSync(path.join(dir, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);
  return { dir, item };
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-catalog-basic-'));
  writePrompt(root, { slug: 'zeta', title: 'Zeta' });
  writePrompt(root, { slug: 'alpha', title: 'Alpha' });
  writeUpstreamSkill(root);

  const catalog = buildCatalog({ rootDir: root });
  assert.equal(catalog.version, 4);
  assert.deepEqual(catalog.items.map((item) => `${item.type}:${item.slug}`), [
    'prompt:alpha',
    'prompt:zeta',
    'skill:exact'
  ]);
  assert.equal(catalog.items[0].path, 'prompts/research/alpha/PROMPT.md');
  assert.equal(catalog.items[0].trust, 'derived');
  assert.equal(catalog.items[2].path, 'skills/frontend/exact/SKILL.md');
  assert.equal(catalog.items[2].trust, 'exact-upstream');
  assert.deepEqual(buildCatalog({ rootDir: root }), catalog, 'Repeated generation must be deterministic.');
  for (const item of catalog.items) {
    assert.equal('title_sl' in item, false);
    assert.equal('description_sl' in item, false);
    assert.equal('tags_sl' in item, false);
  }
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-catalog-delete-'));
  writePrompt(root, { slug: 'keep-me' });
  const removed = writePrompt(root, { slug: 'remove-me' });
  const before = buildCatalog({ rootDir: root });
  assert.deepEqual(before.items.map((item) => item.slug), ['keep-me', 'remove-me']);
  fs.rmSync(removed.dir, { recursive: true, force: true });
  const after = buildCatalog({ rootDir: root });
  assert.deepEqual(after.items.map((item) => item.slug), ['keep-me']);
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-catalog-hash-'));
  const { dir } = writePrompt(root, { slug: 'bad-hash' });
  const itemPath = path.join(dir, 'item.json');
  const item = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
  item.integrity.sha256 = '0'.repeat(64);
  fs.writeFileSync(itemPath, JSON.stringify(item));
  assert.throws(() => buildCatalog({ rootDir: root }), /hash|sha-256|integrity/i);
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-catalog-location-'));
  const { dir } = writePrompt(root, { slug: 'wrong-location' });
  const itemPath = path.join(dir, 'item.json');
  const item = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
  item.category = 'other';
  fs.writeFileSync(itemPath, JSON.stringify(item));
  assert.throws(() => buildCatalog({ rootDir: root }), /category.*mismatch/i);
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-catalog-duplicate-id-'));
  writePrompt(root, { slug: 'one', id: 'duplicate-id' });
  writePrompt(root, { slug: 'two', id: 'duplicate-id' });
  assert.throws(() => buildCatalog({ rootDir: root }), /duplicate.*id/i);
}

assert.throws(() => assertUniqueCatalogItems([
  { id: 'one', type: 'prompt', category: 'research', slug: 'same' },
  { id: 'two', type: 'prompt', category: 'research', slug: 'same' }
]), /duplicate.*route/i);

console.log('Catalog builder tests passed.');

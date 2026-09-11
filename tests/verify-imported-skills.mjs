import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from '../lib/skill-integrity.mjs';
import { verifyImportedSkills } from '../tools/verify-imported-skills.mjs';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const OTHER_COMMIT = 'f'.repeat(40);
const original = Buffer.from('# Exact Skill\r\nBody\r\n', 'utf8');
const upstreamMutated = Buffer.from('# Exact Skill\nBody\n', 'utf8');
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

function makeRoot({skillBytes = original, item = itemFor(), writeSkill = true, writeItem = true} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-verify-'));
  const dir = path.join(root, 'skills/frontend/exact-skill');
  fs.mkdirSync(dir, {recursive:true});
  if (writeItem) fs.writeFileSync(path.join(dir, 'item.json'), JSON.stringify(item));
  if (writeSkill) fs.writeFileSync(path.join(dir, 'SKILL.md'), skillBytes);
  return root;
}

const responseFor = (bytes) => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
});
const fetchBytes = (bytes) => async () => responseFor(bytes);
const fetchByCommit = async (url) => responseFor(url.includes(OTHER_COMMIT) ? upstreamMutated : original);

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-zero-'));
  const logs=[];
  assert.equal(await verifyImportedSkills({rootDir:root, fetchImpl:fetchBytes(original), log:(m)=>logs.push(m)}), 0);
  assert.deepEqual(logs, ['Verified 0 imported skills.']);
}

await assert.rejects(() => verifyImportedSkills({rootDir:makeRoot({writeSkill:false}), fetchImpl:fetchBytes(original)}), /missing sibling SKILL\.md/i);
await assert.rejects(() => verifyImportedSkills({rootDir:makeRoot({writeItem:false}), fetchImpl:fetchBytes(original)}), /orphan|item\.json/i);
await assert.rejects(() => verifyImportedSkills({rootDir:makeRoot({skillBytes:Buffer.from('# Changed\n')}), fetchImpl:fetchBytes(original)}), /byte length|hash|identity/i);
await assert.rejects(() => verifyImportedSkills({rootDir:makeRoot(), fetchImpl:fetchBytes(upstreamMutated)}), /byte length|hash|identity/i);

{
  const item = itemFor();
  item.origin.commit = OTHER_COMMIT;
  await assert.rejects(() => verifyImportedSkills({rootDir:makeRoot({item}), fetchImpl:fetchByCommit}), /upstream|hash|identity|byte length/i);
}

assert.equal(await verifyImportedSkills({rootDir:makeRoot(), fetchImpl:fetchBytes(original), log:()=>{}}), 1);

console.log('Imported skill verifier tests passed.');

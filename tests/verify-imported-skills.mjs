import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from '../lib/skill-integrity.mjs';
import { verifyImportedSkills } from '../tools/verify-imported-skills.mjs';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const original = Buffer.from('# Exact Skill\r\nBody\r\n', 'utf8');
const upstreamMutated = Buffer.from('# Exact Skill\nBody\n', 'utf8');
const metadataFor = (bytes = original) => ({
  schema_version: 1,
  kind: 'verified-upstream-skill',
  source: { repository: 'owner/repo', path: 'SKILL.md', commit: COMMIT },
  integrity: { sha256: sha256(bytes), bytes: bytes.length },
  imported_at: '2026-09-11T13:00:00.000Z'
});

function makeRoot({skillBytes = original, metadata = metadataFor(), catalogItems = [], writeSkill = true} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-verify-'));
  fs.writeFileSync(path.join(root, 'catalog.json'), JSON.stringify({version:1, items:catalogItems}));
  const dir = path.join(root, 'skills/frontend/exact-skill');
  fs.mkdirSync(dir, {recursive:true});
  fs.writeFileSync(path.join(dir, 'agent-shelf.json'), JSON.stringify(metadata));
  if (writeSkill) fs.writeFileSync(path.join(dir, 'SKILL.md'), skillBytes);
  return root;
}

const fetchBytes = (bytes) => async () => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
});

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shelf-zero-'));
  fs.writeFileSync(path.join(root, 'catalog.json'), JSON.stringify({version:1, items:[]}));
  const logs=[];
  assert.equal(await verifyImportedSkills({rootDir:root, fetchImpl:fetchBytes(original), log:(m)=>logs.push(m)}), 0);
  assert.deepEqual(logs, ['Verified 0 imported skills.']);
}

await assert.rejects(() => verifyImportedSkills({rootDir:makeRoot({writeSkill:false}), fetchImpl:fetchBytes(original)}), /missing sibling SKILL\.md/i);
await assert.rejects(() => verifyImportedSkills({rootDir:makeRoot({skillBytes:Buffer.from('# Changed\n')}), fetchImpl:fetchBytes(original)}), /byte length|hash|identity/i);
await assert.rejects(() => verifyImportedSkills({rootDir:makeRoot(), fetchImpl:fetchBytes(upstreamMutated)}), /byte length|hash|identity/i);

const goodCatalog = {
  id:'skill-frontend-exact-skill', type:'skill', category:'frontend', slug:'exact-skill',
  title:'Exact Skill', title_sl:'Točna veščina', description:'Exact', description_sl:'Točno', tags:[], tags_sl:[],
  path:'skills/frontend/exact-skill/SKILL.md', verification:'exact-upstream',
  source_repository:'owner/repo', source_path:'SKILL.md', source_commit:COMMIT, sha256:sha256(original)
};
await assert.rejects(() => verifyImportedSkills({
  rootDir:makeRoot({catalogItems:[{...goodCatalog, path:'skills/frontend/exact-skill/OTHER.md'}]}),
  fetchImpl:fetchBytes(original)
}), /catalog path mismatch/i);
await assert.rejects(() => verifyImportedSkills({
  rootDir:makeRoot({catalogItems:[{...goodCatalog, verification:'something-else'}]}),
  fetchImpl:fetchBytes(original)
}), /exact-upstream/i);

await assert.rejects(() => verifyImportedSkills({
  rootDir:makeRoot({catalogItems:[{...goodCatalog, source_commit:'f'.repeat(40)}]}),
  fetchImpl:fetchBytes(original)
}), /provenance mismatch/i);

assert.equal(await verifyImportedSkills({rootDir:makeRoot({catalogItems:[goodCatalog]}), fetchImpl:fetchBytes(original), log:()=>{}}), 1);

console.log('Imported skill verifier tests passed.');

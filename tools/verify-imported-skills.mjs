import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rawGitHubUrl, validateMetadata, verifyByteIdentity } from '../lib/skill-integrity.mjs';

function findMetadataFiles(root) {
  if (!fs.existsSync(root)) return [];
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === 'agent-shelf.json') found.push(full);
    }
  };
  walk(root);
  return found.sort();
}

function posixRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

export async function verifyImportedSkills({rootDir = process.cwd(), fetchImpl = fetch, log = console.log} = {}) {
  const catalogPath = path.join(rootDir, 'catalog.json');
  const catalog = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : {items:[]};
  const catalogSkills = (catalog.items || []).filter((item) => item.type === 'skill');
  const metadataFiles = findMetadataFiles(path.join(rootDir, 'skills'));

  const metadataBySkillPath = new Map();

  for (const metadataPath of metadataFiles) {
    const relMeta = posixRelative(rootDir, metadataPath);
    const parts = relMeta.split('/');
    if (parts.length !== 4 || parts[0] !== 'skills' || parts[3] !== 'agent-shelf.json') {
      throw new Error(`Invalid verified skill layout: ${relMeta}`);
    }
    const [, category, slug] = parts;
    const skillPath = path.join(path.dirname(metadataPath), 'SKILL.md');
    const relSkill = `skills/${category}/${slug}/SKILL.md`;
    if (!fs.existsSync(skillPath)) throw new Error(`${relMeta}: missing sibling SKILL.md.`);

    let metadata;
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      validateMetadata(metadata);
    } catch (error) {
      throw new Error(`${relMeta}: invalid metadata: ${error.message}`);
    }

    const response = await fetchImpl(rawGitHubUrl(metadata));
    if (!response?.ok) throw new Error(`${relMeta}: upstream fetch failed with HTTP ${response?.status ?? 'unknown'}.`);
    const localBytes = fs.readFileSync(skillPath);
    const upstreamBytes = Buffer.from(await response.arrayBuffer());
    try {
      verifyByteIdentity(localBytes, upstreamBytes, metadata);
    } catch (error) {
      throw new Error(`${relSkill}: ${error.message}`);
    }

    const matches = catalogSkills.filter((item) => item.category === category && item.slug === slug);
    if (matches.length > 1) throw new Error(`${relSkill}: duplicate catalog skill entries.`);
    if (matches.length === 1) {
      const item = matches[0];
      if (item.path !== relSkill) throw new Error(`${relSkill}: catalog path mismatch (${item.path}).`);
      if (item.verification !== 'exact-upstream') throw new Error(`${relSkill}: catalog verification must be exact-upstream.`);
    }
    metadataBySkillPath.set(relSkill, metadata);
  }

  for (const item of catalogSkills) {
    if (item.verification !== 'exact-upstream') throw new Error(`${item.id || item.slug}: catalog verification must be exact-upstream.`);
    if (!metadataBySkillPath.has(item.path)) throw new Error(`${item.id || item.slug}: catalog skill has no verified agent-shelf.json for ${item.path}.`);
  }

  log(`Verified ${metadataFiles.length} imported skills.`);
  return metadataFiles.length;
}

async function main() {
  await verifyImportedSkills();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

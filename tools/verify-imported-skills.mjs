import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rawGitHubUrl, verifyByteIdentity } from '../lib/skill-integrity.mjs';
import { validateItem } from '../lib/item-schema.mjs';

function posixRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function findCanonicalSkillDirs(rootDir) {
  const skillsRoot = path.join(rootDir, 'skills');
  if (!fs.existsSync(skillsRoot)) return [];
  const dirs = new Set();

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile() || !['SKILL.md', 'item.json'].includes(entry.name)) continue;
      const rel = posixRelative(rootDir, full);
      const parts = rel.split('/');
      if (parts.length !== 4 || parts[0] !== 'skills' || !['SKILL.md', 'item.json'].includes(parts[3])) {
        throw new Error(`Invalid skill layout: ${rel}`);
      }
      dirs.add(path.dirname(full));
    }
  };

  walk(skillsRoot);
  return [...dirs].sort();
}

export async function verifyImportedSkills({ rootDir = process.cwd(), fetchImpl = fetch, log = console.log } = {}) {
  const skillDirs = findCanonicalSkillDirs(rootDir);
  let verifiedCount = 0;

  for (const dir of skillDirs) {
    const relDir = posixRelative(rootDir, dir);
    const [, category, slug] = relDir.split('/');
    const skillPath = path.join(dir, 'SKILL.md');
    const itemPath = path.join(dir, 'item.json');
    const relSkill = `skills/${category}/${slug}/SKILL.md`;
    const relItem = `skills/${category}/${slug}/item.json`;

    const hasSkill = fs.existsSync(skillPath);
    const hasItem = fs.existsSync(itemPath);
    if (hasSkill && !hasItem) throw new Error(`${relSkill}: orphan SKILL.md is missing sibling item.json.`);
    if (hasItem && !hasSkill) throw new Error(`${relItem}: missing sibling SKILL.md.`);
    if (!hasSkill && !hasItem) continue;

    let item;
    try {
      item = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
      validateItem(item, { expectedType: 'skill', expectedCategory: category, expectedSlug: slug });
    } catch (error) {
      throw new Error(`${relItem}: invalid item metadata: ${error.message}`);
    }

    if (item.origin.type !== 'github-upstream') continue;
    if (item.integrity.mode !== 'exact-upstream') {
      throw new Error(`${relItem}: github-upstream skill must use exact-upstream integrity.`);
    }

    const response = await fetchImpl(rawGitHubUrl(item));
    if (!response?.ok) throw new Error(`${relItem}: upstream fetch failed with HTTP ${response?.status ?? 'unknown'}.`);
    const localBytes = fs.readFileSync(skillPath);
    const upstreamBytes = Buffer.from(await response.arrayBuffer());
    try {
      verifyByteIdentity(localBytes, upstreamBytes, item);
    } catch (error) {
      throw new Error(`${relSkill}: ${error.message}`);
    }
    verifiedCount += 1;
  }

  log(`Verified ${verifiedCount} imported skills.`);
  return verifiedCount;
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

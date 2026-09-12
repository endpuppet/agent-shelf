import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rawGitHubUrl, sha256 } from '../lib/skill-integrity.mjs';
import { validateItem } from '../lib/item-schema.mjs';

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function titleFromSlug(slug) {
  return slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function parseTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(value).split(',').map((tag) => tag.trim()).filter(Boolean);
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag?.startsWith('--') || value == null || value.startsWith('--')) throw new Error(`Invalid CLI arguments near ${flag || '<end>'}.`);
    out[flag.slice(2)] = value;
  }
  return out;
}

function provisionalItem(options, importedAt = new Date(0).toISOString()) {
  const { repo, commit, path: sourcePath, category, slug } = options;
  return {
    schema_version: 1,
    id: `skill-${category}-${slug}`,
    type: 'skill',
    category,
    slug,
    title: options.title?.trim() || titleFromSlug(slug),
    description: options.description ?? '',
    tags: parseTags(options.tags),
    origin: { type: 'github-upstream', repository: repo, path: sourcePath, commit },
    integrity: { mode: 'exact-upstream', sha256: '0'.repeat(64), bytes: 0 },
    tracking: { imported_at: importedAt }
  };
}

export function validateImportOptions(options) {
  const { category, slug } = options;
  if (!SEGMENT.test(category || '')) throw new Error('Destination category must be lowercase kebab-case.');
  if (!SEGMENT.test(slug || '')) throw new Error('Destination slug must be lowercase kebab-case.');
  validateItem(provisionalItem(options));
}

export async function importSkill(options) {
  const {
    category,
    slug,
    rootDir = process.cwd(),
    fetchImpl = fetch,
    now = () => new Date()
  } = options;

  validateImportOptions(options);
  const destination = path.join(rootDir, 'skills', category, slug);
  if (fs.existsSync(destination)) throw new Error(`Destination already exists: skills/${category}/${slug}`);

  const provisional = provisionalItem(options, now().toISOString());
  const url = rawGitHubUrl(provisional);
  const response = await fetchImpl(url);
  if (!response?.ok) throw new Error(`Upstream fetch failed with HTTP ${response?.status ?? 'unknown'} for ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());

  const item = {
    ...provisional,
    integrity: { mode: 'exact-upstream', sha256: sha256(bytes), bytes: bytes.length }
  };
  validateItem(item, { expectedType: 'skill', expectedCategory: category, expectedSlug: slug });

  fs.mkdirSync(destination, { recursive: true });
  const skillFsPath = path.join(destination, 'SKILL.md');
  const itemFsPath = path.join(destination, 'item.json');
  fs.writeFileSync(skillFsPath, bytes);
  fs.writeFileSync(itemFsPath, `${JSON.stringify(item, null, 2)}\n`, 'utf8');

  return {
    skillPath: path.posix.join('skills', category, slug, 'SKILL.md'),
    metadataPath: path.posix.join('skills', category, slug, 'item.json'),
    item
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await importSkill(options);
  console.log(`Imported exact upstream bytes to ${result.skillPath}`);
  console.log(`sha256:${result.item.integrity.sha256} · ${result.item.integrity.bytes} bytes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

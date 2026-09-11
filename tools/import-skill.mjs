import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rawGitHubUrl, sha256, validateMetadata } from '../lib/skill-integrity.mjs';

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export function validateImportOptions(options) {
  const { repo, commit, path: sourcePath, category, slug } = options;
  if (!SEGMENT.test(category || '')) throw new Error('Destination category must be lowercase kebab-case.');
  if (!SEGMENT.test(slug || '')) throw new Error('Destination slug must be lowercase kebab-case.');
  const metadata = {
    schema_version: 1,
    kind: 'verified-upstream-skill',
    source: { repository: repo, path: sourcePath, commit },
    integrity: { sha256: '0'.repeat(64), bytes: 0 },
    imported_at: new Date(0).toISOString()
  };
  validateMetadata(metadata);
}

export async function importSkill(options) {
  const {
    repo,
    commit,
    path: sourcePath,
    category,
    slug,
    rootDir = process.cwd(),
    fetchImpl = fetch,
    now = () => new Date()
  } = options;

  validateImportOptions(options);
  const destination = path.join(rootDir, 'skills', category, slug);
  if (fs.existsSync(destination)) throw new Error(`Destination already exists: skills/${category}/${slug}`);

  const provisional = {
    schema_version: 1,
    kind: 'verified-upstream-skill',
    source: { repository: repo, path: sourcePath, commit },
    integrity: { sha256: '0'.repeat(64), bytes: 0 },
    imported_at: now().toISOString()
  };
  const url = rawGitHubUrl(provisional);
  const response = await fetchImpl(url);
  if (!response?.ok) throw new Error(`Upstream fetch failed with HTTP ${response?.status ?? 'unknown'} for ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());

  const metadata = {
    ...provisional,
    integrity: { sha256: sha256(bytes), bytes: bytes.length }
  };
  validateMetadata(metadata);

  fs.mkdirSync(destination, { recursive: true });
  const skillFsPath = path.join(destination, 'SKILL.md');
  const metadataFsPath = path.join(destination, 'agent-shelf.json');
  fs.writeFileSync(skillFsPath, bytes);
  fs.writeFileSync(metadataFsPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  return {
    skillPath: path.posix.join('skills', category, slug, 'SKILL.md'),
    metadataPath: path.posix.join('skills', category, slug, 'agent-shelf.json'),
    metadata
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await importSkill(options);
  console.log(`Imported exact upstream bytes to ${result.skillPath}`);
  console.log(`sha256:${result.metadata.integrity.sha256} · ${result.metadata.integrity.bytes} bytes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from './skill-integrity.mjs';
import { contentFilename, deriveTrustCode, validateItem } from './item-schema.mjs';

const ROOTS = [
  { directory: 'prompts', type: 'prompt' },
  { directory: 'skills', type: 'skill' }
];

function projectItem(item) {
  return {
    id: item.id,
    type: item.type,
    category: item.category,
    slug: item.slug,
    title: item.title,
    description: item.description,
    tags: item.tags,
    path: `${item.type}s/${item.category}/${item.slug}/${contentFilename(item.type)}`,
    trust: deriveTrustCode(item),
    origin: item.origin,
    integrity: item.integrity,
    tracking: item.tracking
  };
}

function verifyLocalContent(contentPath, item) {
  const bytes = fs.readFileSync(contentPath);
  if (bytes.length !== item.integrity.bytes) {
    throw new Error(`${contentPath}: integrity byte length mismatch: expected ${item.integrity.bytes}, got ${bytes.length}.`);
  }
  const actualHash = sha256(bytes);
  if (actualHash !== item.integrity.sha256) {
    throw new Error(`${contentPath}: integrity SHA-256 hash mismatch: expected ${item.integrity.sha256}, got ${actualHash}.`);
  }
}

export function assertUniqueCatalogItems(items) {
  const ids = new Set();
  const routes = new Set();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Duplicate catalog id: ${item.id}.`);
    ids.add(item.id);
    const route = `${item.type}/${item.category}/${item.slug}`;
    if (routes.has(route)) throw new Error(`Duplicate catalog route: ${route}.`);
    routes.add(route);
  }
}

function scanRoot(rootDir, rootSpec) {
  const root = path.join(rootDir, rootSpec.directory);
  if (!fs.existsSync(root)) return [];
  const items = [];

  for (const categoryEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!categoryEntry.isDirectory()) continue;
    const category = categoryEntry.name;
    const categoryDir = path.join(root, category);

    for (const slugEntry of fs.readdirSync(categoryDir, { withFileTypes: true })) {
      if (!slugEntry.isDirectory()) continue;
      const slug = slugEntry.name;
      const itemDir = path.join(categoryDir, slug);
      const itemPath = path.join(itemDir, 'item.json');
      const contentPath = path.join(itemDir, contentFilename(rootSpec.type));
      const hasItem = fs.existsSync(itemPath);
      const hasContent = fs.existsSync(contentPath);

      if (!hasItem && !hasContent) continue;
      if (hasContent && !hasItem) throw new Error(`${contentPath}: orphan content file is missing sibling item.json.`);
      if (hasItem && !hasContent) throw new Error(`${itemPath}: missing sibling ${contentFilename(rootSpec.type)}.`);

      let item;
      try {
        item = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
      } catch (error) {
        throw new Error(`${itemPath}: invalid JSON: ${error.message}`);
      }
      try {
        validateItem(item, { expectedType: rootSpec.type, expectedCategory: category, expectedSlug: slug });
      } catch (error) {
        throw new Error(`${itemPath}: ${error.message}`);
      }
      verifyLocalContent(contentPath, item);
      items.push(projectItem(item));
    }
  }
  return items;
}

export function buildCatalog({ rootDir = process.cwd() } = {}) {
  const items = ROOTS.flatMap((rootSpec) => scanRoot(rootDir, rootSpec));
  assertUniqueCatalogItems(items);
  items.sort((a, b) =>
    a.type.localeCompare(b.type)
    || a.category.localeCompare(b.category)
    || a.slug.localeCompare(b.slug)
    || a.id.localeCompare(b.id)
  );
  return { version: 4, items };
}

export function writeCatalog({ rootDir = process.cwd(), outputPath = 'catalog.json' } = {}) {
  const catalog = buildCatalog({ rootDir });
  const target = path.isAbsolute(outputPath) ? outputPath : path.join(rootDir, outputPath);
  fs.writeFileSync(target, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return catalog;
}

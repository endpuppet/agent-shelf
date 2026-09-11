import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeCatalog } from '../lib/catalog-builder.mjs';

export function generateCatalog({ rootDir = process.cwd(), outputPath = 'catalog.json' } = {}) {
  return writeCatalog({ rootDir, outputPath });
}

function main() {
  const catalog = generateCatalog();
  const skills = catalog.items.filter((item) => item.type === 'skill').length;
  const prompts = catalog.items.filter((item) => item.type === 'prompt').length;
  console.log(`Generated catalog.json with ${catalog.items.length} items (${skills} skills, ${prompts} prompts).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

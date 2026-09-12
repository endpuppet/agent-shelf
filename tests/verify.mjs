import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCatalog } from '../lib/catalog-builder.mjs';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => fs.existsSync(path);

assert.ok(exists('.nojekyll'), 'GitHub Pages must bypass Jekyll so SKILL.md/PROMPT.md stay fetchable as raw files.');

const app = read('app.js');
const html = read('index.html');
const css = read('styles.css');
const catalog = buildCatalog({ rootDir: '.' });
assert.doesNotThrow(() => new Function(app), 'app.js must remain syntactically valid JavaScript.');
assert.ok(exists('catalog.json'), 'Static verification must run after catalog.json generation.');
assert.deepEqual(JSON.parse(read('catalog.json')), catalog, 'Published catalog.json must be the deterministic projection of canonical item metadata.');

const skillEntries = catalog.items.filter((item) => item.type === 'skill');
const skillFiles = exists('skills')
  ? fs.readdirSync('skills', {recursive: true, withFileTypes: true})
      .filter((entry) => entry.isFile() && entry.name === 'SKILL.md')
  : [];
assert.equal(skillEntries.length, 0, 'Cleanup state must contain zero skill catalog entries.');
assert.equal(skillFiles.length, 0, 'Cleanup state must contain no SKILL.md files.');
assert.equal(catalog.items.length, 4, 'Current canonical shelf should contain four prompts.');

const researchMax = catalog.items.find((item) => item.slug === 'research-max');
assert.equal(researchMax?.title, 'Research Max', 'Canonical prompt title must remain source-authored.');
for (const item of catalog.items) {
  for (const forbidden of ['title_sl', 'description_sl', 'tags_sl']) {
    assert.equal(Object.hasOwn(item, forbidden), false, `${item.id} must not contain translated item field ${forbidden}.`);
  }
}

const verifyWorkflow = read('.github/workflows/verify.yml');
const pagesWorkflow = read('.github/workflows/pages.yml');
assert.ok(exists('.gitattributes'), '.gitattributes must protect imported skill bytes.');
const gitAttributes = exists('.gitattributes') ? read('.gitattributes') : '';
assert.match(gitAttributes, /^skills\/\*\*\/SKILL\.md -text$/m, 'Imported SKILL.md files must be marked -text.');

for (const [name, workflow] of [['Verification', verifyWorkflow], ['Pages', pagesWorkflow]]) {
  assert.match(workflow, /node tools\/verify-imported-skills\.mjs/, `${name} workflow must run imported-skill verification.`);
  assert.match(workflow, /node tools\/generate-catalog\.mjs/, `${name} workflow must generate catalog from canonical metadata.`);
  assert.match(workflow, /node tests\/verify\.mjs/, `${name} workflow must run static verification against generated output.`);
}

const verifyGateIndex = verifyWorkflow.indexOf('node tools/verify-imported-skills.mjs');
const verifyCatalogTestIndex = verifyWorkflow.indexOf('node tests/catalog-builder.mjs');
const verifyGenerateIndex = verifyWorkflow.indexOf('node tools/generate-catalog.mjs');
const verifyStaticIndex = verifyWorkflow.indexOf('node tests/verify.mjs');
assert.ok(
  verifyGateIndex >= 0
  && verifyCatalogTestIndex > verifyGateIndex
  && verifyGenerateIndex > verifyCatalogTestIndex
  && verifyStaticIndex > verifyGenerateIndex,
  'Verification workflow must verify upstream, test catalog building, generate catalog, then run static verification.'
);

const pagesGateIndex = pagesWorkflow.indexOf('node tools/verify-imported-skills.mjs');
const pagesGenerateIndex = pagesWorkflow.indexOf('node tools/generate-catalog.mjs');
const pagesStaticIndex = pagesWorkflow.indexOf('node tests/verify.mjs');
const uploadIndex = pagesWorkflow.indexOf('actions/upload-pages-artifact');
assert.ok(
  pagesGateIndex >= 0
  && pagesGenerateIndex > pagesGateIndex
  && pagesStaticIndex > pagesGenerateIndex
  && uploadIndex > pagesStaticIndex,
  'Pages must verify exact-upstream skills, generate catalog, run static verification, then upload the artifact.'
);

assert.match(app, /raw\.githubusercontent\.com/, 'Markdown loader needs a raw.githubusercontent.com fallback.');
assert.match(app, /localStorage/, 'Theme and language choices should persist locally.');
assert.doesNotMatch(app, /item\.title_sl|item\.description_sl|item\.tags_sl/, 'Item metadata must not change with locale.');
assert.match(app, /function pinnedSourceUrl\(/, 'Exact-upstream skills need a commit-pinned source URL constructor.');
assert.match(app, /item\.trust\s*===\s*['"]exact-upstream['"]/, 'Provenance UI must use generated exact-upstream trust state.');

for (const key of [
  'trust_exact_upstream',
  'trust_personal',
  'trust_own_repository',
  'trust_derived',
  'trust_generated',
  'provenance_repository',
  'provenance_commit',
  'provenance_fingerprint'
]) {
  const matches = app.match(new RegExp(`${key}\\s*:`, 'g')) || [];
  assert.equal(matches.length, 2, `${key} must exist in both EN and SL WebUI chrome dictionaries.`);
}

assert.match(html, /id="provenance"/, 'Item details need an integrated provenance section.');
assert.match(html, /id="verification-badge"/, 'Item details need a trust badge element.');
assert.match(html, /id="provenance-repository"/, 'Item details need repository provenance.');
assert.match(html, /id="provenance-commit"/, 'Item details need commit provenance.');
assert.match(html, /id="provenance-hash"/, 'Item details need integrity fingerprint provenance.');
assert.doesNotMatch(html, /verified-provenance\.js|verified-provenance\.css/, 'Standalone provenance assets must be removed from the UI.');
assert.equal(exists('verified-provenance.js'), false, 'Standalone provenance JS must be removed.');
assert.equal(exists('verified-provenance.css'), false, 'Standalone provenance CSS must be removed.');
assert.match(css, /\.verification-badge/, 'Integrated provenance needs visible trust styling.');

assert.match(html, /id="language-toggle"/, 'UI needs an EN/SL language control.');
assert.match(html, /id="theme-toggle"/, 'UI needs a theme control.');
assert.match(html, /id="language-toggle" class="icon-button language-toggle"/, 'Language control should match the icon buttons.');
assert.match(html, /language-toggle[\s\S]*?<svg/, 'Language control should use an icon, not a wide text pill.');
assert.match(html, /class="language-badge"/, 'Language icon should still expose the active locale compactly.');

assert.match(app, /function cycleTheme\(/, 'Theme button should cycle themes directly.');
assert.match(app, /themeToggle\.addEventListener\('click', cycleTheme\)/, 'Theme button must invoke direct theme cycling.');
assert.doesNotMatch(html, /id="theme-panel"/, 'Theme chooser modal should be removed from the mobile interaction path.');

assert.doesNotMatch(app, /document\.body\.style\.overflow/, 'Body overflow must not be mutated for overlays.');
assert.match(css, /\.detail-scroll\{[^}]*-webkit-overflow-scrolling:touch[^}]*touch-action:pan-y/, 'Detail content needs reliable native vertical touch scrolling.');
assert.match(css, /\.detail-backdrop\{[^}]*touch-action:none/, 'Backdrop gestures should not leak into the page underneath.');

const agents = read('AGENTS.md');
for (const required of [
  'NEVER author or modify an imported SKILL.md',
  'byte-for-byte',
  'full 40-character commit SHA',
  'node tools/import-skill.mjs',
  'node tools/verify-imported-skills.mjs'
]) {
  assert.ok(agents.includes(required), `AGENTS.md is missing immutable skill policy: ${required}`);
}

for (const theme of ['shelf-lime', 'paper-vermilion','midnight-cobalt','mono-brutal']) {
  assert.ok(css.includes(`[data-theme="${theme}"]`), `Missing theme: ${theme}`);
}

console.log(`Agent Shelf verification passed for ${catalog.items.length} canonical items.`);

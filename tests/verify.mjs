import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => fs.existsSync(path);

assert.ok(exists('.nojekyll'), 'GitHub Pages must bypass Jekyll so SKILL.md/PROMPT.md stay fetchable as raw files.');

const app = read('app.js');
const html = read('index.html');
const css = read('styles.css');
const catalog = JSON.parse(read('catalog.json'));

assert.match(app, /raw\.githubusercontent\.com/, 'Markdown loader needs a raw.githubusercontent.com fallback.');
assert.match(app, /localStorage/, 'Theme and language choices should persist locally.');
assert.match(html, /id="language-toggle"/, 'UI needs an EN\/SL language control.');
assert.match(html, /id="theme-toggle"/, 'UI needs a theme control.');

for (const theme of ['shelf-lime', 'paper-vermilion', 'midnight-cobalt', 'mono-brutal']) {
  assert.ok(css.includes(`[data-theme="${theme}"]`), `Missing theme: ${theme}`);
}

for (const item of catalog.items) {
  assert.equal(typeof item.title_sl, 'string', `${item.id} is missing title_sl`);
  assert.ok(item.title_sl.length > 0, `${item.id} has an empty title_sl`);
  assert.equal(typeof item.description_sl, 'string', `${item.id} is missing description_sl`);
  assert.ok(item.description_sl.length > 0, `${item.id} has an empty description_sl`);
}

console.log(`Agent Shelf verification passed for ${catalog.items.length} catalog items.`);

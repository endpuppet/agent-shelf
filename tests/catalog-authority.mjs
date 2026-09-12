import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

assert.ok(fs.existsSync('catalog.json'), 'Catalog generation must run before authority verification.');
assert.ok(fs.existsSync('.gitignore'), '.gitignore must exist once catalog.json becomes generated output.');
const ignore = fs.readFileSync('.gitignore', 'utf8');
assert.match(ignore, /^catalog\.json$/m, 'catalog.json must be ignored as generated output.');
const tracked = execFileSync('git', ['ls-files', '--', 'catalog.json'], { encoding: 'utf8' }).trim();
assert.equal(tracked, '', 'catalog.json must not be tracked in Git.');

console.log('Generated catalog authority test passed.');

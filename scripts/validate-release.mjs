import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const [pkg, lock, source, root, built] = await Promise.all(
  ['package.json', 'package-lock.json', 'foundry/module.json', 'module.json', 'release/token-studio/module.json'].map(json)
);
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[''].version, pkg.version);
assert.deepEqual(root, source);
assert.deepEqual(built, source);
assert.equal(source.version, pkg.version);
assert.equal(source.id, 'token-studio');
assert.equal(source.compatibility.minimum, '13');
assert.equal(source.compatibility.maximum, '13');
const repository = 'https://github.com/STR4DZN/token-studio';
assert.equal(source.url, repository);
assert.equal(source.manifest, 'https://raw.githubusercontent.com/STR4DZN/token-studio/main/module.json');
assert.equal(source.download, `${repository}/releases/download/v${pkg.version}/token-studio.zip`);
const tag = process.env.RELEASE_TAG;
if (tag) assert.equal(tag, `v${pkg.version}`, 'Tag and module version must match');
for (const file of [...source.esmodules, ...source.styles, source.license,
  'scripts/editor.js', 'scripts/transaction.js', 'scripts/sheet-adapter.js',
  'scripts/compcon.js', 'assets/frames/credits.json', 'COMP_CON_GUIDE.md',
  'licenses/React.txt', 'licenses/DOMPurify.txt']) {
  assert(!file.startsWith('/') && !file.split('/').includes('..'));
  await access(`release/token-studio/${file}`);
}
console.log(`Release v${pkg.version}: manifests, versions and packaged files validated.`);

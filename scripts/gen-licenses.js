// Writes src/data/licenses.json: every direct dependency with its version and licence, read from node_modules.
// Run: npm run licenses (CI runs it before building, so the About screen always matches the shipped libraries).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const rows = [];
for (const name of Object.keys(pkg.dependencies ?? {}).sort()) {
  try {
    const dep = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'));
    const license = typeof dep.license === 'string' ? dep.license : dep.license?.type ?? 'See package';
    rows.push({ name, version: dep.version, license });
  } catch {
    rows.push({ name, version: pkg.dependencies[name], license: 'See package' });
  }
}
fs.writeFileSync(path.join(root, 'src', 'data', 'licenses.json'), `${JSON.stringify(rows, null, 2)}\n`);
console.log(`Wrote ${rows.length} licences`);

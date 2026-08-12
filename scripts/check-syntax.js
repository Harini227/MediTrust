const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(full));
    else if (e.isFile() && full.endsWith('.js')) files.push(full);
  }
  return files;
}

const roots = ['server', 'client'].filter((d) => fs.existsSync(d));
let hadError = false;
for (const r of roots) {
  const files = walk(r);
  for (const f of files) {
    try {
      execSync(`node --check "${f}"`, { stdio: 'inherit' });
    } catch (err) {
      hadError = true;
    }
  }
}
if (hadError) process.exit(1);
console.log('Syntax check passed for JS files.');

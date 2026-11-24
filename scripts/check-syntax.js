const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const folders = ['src', 'frontend', 'scripts'];
const files = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
}

for (const folder of folders) collect(path.join(root, folder));
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  console.log(`Syntax OK: ${path.relative(root, file)}`);
}

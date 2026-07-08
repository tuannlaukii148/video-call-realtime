import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const srcDir = join(root, 'src');

const collectJsFiles = (dir) => {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
};

for (const file of collectJsFiles(srcDir)) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

const testResult = spawnSync('npm', ['test'], {
  cwd: root,
  shell: true,
  stdio: 'inherit',
});

process.exit(testResult.status ?? 1);

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Load + validate env (DATABASE_URL) before Prisma CLI runs
await import('../src/config.js');

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

execSync('npx prisma db push', {
  cwd: serverRoot,
  stdio: 'inherit',
  env: process.env,
});

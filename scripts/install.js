#!/usr/bin/env node

import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

const projectRoot = process.cwd();
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);
const offlineMode = args.includes('--offline') || process.env.STOCKSAGE_OFFLINE === 'true';
const skipInstall = offlineMode || args.includes('--skip-install');
const skipBuild = args.includes('--skip-build');
const hasClientSource = existsSync(join(projectRoot, 'client', 'index.html'));
const hasPrebuiltDist = existsSync(join(projectRoot, 'dist', 'public'));

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

try {
  if (skipInstall) {
    console.log('📦 Skipping dependency installation (offline mode)');
    if (!existsSync(join(projectRoot, 'node_modules'))) {
      throw new Error('node_modules directory is missing; cannot skip installation in offline mode');
    }
  } else {
    console.log('📦 Installing dependencies...');
    await runCommand(npmCmd, ['install'], { cwd: projectRoot });
  }

  if (skipBuild) {
    console.log('🧱 Skipping web client build (requested)');
  } else if (!hasClientSource) {
    if (!hasPrebuiltDist) {
      throw new Error('client/index.html is missing and dist/public was not found; cannot build bundled release');
    }
    console.log('🧱 Skipping web client build (using pre-built assets)');
  } else {
    console.log('🏗️  Building web client...');
    await runCommand(npmCmd, ['run', 'build'], { cwd: projectRoot });
  }

  const distPublicPath = join(projectRoot, 'dist', 'public');
  if (!existsSync(distPublicPath)) {
    console.warn('⚠️  Build output not found at dist/public. Static assets may not be served correctly.');
  }

  console.log('🗃️  Initialising SQLite database...');
  await runCommand('node', ['scripts/init-sqlite.js', '--seed'], { cwd: projectRoot });

  console.log('\n✅ StockSage is ready!');
  console.log('   Default admin credentials:');
  console.log('     • Tenant ID : tenant_1');
  console.log('     • Username  : admin');
  console.log('     • Password  : admin123');
  console.log('\n   Start the application with: npm start');
} catch (error) {
  console.error('\n❌ Setup failed:', error.message || error);
  process.exit(1);
}

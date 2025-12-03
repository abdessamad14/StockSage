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

// Wrap in async function for Node.js v13 compatibility (no top-level await)
async function main() {
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
      try {
        await runCommand(npmCmd, ['run', 'build'], { cwd: projectRoot });
        console.log('✅ Web client build completed successfully');
      } catch (error) {
        console.error('❌ Web client build failed:', error.message);
        throw new Error('Build process failed. Please check your Node.js version and try again.');
      }
    }

    const distPublicPath = join(projectRoot, 'dist', 'public');
    if (!existsSync(distPublicPath)) {
      throw new Error('Build output not found at dist/public. Build process may have failed silently.');
    }

    // Verify critical build files exist
    const indexHtmlPath = join(distPublicPath, 'index.html');
    const assetsPath = join(distPublicPath, 'assets');
    
    if (!existsSync(indexHtmlPath)) {
      throw new Error('index.html not found in build output. Build process incomplete.');
    }
    
    if (!existsSync(assetsPath)) {
      throw new Error('Assets directory not found in build output. Build process incomplete.');
    }
    
    console.log('✅ Build verification completed successfully');

    console.log('🗃️  Initialising SQLite database...');
    await runCommand('node', ['scripts/init-sqlite.js', '--seed'], { cwd: projectRoot });

    // Create desktop shortcuts automatically (Windows only)
    if (process.platform === 'win32') {
      console.log('\n🔗 Creating desktop shortcuts...');
      try {
        // Use cscript to run VBScript silently (no admin required)
        await runCommand('cscript', ['//Nologo', 'create-shortcuts.vbs'], { cwd: projectRoot });
        console.log('✅ Desktop shortcut created successfully!');
        console.log('   → Look for "Igoodar" icon on your desktop');
      } catch (error) {
        console.log('⚠️  Could not create shortcuts automatically');
        console.log('   → Run create-shortcuts.vbs manually after installation');
      }
    }

    console.log('\n✅ StockSage is ready!');
    console.log('   Default user credentials:');
    console.log('     • Admin - Username: admin, Password: admin123, PIN: 1234');
    console.log('     • Cashier - Username: cashier, Password: cashier123, PIN: 5678');
    console.log('     • Tenant ID: tenant_1');
    console.log('\n   Start the application:');
    console.log('     • Double-click "Igoodar" desktop icon');
    console.log('     • Or run: npm start');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message || error);
    process.exit(1);
  }
}

// Run main function
main();

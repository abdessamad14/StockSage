#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

console.log('🚀 Starting igoodar...');

// Detect npm command - try npm.cmd first, fallback to npm
let npmCmd = 'npm';
if (process.platform === 'win32') {
  // Check if npm.cmd exists, otherwise use npm (for portable Node.js)
  try {
    execSync('where npm.cmd', { stdio: 'ignore' });
    npmCmd = 'npm.cmd';
  } catch {
    // npm.cmd not found, use npm directly
    console.log('ℹ️  Using npm (portable mode)');
    npmCmd = 'npm';
  }
}

// Check if node_modules exists
const nodeModulesPath = join(process.cwd(), 'node_modules');
if (!existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies (first time setup)...');
  console.log('⏳ This may take a few minutes...\n');
  
  const installProcess = spawn(npmCmd, ['install'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  installProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Dependencies installed successfully!\n');
      checkBuildAndContinue();
    } else {
      console.error('❌ Dependency installation failed');
      process.exit(1);
    }
  });
} else {
  checkBuildAndContinue();
}

function checkBuildAndContinue() {
  // Ensure build assets exist
  const distPath = join(process.cwd(), 'dist', 'public');
  if (!existsSync(distPath)) {
    console.error('❌ Build artefacts not found at dist/public. Run `npm run setup` first.');
    process.exit(1);
  }
  
  // Run data migration first (moves data from old location to safe location)
  migrateUserData();
}

function migrateUserData() {
  console.log('\n🔄 Checking for data migration...');
  
  // Use the current Node.js executable (works with portable Node.js)
  const nodeExe = process.execPath;
  
  // Run the migration script
  const migrateProcess = spawn(nodeExe, ['scripts/migrate-user-data.js'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  migrateProcess.on('close', (code) => {
    if (code === 0) {
      // Migration successful or not needed - continue
      checkDatabase();
    } else {
      console.error('❌ Data migration failed');
      console.error('   Your data may be in an inconsistent state.');
      console.error('   Please contact support if this issue persists.');
      process.exit(1);
    }
  });
}

async function checkDatabase() {
  // Import the user data path utilities
  const userDataPathModule = await import('./server/user-data-path.js');
  const { getDatabasePath } = userDataPathModule;
  
  // Check if database exists in the safe location
  const dbPath = getDatabasePath();
  console.log(`\n📋 Checking database at: ${dbPath}`);
  
  // Use the current Node.js executable (works with portable Node.js)
  const nodeExe = process.execPath;
  
  if (!existsSync(dbPath)) {
    console.log('📦 Initializing database...');
    
    // Run database initialization
    const initProcess = spawn(nodeExe, ['scripts/init-sqlite.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    initProcess.on('close', (code) => {
      if (code === 0) {
        startServer();
      } else {
        console.error('❌ Database initialization failed');
        process.exit(1);
      }
    });
  } else {
    console.log('✅ Database found, checking schema...');
    
    // Always run schema migration check on startup to ensure schema is up-to-date
    const migrateProcess = spawn(nodeExe, ['scripts/init-sqlite.js', '--no-seed'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    migrateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Schema check complete');
        startServer();
      } else {
        console.error('❌ Schema migration failed');
        process.exit(1);
      }
    });
  }
}

function startServer() {
  // Use the current Node.js executable (works with portable Node.js)
  const nodeExe = process.execPath;
  
  // In production installer: server/ contains obfuscated .js files
  // In development: server/ contains .ts files
  let serverPath;
  const jsPath = join(process.cwd(), 'server', 'index.js');
  const tsPath = join(process.cwd(), 'server', 'index.ts');
  
  if (existsSync(jsPath)) {
    serverPath = jsPath;
    console.log('🔒 Starting production server...');
  } else if (existsSync(tsPath)) {
    serverPath = tsPath;
    console.log('🔧 Starting development server...');
  } else {
    console.error('❌ Server entry point not found!');
    console.error('   Expected: server/index.js or server/index.ts');
    process.exit(1);
  }
  
  // Set production environment
  const env = {
    ...process.env,
    NODE_ENV: 'production'
  };
  
  // For TypeScript files, we need tsx; for JS files, run directly
  let command, args;
  if (serverPath.endsWith('.ts')) {
    // TypeScript - need tsx
    if (process.platform === 'win32') {
      const tsxJs = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
      command = nodeExe;
      args = [tsxJs, serverPath];
    } else {
      command = 'npx';
      args = ['tsx', serverPath];
    }
  } else {
    // JavaScript (obfuscated) - run directly with Node
    command = nodeExe;
    args = [serverPath];
  }
  
  console.log(`📍 Server path: ${serverPath}`);
  console.log(`🚀 Command: ${command}`);
  
  // Start the server
  const serverProcess = spawn(command, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down StockSage...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
}

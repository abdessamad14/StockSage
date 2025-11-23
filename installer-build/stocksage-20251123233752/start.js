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
  
  checkDatabase();
}

function checkDatabase() {
  // Check if database exists
  const dbPath = join(process.cwd(), 'data', 'stocksage.db');
  if (!existsSync(dbPath)) {
    console.log('📦 Initializing database...');
    
    // Run database initialization
    const initProcess = spawn('node', ['scripts/init-sqlite.js'], {
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
    console.log('✅ Database found, starting server...');
    startServer();
  }
}

function startServer() {
  // Start the server
  const serverProcess = spawn(npmCmd, ['run', 'start:local'], {
    stdio: 'inherit',
    cwd: process.cwd()
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

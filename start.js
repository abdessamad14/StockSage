#!/usr/bin/env node

import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

console.log('🚀 Starting StockSage...');

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

function startServer() {
  // Start the server
  const serverProcess = spawn('npm', ['run', 'dev'], {
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

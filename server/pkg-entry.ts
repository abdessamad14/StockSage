#!/usr/bin/env node

/**
 * PKG Entry Point for Igoodar
 * This file serves as the main entry point when running as a compiled executable
 * It initializes the database and starts the server
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

console.log('🚀 Starting Igoodar (PKG Mode)...');

// Check if database exists
const dbPath = join(process.cwd(), 'data', 'stocksage.db');

if (!existsSync(dbPath)) {
  console.log('📦 Initializing database...');
  
  // Run database initialization using bundled Node.js
  const initScript = join(process.cwd(), 'scripts', 'init-sqlite.js');
  const initProcess = spawn(process.execPath, [initScript], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  initProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Database initialized');
      startServer();
    } else {
      console.error('❌ Database initialization failed');
      process.exit(1);
    }
  });
} else {
  console.log('✅ Database found');
  startServer();
}

function startServer() {
  // Import and start the main server
  import('./index.js').catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

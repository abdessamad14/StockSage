#!/usr/bin/env node

// Simple script to load environment variables and run the application
import { config } from 'dotenv';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file');
  process.exit(1);
}

console.log('✅ Environment variables loaded:');
console.log(`- DATABASE_URL: ${process.env.DATABASE_URL}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- PORT: ${process.env.PORT || 5000}`);

// Run the application
console.log('\n🚀 Starting the application...');
const child = spawn('npm', ['run', 'dev'], { 
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  console.log(`Application exited with code ${code}`);
});

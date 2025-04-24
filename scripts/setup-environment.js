#!/usr/bin/env node

/**
 * Environment Setup Script for iGoodar Stock
 * 
 * This script detects whether the application is running in Replit or local environment
 * and sets up the appropriate configuration for each environment.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load existing .env file if it exists
try {
  dotenv.config();
} catch (error) {
  console.log('No .env file found, creating a new one.');
}

// Function to check if running in Replit environment
const isReplitEnvironment = () => {
  return process.env.REPL_ID && process.env.REPL_OWNER && process.env.REPL_SLUG;
};

// Function to generate a random string for session secret
const generateSessionSecret = (length = 32) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Configure for Replit environment
const setupReplitEnvironment = async () => {
  console.log('📡 Detected Replit environment. Setting up...');
  
  // Create .env file if it doesn't exist
  const envContent = `# Environment automatically configured for Replit
DATABASE_URL=${process.env.DATABASE_URL || ''}
SESSION_SECRET=${process.env.SESSION_SECRET || generateSessionSecret()}
NODE_ENV=${process.env.NODE_ENV || 'development'}
PORT=${process.env.PORT || 5000}
# Replit specific
REPL_ID=${process.env.REPL_ID}
REPL_OWNER=${process.env.REPL_OWNER}
REPL_SLUG=${process.env.REPL_SLUG}
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Created .env file with Replit configuration');
  
  // Check if database is already set up
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('⚠️ No DATABASE_URL found. Please create a PostgreSQL database in Replit.');
    console.log('   1. Go to "Secrets" in the left panel');
    console.log('   2. Add DATABASE_URL key with a valid PostgreSQL connection string');
    console.log('   3. Run this setup script again');
    process.exit(1);
  }
  
  // Apply database migrations
  console.log('🔄 Applying database migrations...');
  try {
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('✅ Database migrations applied successfully');
  } catch (error) {
    console.error('❌ Failed to apply database migrations:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('🚀 Replit environment setup complete!');
  console.log('   Start the application with: npm run dev');
  console.log('');
}

// Configure for local environment
const setupLocalEnvironment = async () => {
  console.log('🖥️ Setting up local development environment...');
  
  // Check if Docker is installed
  let dockerInstalled = false;
  try {
    execSync('docker --version', { stdio: 'ignore' });
    dockerInstalled = true;
    console.log('✅ Docker detected');
  } catch (error) {
    console.log('⚠️ Docker not detected. Database will need to be set up manually.');
  }
  
  // Create .env file if it doesn't exist
  const envContent = `# Environment automatically configured for local development
DATABASE_URL=${process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/igoodar'}
SESSION_SECRET=${process.env.SESSION_SECRET || generateSessionSecret()}
NODE_ENV=${process.env.NODE_ENV || 'development'}
PORT=${process.env.PORT || 5000}
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Created .env file with local configuration');
  
  // Setup PostgreSQL with Docker if available
  if (dockerInstalled) {
    console.log('🐳 Setting up PostgreSQL with Docker...');
    try {
      execSync('docker-compose up -d postgres', { stdio: 'inherit' });
      console.log('✅ PostgreSQL database started');
      
      // Wait for PostgreSQL to be ready
      console.log('⏳ Waiting for PostgreSQL to be ready...');
      let ready = false;
      let attempts = 0;
      
      while (!ready && attempts < 30) {
        try {
          execSync('docker-compose exec postgres pg_isready -U postgres', { stdio: 'ignore' });
          ready = true;
        } catch (error) {
          attempts++;
          console.log(`   Attempt ${attempts}/30: Database not ready yet, waiting...`);
          execSync('sleep 1');
        }
      }
      
      if (!ready) {
        console.error('❌ PostgreSQL did not become ready in time. Please check the container logs.');
        process.exit(1);
      }
      
      console.log('✅ PostgreSQL is ready');
      
      // Apply database migrations
      console.log('🔄 Applying database migrations...');
      try {
        execSync('npm run db:push', { stdio: 'inherit' });
        console.log('✅ Database migrations applied successfully');
      } catch (error) {
        console.error('❌ Failed to apply database migrations:', error.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to start PostgreSQL with Docker:', error.message);
      console.log('   Please set up your database manually and update the DATABASE_URL in .env file');
    }
  } else {
    console.log('⚠️ Please set up your database manually and update the DATABASE_URL in .env file');
  }

  console.log('');
  console.log('🚀 Local environment setup complete!');
  console.log('   Start the application with: npm run dev');
  console.log('');
}

// Main function
const main = async () => {
  console.log('=================================================');
  console.log('🛠️  iGoodar Stock Environment Setup');
  console.log('=================================================');
  
  if (isReplitEnvironment()) {
    await setupReplitEnvironment();
  } else {
    await setupLocalEnvironment();
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
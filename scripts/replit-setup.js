#!/usr/bin/env node

/**
 * Replit-specific setup script for iGoodar Stock
 * 
 * This script is designed to run automatically when the Replit environment starts,
 * setting up the necessary configuration for the application to run correctly in Replit.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load existing .env file if it exists
try {
  dotenv.config();
} catch (error) {
  console.log('No .env file found, creating a new one.');
}

// Function to generate a random string for session secret
function generateSessionSecret(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Main setup function
async function setupReplitEnvironment() {
  console.log('=================================================');
  console.log('🛠️  iGoodar Stock - Replit Environment Setup');
  console.log('=================================================');
  console.log('📡 Setting up the application for Replit...');
  
  // Create .env file if it doesn't exist
  const sessionSecret = process.env.SESSION_SECRET || generateSessionSecret();
  const envContent = `# Environment automatically configured for Replit
DATABASE_URL=${process.env.DATABASE_URL || ''}
SESSION_SECRET=${sessionSecret}
NODE_ENV=${process.env.NODE_ENV || 'development'}
PORT=${process.env.PORT || 5000}
# Replit specific
REPL_ID=${process.env.REPL_ID || ''}
REPL_OWNER=${process.env.REPL_OWNER || ''}
REPL_SLUG=${process.env.REPL_SLUG || ''}
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Created .env file with Replit configuration');
  
  // Check if database is already set up
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('⚠️ No DATABASE_URL environment variable found.');
    console.log('   Creating a PostgreSQL database...');
    
    try {
      // We'll rely on Replit database provisioning or use an external DB
      console.log('   Please set up a PostgreSQL database and add the DATABASE_URL to Replit Secrets');
      console.log('   Example DATABASE_URL format: postgresql://username:password@hostname:port/database');
    } catch (error) {
      console.error('❌ Failed to create database:', error.message);
      console.log('   Please manually set up a database and add the DATABASE_URL to Replit Secrets');
    }
  } else {
    console.log('✅ Database URL detected');
  }

  // Check if npm packages are installed
  try {
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Installing npm packages...');
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ npm packages installed');
    } else {
      console.log('✅ npm packages already installed');
    }
  } catch (error) {
    console.error('❌ Failed to install npm packages:', error.message);
  }
  
  // Ready to run
  console.log('');
  console.log('🚀 Replit environment setup complete!');
  console.log('   The application will start automatically using the Replit workflow.');
  console.log('');
  console.log('   Default login credentials:');
  console.log('   - Administrator: superadmin / admin123 (tenant_1)');
  console.log('   - Demo User: demo / demo123 (demo-tenant)');
  console.log('');
}

// Run the setup
setupReplitEnvironment().catch(error => {
  console.error('❌ Setup failed:', error);
});
#!/usr/bin/env node

/**
 * Database setup script for iGoodar Stock
 * 
 * This script creates the initial database structure and adds sample data
 * for testing purposes.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure we're in the project root
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

// Check if .env file exists, create a default one if not
const envPath = path.join(projectRoot, '.env');
if (!fs.existsSync(envPath)) {
  console.log('🔧 Creating default .env file...');
  const envContent = 
`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/igoodar
SESSION_SECRET=change_this_to_a_secure_random_value_in_production
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file');
}

// Check if Docker is running
try {
  console.log('🔍 Checking if Docker is running...');
  execSync('docker info', { stdio: 'ignore' });
  console.log('✅ Docker is running');
} catch (error) {
  console.error('❌ Docker is not running. Please start Docker and try again.');
  process.exit(1);
}

// Start PostgreSQL using Docker Compose
try {
  console.log('🐘 Starting PostgreSQL...');
  execSync('docker-compose up -d', { stdio: 'inherit' });
  console.log('✅ PostgreSQL is running');
} catch (error) {
  console.error('❌ Failed to start PostgreSQL:', error.message);
  process.exit(1);
}

// Wait for PostgreSQL to be ready
console.log('⏳ Waiting for PostgreSQL to be ready...');
let ready = false;
let attempts = 0;
const maxAttempts = 30;

while (!ready && attempts < maxAttempts) {
  try {
    execSync('docker-compose exec postgres pg_isready', { stdio: 'ignore' });
    ready = true;
  } catch (error) {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts}...`);
    execSync('sleep 1');
  }
}

if (!ready) {
  console.error('❌ PostgreSQL did not become ready in time');
  process.exit(1);
}

console.log('✅ PostgreSQL is ready');

// Push schema to database
try {
  console.log('🔄 Pushing schema to database...');
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('✅ Schema pushed successfully');
} catch (error) {
  console.error('❌ Failed to push schema:', error.message);
  process.exit(1);
}

console.log('\n🎉 Setup completed successfully!');
console.log('\nYou can now start the application with:');
console.log('npm run dev');
console.log('\nDefault login credentials:');
console.log('- Administrator: superadmin / admin123 (tenant_1)');
console.log('- Demo User: demo / demo123 (demo-tenant)');
#!/usr/bin/env node

/**
 * Build and package StockSage as a ZIP file for easy deployment
 * 
 * Usage: node scripts/build-zip.js
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { platform } from 'os';

const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const packageName = `StockSage-${timestamp}`;
const outputDir = resolve('./packages');
const tempDir = resolve('./temp-build');

console.log('📦 StockSage ZIP Package Builder\n');

try {
  // Clean up any previous temp builds
  if (existsSync(tempDir)) {
    console.log('🧹 Cleaning previous temp build...');
    rmSync(tempDir, { recursive: true, force: true });
  }

  // Create temp directory
  mkdirSync(tempDir, { recursive: true });
  console.log('📁 Created temp build directory\n');

  // Build the application
  console.log('🔨 Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed\n');

  // Copy necessary files to temp directory
  console.log('📋 Copying files...');
  const filesToCopy = [
    'dist',
    'server',
    'shared',
    'scripts',
    'drizzle',
    // NOTE: node_modules excluded - contains platform-specific native binaries
    // Recipients must run 'npm install' on their platform
    'start.js',
    'package.json',
    'package-lock.json',
    'README.md'
  ];

  // Add Windows/Unix start scripts if they exist
  if (existsSync('start.bat')) filesToCopy.push('start.bat');
  if (existsSync('start.sh')) filesToCopy.push('start.sh');

  for (const item of filesToCopy) {
    const src = resolve(item);
    if (existsSync(src)) {
      const dest = join(tempDir, item);
      console.log(`  • Copying ${item}...`);
      cpSync(src, dest, { recursive: true });
    } else {
      console.log(`  ⚠️  Skipping ${item} (not found)`);
    }
  }

  // Create a deployment README
  const deploymentReadme = `# StockSage - Deployment Package

## Requirements
- **Node.js 18 or higher** (Download from https://nodejs.org)
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Internet connection for initial setup (to download dependencies)

## Installation Steps

### 1. Install Dependencies (REQUIRED - First Time Only)

Open a terminal/command prompt in this folder and run:

**Windows (Command Prompt or PowerShell):**
\`\`\`cmd
npm install
\`\`\`

**Linux/macOS:**
\`\`\`bash
npm install
\`\`\`

⚠️ **IMPORTANT:** This step is required because the package contains platform-specific native modules (better-sqlite3) that must be compiled for your operating system.

### 2. Start the Application

**Windows:**
- Double-click \`start.bat\`
- OR run: \`npm start\`

**Linux/macOS:**
- Run: \`./start.sh\`
- OR run: \`npm start\`

### 3. Access the Application

Open your browser to: **http://localhost:5000**

## Default Credentials

The database will be automatically created on first run with these default users:

**Admin User:**
- Username: \`admin\`
- Password: \`admin123\`
- PIN: \`1234\`

**Cashier User:**
- Username: \`cashier\`
- Password: \`cashier123\`
- PIN: \`5678\`

## Troubleshooting

### "better-sqlite3 is not a valid Win32 application" Error
This means you skipped step 1. Run \`npm install\` first.

### Database Issues
If you encounter database schema errors:
\`\`\`bash
npm run db:repair
\`\`\`

### Port Already in Use
Edit \`start.js\` and change the port number (default: 5000).

### Fresh Database Reset
\`\`\`bash
# Delete the data folder
rm -rf data  # Linux/macOS
rmdir /s data  # Windows

# Restart the application - database will be recreated
npm start
\`\`\`

## Manual Setup (Advanced)
If you need to rebuild everything:
\`\`\`bash
npm run setup
\`\`\`

## Support
For issues and documentation, visit: https://github.com/abdessamad14/StockSage
`;

  writeFileSync(join(tempDir, 'DEPLOYMENT.md'), deploymentReadme);
  console.log('  • Created DEPLOYMENT.md');
  console.log('✅ Files copied\n');

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  // Create ZIP file using system commands
  const zipPath = join(outputDir, `${packageName}.zip`);
  console.log('🗜️  Creating ZIP archive...');
  console.log(`   Output: ${zipPath}\n`);

  // Remove existing zip if it exists
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  // Use platform-specific zip command
  const isWindows = platform() === 'win32';
  let zipResult;

  if (isWindows) {
    // Windows: Use PowerShell Compress-Archive
    console.log('   Using PowerShell Compress-Archive...');
    const psCommand = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${zipPath}" -CompressionLevel Optimal -Force`;
    zipResult = spawnSync('powershell', ['-Command', psCommand], {
      stdio: 'inherit',
      shell: true
    });
  } else {
    // Unix/macOS: Use zip command
    console.log('   Using zip command...');
    // Change to temp directory parent to create proper structure
    const tempParent = resolve(tempDir, '..');
    const tempBasename = packageName;
    
    // Rename temp dir to package name for proper archive structure
    const renamedTemp = join(tempParent, 'temp-build-renamed');
    if (existsSync(renamedTemp)) {
      rmSync(renamedTemp, { recursive: true, force: true });
    }
    cpSync(tempDir, renamedTemp, { recursive: true });
    
    zipResult = spawnSync('zip', ['-r', zipPath, '.'], {
      cwd: renamedTemp,
      stdio: 'inherit'
    });
    
    // Clean up renamed temp
    rmSync(renamedTemp, { recursive: true, force: true });
  }

  if (zipResult.status !== 0) {
    throw new Error('ZIP creation failed');
  }

  // Get file size
  const stats = statSync(zipPath);
  const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`\n✅ Package created successfully!`);
  console.log(`📦 File: ${zipPath}`);
  console.log(`📊 Size: ${sizeInMB} MB`);
  console.log(`\n🎉 Ready for deployment!\n`);
  
  // Clean up temp directory
  console.log('🧹 Cleaning up...');
  rmSync(tempDir, { recursive: true, force: true });
  console.log('✅ Done!\n');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  
  // Clean up on error
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  
  process.exit(1);
}

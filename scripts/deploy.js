#!/usr/bin/env node

/**
 * FTP Deployment Script for Hostinger
 * 
 * Automates deployment of StockSage application to Hostinger FTP server
 * 
 * Usage:
 *   npm run deploy                  - Deploy web app
 *   npm run deploy:installer        - Deploy Windows installer
 *   node scripts/deploy.js --help   - Show help
 */

import { Client } from 'basic-ftp';
import { existsSync, statSync, readdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const deployInstaller = args.includes('--installer');
const showHelp = args.includes('--help') || args.includes('-h');
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');

if (showHelp) {
  console.log(`
📦 StockSage FTP Deployment Script

Usage:
  npm run deploy                Deploy web application
  npm run deploy:installer      Deploy Windows installer
  node scripts/deploy.js [options]

Options:
  --installer       Deploy installer instead of web app
  --dry-run         Show what would be deployed without uploading
  --verbose, -v     Show detailed upload progress
  --help, -h        Show this help message

Environment Variables (in .env):
  FTP_HOST          FTP server hostname
  FTP_USER          FTP username
  FTP_PASSWORD      FTP password
  FTP_PORT          FTP port (default: 21)
  FTP_SECURE        Use FTPS (default: false)
  FTP_REMOTE_PATH   Remote directory path
  FTP_INSTALLER_PATH Remote installer directory path (optional)

Examples:
  npm run deploy
  npm run deploy:installer
  node scripts/deploy.js --dry-run --verbose
`);
  process.exit(0);
}

// FTP Configuration from environment variables
const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  port: parseInt(process.env.FTP_PORT || '21'),
  secure: process.env.FTP_SECURE === 'true',
  remotePath: deployInstaller 
    ? (process.env.FTP_INSTALLER_PATH || process.env.FTP_REMOTE_PATH || '/public_html/downloads')
    : (process.env.FTP_REMOTE_PATH || '/public_html'),
};

// Validate configuration
function validateConfig() {
  const required = ['host', 'user', 'password'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required FTP configuration:');
    missing.forEach(key => console.error(`   - FTP_${key.toUpperCase()}`));
    console.error('\nPlease add these to your .env file.');
    process.exit(1);
  }
}

// Get files to deploy
function getFilesToDeploy() {
  if (deployInstaller) {
    // Deploy Windows installer AND version.json
    const installerPath = join(projectRoot, 'installer-simple', 'output', 'igoodar-setup.exe');
    const versionPath = join(projectRoot, 'version.json');
    
    if (!existsSync(installerPath)) {
      console.error('❌ Installer not found. Run: npm run build:installer');
      process.exit(1);
    }
    
    const files = [
      { local: installerPath, remote: 'igoodar-setup.exe' }
    ];
    
    // Include version.json if it exists
    if (existsSync(versionPath)) {
      files.push({ local: versionPath, remote: 'version.json' });
    } else {
      console.warn('⚠️  version.json not found, update notifications will not work');
    }
    
    return files;
  } else {
    // Deploy web application
    const distPath = join(projectRoot, 'dist', 'public');
    const versionPath = join(projectRoot, 'version.json');
    
    if (!existsSync(distPath)) {
      console.error('❌ Build not found. Run: npm run build');
      process.exit(1);
    }
    
    const files = [];
    function scanDirectory(dir, baseDir = dir) {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath, baseDir);
        } else {
          const remotePath = relative(baseDir, fullPath).replace(/\\/g, '/');
          files.push({ local: fullPath, remote: remotePath });
        }
      }
    }
    scanDirectory(distPath);
    
    // Include version.json in web app root for update checking
    if (existsSync(versionPath)) {
      files.push({ local: versionPath, remote: 'version.json' });
      console.log('   ✓ Including version.json for auto-update checking');
    }
    
    return files;
  }
}

// Format file size
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Main deployment function
async function deploy() {
  console.log('\n========================================');
  console.log('  📦 StockSage FTP Deployment');
  console.log('========================================\n');

  validateConfig();

  const files = getFilesToDeploy();
  const totalSize = files.reduce((sum, f) => sum + statSync(f.local).size, 0);

  console.log(`📋 Deployment Summary:`);
  console.log(`   Target: ${deployInstaller ? 'Windows Installer' : 'Web Application'}`);
  console.log(`   Server: ${config.host}:${config.port}`);
  console.log(`   Remote: ${config.remotePath}`);
  console.log(`   Files: ${files.length}`);
  console.log(`   Size: ${formatSize(totalSize)}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE DEPLOYMENT'}\n`);

  if (dryRun) {
    console.log('📁 Files to be deployed:\n');
    files.forEach(f => {
      const size = statSync(f.local).size;
      console.log(`   ${f.remote} (${formatSize(size)})`);
    });
    console.log('\n✅ Dry run complete. Use without --dry-run to actually deploy.\n');
    return;
  }

  const client = new Client();
  client.ftp.verbose = verbose;

  try {
    // Connect to FTP server
    console.log('🔌 Connecting to FTP server...');
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
    });
    console.log('✅ Connected!\n');

    // Change to remote directory (create if doesn't exist)
    console.log(`📂 Preparing remote directory: ${config.remotePath}`);
    try {
      await client.cd(config.remotePath);
    } catch (error) {
      console.log('   Creating directory...');
      await client.ensureDir(config.remotePath);
      await client.cd(config.remotePath);
    }
    console.log('✅ Remote directory ready\n');

    // Create backup (optional)
    if (!deployInstaller) {
      console.log('💾 Creating backup...');
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupDir = `../backups/backup-${timestamp}`;
        // Note: This is a placeholder - implement if needed
        console.log('⚠️  Backup skipped (implement if needed)\n');
      } catch (error) {
        console.log('⚠️  Backup failed (continuing anyway)\n');
      }
    }

    // Upload files
    console.log('📤 Uploading files...\n');
    let uploaded = 0;
    let failed = 0;

    for (const file of files) {
      try {
        // Ensure remote directory exists
        const remoteDir = dirname(file.remote);
        if (remoteDir !== '.' && remoteDir !== '') {
          await client.ensureDir(remoteDir);
        }

        // Upload file
        const size = statSync(file.local).size;
        process.stdout.write(`   Uploading ${file.remote} (${formatSize(size)})...`);
        
        await client.uploadFrom(file.local, file.remote);
        
        console.log(' ✅');
        uploaded++;
      } catch (error) {
        console.log(` ❌ ${error.message}`);
        failed++;
      }
    }

    console.log('\n========================================');
    console.log('  📊 Deployment Summary');
    console.log('========================================\n');
    console.log(`   ✅ Uploaded: ${uploaded} files`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed} files`);
    }
    console.log(`   📦 Total: ${formatSize(totalSize)}`);
    console.log('\n========================================\n');

    if (failed === 0) {
      console.log('🎉 Deployment completed successfully!\n');
      if (deployInstaller) {
        console.log(`📥 Installer URL: https://${config.host}${config.remotePath}/igoodar-setup.exe\n`);
      } else {
        console.log(`🌐 Website URL: https://${config.host}\n`);
      }
    } else {
      console.log('⚠️  Deployment completed with errors.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (verbose) {
      console.error(error);
    }
    process.exit(1);
  } finally {
    client.close();
  }
}

// Run deployment
deploy().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


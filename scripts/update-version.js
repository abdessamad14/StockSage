#!/usr/bin/env node

/**
 * Version Update Script
 * 
 * Updates version.json with new version information
 * 
 * Usage:
 *   node scripts/update-version.js 1.1.0 "https://yourdomain.com/downloads/igoodar-setup.exe" "Bug fixes" "Performance improvements"
 *   node scripts/update-version.js 1.1.0 --critical
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const versionFilePath = join(projectRoot, 'version.json');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
📝 Version Update Script

Usage:
  node scripts/update-version.js <version> [download-url] [changelog-items...] [--critical]

Arguments:
  <version>          New version number (e.g., 1.1.0)
  [download-url]     Download URL for the installer (optional)
  [changelog-items]  New features/changes (multiple items allowed)
  --critical         Mark as critical update (cannot be dismissed)

Examples:
  # Update version only
  node scripts/update-version.js 1.1.0

  # Update with download URL
  node scripts/update-version.js 1.1.0 https://yourdomain.com/downloads/igoodar-setup.exe

  # Update with changelog
  node scripts/update-version.js 1.1.0 https://yourdomain.com/downloads/igoodar-setup.exe "Bug fixes" "Performance improvements"

  # Mark as critical
  node scripts/update-version.js 2.0.0 https://yourdomain.com/downloads/igoodar-setup.exe "Security fixes" --critical

After updating:
  1. Build your installer: npm run build:installer
  2. Deploy: npm run deploy:installer
  `);
  process.exit(0);
}

// Parse arguments
const newVersion = args[0];
const isCritical = args.includes('--critical');
const filteredArgs = args.filter(arg => arg !== '--critical' && arg !== newVersion);

// Try to determine download URL and changelog items
let downloadUrl = null;
let changelogItems = [];

if (filteredArgs.length > 0) {
  // Check if first arg looks like a URL
  const firstArg = filteredArgs[0];
  if (firstArg.startsWith('http://') || firstArg.startsWith('https://')) {
    downloadUrl = firstArg;
    changelogItems = filteredArgs.slice(1);
  } else {
    changelogItems = filteredArgs;
  }
}

// Validate version format
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('❌ Invalid version format. Expected: X.Y.Z (e.g., 1.0.0)');
  process.exit(1);
}

// Read existing version.json or create new
let versionData = {
  version: '1.0.0',
  releaseDate: new Date().toISOString().split('T')[0],
  downloadUrl: 'https://yourdomain.com/downloads/igoodar-setup.exe',
  changelog: [],
  minVersion: '1.0.0',
  critical: false
};

if (existsSync(versionFilePath)) {
  try {
    versionData = JSON.parse(readFileSync(versionFilePath, 'utf-8'));
  } catch (error) {
    console.warn('⚠️  Could not parse existing version.json, creating new one');
  }
}

// Update version data
versionData.version = newVersion;
versionData.releaseDate = new Date().toISOString().split('T')[0];
versionData.critical = isCritical;

if (downloadUrl) {
  versionData.downloadUrl = downloadUrl;
}

if (changelogItems.length > 0) {
  versionData.changelog = changelogItems;
}

// Write updated version.json
writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2) + '\n');

console.log('\n========================================');
console.log('  ✅ Version Updated Successfully!');
console.log('========================================\n');
console.log(`📦 Version:      ${versionData.version}`);
console.log(`📅 Release Date: ${versionData.releaseDate}`);
console.log(`🔗 Download URL: ${versionData.downloadUrl}`);
console.log(`⚠️  Critical:     ${versionData.critical ? 'YES' : 'No'}`);

if (versionData.changelog.length > 0) {
  console.log(`\n📝 Changelog:`);
  versionData.changelog.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item}`);
  });
}

console.log('\n========================================');
console.log('  📋 Next Steps');
console.log('========================================\n');
console.log('1. Build the installer:');
console.log('   npm run build:installer\n');
console.log('2. Deploy to server:');
console.log('   npm run deploy:installer\n');
console.log('3. Users will see update notification within 30 minutes');
console.log('   (or on next app launch)\n');


#!/usr/bin/env node

/**
 * Download Windows prebuilt binary for better-sqlite3
 * Allows building truly offline Windows installer from Mac
 */

import { existsSync, mkdirSync, unlinkSync, cpSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const BETTER_SQLITE3_VERSION = '11.7.0';
// node-v115 is Node MODULE_VERSION 115 (Node v20.x)
// node-v108 is Node MODULE_VERSION 108 (Node v16.x/v18.x)
const BINARY_URL = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BETTER_SQLITE3_VERSION}/better-sqlite3-v${BETTER_SQLITE3_VERSION}-node-v115-win32-x64.tar.gz`;

const windowsBinaryDir = join(projectRoot, '.windows-binaries');
const tempFile = join(windowsBinaryDir, 'temp.tar.gz');
const outputFile = join(windowsBinaryDir, 'better_sqlite3.node');

// Create directory
if (!existsSync(windowsBinaryDir)) {
  mkdirSync(windowsBinaryDir, { recursive: true });
}

console.log('  📥 Downloading Windows binary for Node v20...');

async function download() {
  try {
    // Download tar.gz using curl (more reliable than Node HTTPS on Mac)
    console.log(`  📦 Downloading from: ${BINARY_URL}`);
    execSync(`curl -k -L -o "${tempFile}" "${BINARY_URL}"`, {
      stdio: 'inherit'
    });
    
    console.log('  ✓ Download complete');
    console.log('  📦 Extracting binary...');

    // Extract using system tar command (available on Mac)
    execSync(`tar -xzf "${tempFile}" -C "${windowsBinaryDir}"`, {
      stdio: 'pipe'
    });
    
    // Find the extracted .node file (directly in build/Release/)
    const extractedFile = join(windowsBinaryDir, 'build', 'Release', 'better_sqlite3.node');
    if (existsSync(extractedFile)) {
      // Move to expected location
      cpSync(extractedFile, outputFile);
      // Clean up extracted build folder
      execSync(`rm -rf "${join(windowsBinaryDir, 'build')}"`, { stdio: 'pipe' });
    } else {
      throw new Error(`Extracted file not found at: ${extractedFile}`);
    }

    // Clean up temp file
    if (existsSync(tempFile)) {
      unlinkSync(tempFile);
    }

    if (existsSync(outputFile)) {
      console.log('  ✅ Windows binary extracted successfully!');
    } else {
      throw new Error('Extraction failed - binary not found');
    }

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    // Clean up on error
    if (existsSync(tempFile)) {
      unlinkSync(tempFile);
    }
    throw error;
  }
}

// Run download
download().catch((error) => {
  console.error('\n❌ Download failed');
  process.exit(1);
});


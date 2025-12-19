#!/usr/bin/env node

/**
 * Download Windows prebuilt binary for better-sqlite3
 * Allows building truly offline Windows installer from Mac
 */

import https from 'https';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const BETTER_SQLITE3_VERSION = '11.7.0';
const BINARY_URL = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BETTER_SQLITE3_VERSION}/better-sqlite3-v${BETTER_SQLITE3_VERSION}-napi-v6-win32-x64.tar.gz`;

const windowsBinaryDir = join(projectRoot, '.windows-binaries');
const tempFile = join(windowsBinaryDir, 'temp.tar.gz');
const outputFile = join(windowsBinaryDir, 'better_sqlite3.node');

// Create directory
if (!existsSync(windowsBinaryDir)) {
  mkdirSync(windowsBinaryDir, { recursive: true });
}

console.log('  📥 Downloading from GitHub releases...');

function followRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects === 0) {
      return reject(new Error('Too many redirects'));
    }

    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        return followRedirects(res.headers.location, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      } else if (res.statusCode === 200) {
        resolve(res);
      } else {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
    }).on('error', reject);
  });
}

async function download() {
  try {
    // Download tar.gz
    const response = await followRedirects(BINARY_URL);
    const file = createWriteStream(tempFile);
    
    let downloadedBytes = 0;
    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
    });
    
    await new Promise((resolve, reject) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  ✓ Downloaded ${(downloadedBytes / 1024).toFixed(0)} KB`);
        resolve();
      });
      file.on('error', reject);
      response.on('error', reject);
    });

    console.log('  📦 Extracting binary...');

    // Extract using system tar command (available on Mac)
    execSync(`tar -xzf "${tempFile}" -C "${windowsBinaryDir}" "build/Release/better_sqlite3.node" --strip-components=2`, {
      stdio: 'pipe'
    });

    // Clean up
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


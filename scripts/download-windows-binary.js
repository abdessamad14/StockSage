#!/usr/bin/env node

/**
 * Download Windows prebuilt binary for better-sqlite3
 * This allows building offline Windows installer from Mac
 */

import https from 'https';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import tar from 'tar';

const projectRoot = process.cwd();

// better-sqlite3 version from package.json
const BETTER_SQLITE3_VERSION = '11.7.0';
const NODE_ABI_VERSION = 'napi-v6'; // Node 18+
const PLATFORM = 'win32';
const ARCH = 'x64';

const BINARY_URL = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BETTER_SQLITE3_VERSION}/better-sqlite3-v${BETTER_SQLITE3_VERSION}-${NODE_ABI_VERSION}-${PLATFORM}-${ARCH}.tar.gz`;

const OUTPUT_DIR = join(projectRoot, 'node_modules', 'better-sqlite3', 'build', 'Release');
const OUTPUT_FILE = join(OUTPUT_DIR, 'better_sqlite3.node');

console.log('📥 Downloading Windows binary for better-sqlite3...\n');
console.log(`Version: ${BETTER_SQLITE3_VERSION}`);
console.log(`Platform: ${PLATFORM}-${ARCH}`);
console.log(`URL: ${BINARY_URL}\n`);

// Create output directory
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Download and extract
async function download() {
  try {
    const response = await new Promise((resolve, reject) => {
      https.get(BINARY_URL, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          // Follow redirect
          https.get(res.headers.location, resolve).on('error', reject);
        } else {
          resolve(res);
        }
      }).on('error', reject);
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
    }

    console.log('📦 Downloading...');

    // Extract tar.gz
    await pipeline(
      response,
      createGunzip(),
      tar.extract({
        cwd: OUTPUT_DIR,
        strip: 1 // Remove 'build/Release/' prefix from archive
      })
    );

    console.log('✅ Windows binary downloaded successfully!\n');
    console.log(`📍 Location: ${OUTPUT_FILE}\n`);
    console.log('✅ You can now build an offline Windows installer!');

  } catch (error) {
    console.error('❌ Download failed:', error.message);
    console.error('\n💡 Manual download:');
    console.error(`1. Visit: ${BINARY_URL}`);
    console.error(`2. Extract to: ${OUTPUT_DIR}`);
    console.error(`3. Ensure file is named: better_sqlite3.node`);
    process.exit(1);
  }
}

// Check if already exists
if (existsSync(OUTPUT_FILE)) {
  console.log('ℹ️  Windows binary already exists');
  console.log(`📍 Location: ${OUTPUT_FILE}\n`);
  console.log('To force re-download, delete the file and run again.');
} else {
  download();
}


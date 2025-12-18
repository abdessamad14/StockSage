#!/usr/bin/env node

/**
 * Obfuscate server code for secure distribution
 * This script obfuscates the entire server folder to protect business logic
 */

import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from 'fs';
import { join, dirname, extname } from 'path';

const SOURCE_DIR = 'server-compiled';
const OUTPUT_DIR = 'server-obfuscated';

console.log('🔒 Starting server code obfuscation...\n');

// Clean output directory
if (existsSync(OUTPUT_DIR)) {
  console.log('🧹 Cleaning old obfuscated code...');
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// Obfuscation options - balance between security and performance
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  debugProtection: false, // Disable for production compatibility
  disableConsoleOutput: false, // Keep console logs for debugging
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false, // Don't rename globals to avoid breaking imports
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 3,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

function obfuscateFile(filePath, outputPath) {
  try {
    const code = readFileSync(filePath, 'utf8');
    
    // Obfuscate the code
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, obfuscationOptions).getObfuscatedCode();
    
    // Ensure output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });
    
    // Write obfuscated code
    writeFileSync(outputPath, obfuscatedCode, 'utf8');
    
    console.log(`  ✓ ${filePath} → ${outputPath}`);
  } catch (error) {
    console.error(`  ✗ Failed to obfuscate ${filePath}:`, error.message);
  }
}

function processDirectory(sourceDir, outputDir) {
  const items = readdirSync(sourceDir);
  
  for (const item of items) {
    const sourcePath = join(sourceDir, item);
    const outputPath = join(outputDir, item);
    const stats = statSync(sourcePath);
    
    if (stats.isDirectory()) {
      // Recursively process subdirectories
      processDirectory(sourcePath, outputPath);
    } else if (stats.isFile()) {
      const ext = extname(item);
      
      // Only obfuscate .js files (TypeScript already compiled)
      if (ext === '.js') {
        obfuscateFile(sourcePath, outputPath);
      } else {
        // Copy non-code files as-is
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, readFileSync(sourcePath));
        console.log(`  → ${sourcePath} (copied)`);
      }
    }
  }
}

// Start obfuscation
console.log('📂 Obfuscating files from:', SOURCE_DIR);
console.log('📁 Output directory:', OUTPUT_DIR);
console.log('');

processDirectory(SOURCE_DIR, OUTPUT_DIR);

console.log('\n✅ Obfuscation complete!');
console.log(`📦 Obfuscated code saved to: ${OUTPUT_DIR}\n`);

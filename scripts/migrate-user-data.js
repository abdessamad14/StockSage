#!/usr/bin/env node

/**
 * User Data Migration Script
 * 
 * This script runs on app startup to safely migrate user data from the old
 * location (inside app directory) to the new safe location (%APPDATA%).
 * 
 * This ensures data survives app updates/reinstalls.
 */

import { existsSync, copyFileSync, unlinkSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the user data path utilities
// Try .js first (production), then .ts (development)
let userDataPathModule;
try {
  // Production: compiled .js file
  userDataPathModule = await import('../server/user-data-path.js');
} catch (error) {
  // Development: TypeScript file (requires tsx or ts-node)
  // In dev, this script should be run with tsx
  console.log('⚠️  Running in development mode - user-data-path.ts not compiled');
  console.log('ℹ️  Skipping migration in development (not needed)');
  console.log('✅ Migration check complete (dev mode)\n');
  process.exit(0);
}
const { getUserDataPath, getLegacyDataPath, getCriticalFiles } = userDataPathModule;

console.log('\n========================================');
console.log('  🔄 User Data Migration Check');
console.log('========================================\n');

const userDataPath = getUserDataPath();
const legacyDataPath = getLegacyDataPath();

console.log(`📁 Safe data location: ${userDataPath}`);
console.log(`📁 Old data location:  ${legacyDataPath}\n`);

// Ensure the new user data directory exists
if (!existsSync(userDataPath)) {
  mkdirSync(userDataPath, { recursive: true });
  console.log('✅ Created safe user data directory\n');
}

// Get all critical files that need migration
const criticalFiles = getCriticalFiles();

let filesMigrated = 0;
let filesSkipped = 0;
let errors = [];

console.log('🔍 Checking for files to migrate...\n');

for (const file of criticalFiles) {
  try {
    const oldExists = existsSync(file.oldPath);
    const newExists = existsSync(file.newPath);

    if (oldExists && !newExists) {
      // File exists in old location but not in new location - MIGRATE IT
      console.log(`  ⚠️  Found: ${file.name} in old location`);
      console.log(`     From: ${file.oldPath}`);
      console.log(`     To:   ${file.newPath}`);

      try {
        // Copy file to new location
        copyFileSync(file.oldPath, file.newPath);
        
        // Verify the copy
        const oldSize = statSync(file.oldPath).size;
        const newSize = statSync(file.newPath).size;
        
        if (oldSize === newSize) {
          console.log(`  ✅ Migrated: ${file.name} (${(oldSize / 1024).toFixed(2)} KB)`);
          
          // Delete from old location (safe now that it's copied)
          unlinkSync(file.oldPath);
          console.log(`  🗑️  Removed from old location\n`);
          
          filesMigrated++;
        } else {
          throw new Error('File size mismatch after copy');
        }
      } catch (copyError) {
        console.error(`  ❌ Failed to migrate ${file.name}:`, copyError.message);
        errors.push({ file: file.name, error: copyError.message });
        console.log();
      }

    } else if (oldExists && newExists) {
      // File exists in both locations
      const oldSize = statSync(file.oldPath).size;
      const newSize = statSync(file.newPath).size;
      const oldMtime = statSync(file.oldPath).mtime;
      const newMtime = statSync(file.newPath).mtime;

      if (oldMtime > newMtime) {
        // Old file is newer - this might be a rollback scenario
        console.log(`  ⚠️  Warning: ${file.name} in old location is NEWER`);
        console.log(`     Old: ${oldMtime.toISOString()} (${(oldSize / 1024).toFixed(2)} KB)`);
        console.log(`     New: ${newMtime.toISOString()} (${(newSize / 1024).toFixed(2)} KB)`);
        console.log(`  ℹ️  Keeping both files - manual review recommended\n`);
        filesSkipped++;
      } else {
        // New file is newer or same - safe to delete old
        try {
          unlinkSync(file.oldPath);
          console.log(`  🗑️  Cleaned up old ${file.name} (already migrated)\n`);
        } catch (deleteError) {
          console.warn(`  ⚠️  Could not delete old ${file.name}:`, deleteError.message, '\n');
        }
      }

    } else if (!oldExists && newExists) {
      // Already migrated - all good
      const size = statSync(file.newPath).size;
      console.log(`  ✅ ${file.name}: Already in safe location (${(size / 1024).toFixed(2)} KB)`);
      filesSkipped++;

    } else {
      // File doesn't exist in either location - will be created fresh
      console.log(`  ℹ️  ${file.name}: Not found (will be created if needed)`);
      filesSkipped++;
    }

  } catch (error) {
    console.error(`  ❌ Error checking ${file.name}:`, error.message, '\n');
    errors.push({ file: file.name, error: error.message });
  }
}

// Summary
console.log('\n========================================');
console.log('  📊 Migration Summary');
console.log('========================================\n');
console.log(`  ✅ Files migrated:    ${filesMigrated}`);
console.log(`  ⏭️  Files skipped:     ${filesSkipped}`);
console.log(`  ❌ Errors:            ${errors.length}`);

if (errors.length > 0) {
  console.log('\n  ⚠️  Errors encountered:');
  errors.forEach(e => console.log(`     - ${e.file}: ${e.error}`));
}

console.log('\n========================================\n');

if (filesMigrated > 0) {
  console.log('🎉 Data migration completed successfully!');
  console.log(`📁 Your data is now safe at: ${userDataPath}`);
  console.log('✅ This data will persist across app updates.\n');
} else if (errors.length === 0) {
  console.log('✅ No migration needed - all data is in the correct location.\n');
} else {
  console.error('⚠️  Migration completed with errors. Please review the logs above.\n');
  process.exit(1);
}

// Exit successfully
process.exit(0);


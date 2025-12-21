#!/usr/bin/env node

/**
 * FTP Connection Test Script
 * 
 * Tests FTP connection to Hostinger server
 * Verifies credentials and remote path access
 */

import { Client } from 'basic-ftp';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  port: parseInt(process.env.FTP_PORT || '21'),
  secure: process.env.FTP_SECURE === 'true',
  remotePath: process.env.FTP_REMOTE_PATH || '/public_html',
};

async function testConnection() {
  console.log('\n========================================');
  console.log('  🧪 FTP Connection Test');
  console.log('========================================\n');

  // Check configuration
  console.log('📋 Configuration:');
  console.log(`   Host: ${config.host || '❌ NOT SET'}`);
  console.log(`   User: ${config.user || '❌ NOT SET'}`);
  console.log(`   Password: ${config.password ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Secure: ${config.secure ? 'FTPS' : 'FTP'}`);
  console.log(`   Remote Path: ${config.remotePath}\n`);

  // Validate
  if (!config.host || !config.user || !config.password) {
    console.error('❌ Missing required configuration. Check your .env file.\n');
    process.exit(1);
  }

  const client = new Client();
  client.ftp.verbose = true;

  try {
    // Test connection
    console.log('🔌 Testing connection...');
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
    });
    console.log('✅ Connection successful!\n');

    // Test directory access
    console.log(`📂 Testing remote directory: ${config.remotePath}`);
    try {
      await client.cd(config.remotePath);
      console.log('✅ Directory accessible!\n');

      // List contents
      console.log('📁 Directory contents:');
      const list = await client.list();
      if (list.length === 0) {
        console.log('   (empty)\n');
      } else {
        list.slice(0, 10).forEach(item => {
          const type = item.isDirectory ? '📁' : '📄';
          const size = item.isDirectory ? '' : ` (${formatSize(item.size)})`;
          console.log(`   ${type} ${item.name}${size}`);
        });
        if (list.length > 10) {
          console.log(`   ... and ${list.length - 10} more items\n`);
        } else {
          console.log();
        }
      }
    } catch (error) {
      console.error(`❌ Directory not accessible: ${error.message}\n`);
      console.log('💡 Tip: The directory will be created during deployment.\n');
    }

    // Test write permission
    console.log('🔒 Testing write permission...');
    try {
      const testFile = `.test-${Date.now()}.tmp`;
      await client.uploadFrom(Buffer.from('test'), testFile);
      await client.remove(testFile);
      console.log('✅ Write permission confirmed!\n');
    } catch (error) {
      console.error(`❌ No write permission: ${error.message}\n`);
    }

    console.log('========================================');
    console.log('  ✅ All Tests Passed!');
    console.log('========================================\n');
    console.log('🎉 Your FTP configuration is working correctly!');
    console.log('   You can now run: npm run deploy\n');

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check your .env file has correct credentials');
    console.error('   2. Verify FTP_HOST is correct (e.g., ftp.yourdomain.com)');
    console.error('   3. Check if firewall is blocking FTP port');
    console.error('   4. Try secure mode: FTP_SECURE=true in .env\n');
    process.exit(1);
  } finally {
    client.close();
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Run test
testConnection().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


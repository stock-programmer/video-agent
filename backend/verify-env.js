/**
 * Environment Variables Verification Script
 *
 * Verifies that all required environment variables and dependencies
 * are properly configured for v2.0 server operation.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

/**
 * Verify environment configuration
 */
async function verifyEnvironment() {
  console.log('========================================');
  console.log('Environment Verification for v2.0');
  console.log('========================================\n');

  const required = [
    'DASHSCOPE_API_KEY',
    'MONGODB_URI',
    'SERVER_PORT'
  ];

  const optional = [
    'GOOGLE_API_KEY',
    'OPTIMIZATION_TIMEOUT',
    'HUMAN_CONFIRMATION_TIMEOUT',
    'MAX_CONCURRENT_OPTIMIZATIONS',
    'WS_PORT',
    'VIDEO_PROVIDER',
    'LLM_PROVIDER'
  ];

  let hasErrors = false;

  // Check required variables
  console.log('========== Required Environment Variables ==========');
  for (const key of required) {
    if (process.env[key]) {
      const value = key.includes('KEY') || key.includes('PASSWORD')
        ? '***' + process.env[key].slice(-4)
        : process.env[key];
      console.log(`✅ ${key}: ${value}`);
    } else {
      console.error(`❌ ${key}: Missing (REQUIRED)`);
      hasErrors = true;
    }
  }

  // Check optional variables
  console.log('\n========== Optional Environment Variables ==========');
  for (const key of optional) {
    if (process.env[key]) {
      const value = key.includes('KEY') || key.includes('PASSWORD')
        ? '***' + process.env[key].slice(-4)
        : process.env[key];
      console.log(`✅ ${key}: ${value}`);
    } else {
      console.log(`⚠️  ${key}: Not set (will use default)`);
    }
  }

  // Check package dependencies
  console.log('\n========== Package Dependencies ==========');
  const deps = [
    '@langchain/community',
    '@langchain/core',
    'mongoose',
    'express',
    'ws',
    'winston'
  ];

  for (const dep of deps) {
    try {
      await import(dep);
      console.log(`✅ ${dep}: Installed`);
    } catch (e) {
      console.error(`❌ ${dep}: Not installed`);
      hasErrors = true;
    }
  }

  // Summary
  console.log('\n========== Summary ==========');
  if (hasErrors) {
    console.error('❌ Environment verification FAILED');
    console.error('Please fix the errors above before starting the server');
    console.error('\nTo fix missing dependencies, run:');
    console.error('  npm install');
    console.error('\nTo fix missing environment variables:');
    console.error('  1. Copy .env.example to .env');
    console.error('  2. Fill in the required values');
    process.exit(1);
  } else {
    console.log('✅ Environment verification PASSED');
    console.log('Server is ready to start');
    console.log('\nTo start the server:');
    console.log('  npm start      # Production mode');
    console.log('  npm run dev    # Development mode with auto-reload');
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyEnvironment().catch(error => {
    console.error('Verification error:', error);
    process.exit(1);
  });
}

export { verifyEnvironment };

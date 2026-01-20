/**
 * Database Index Creation Script
 *
 * Purpose: Create optimized indexes for v2.0 query patterns
 *
 * Indexes created:
 * - optimization_history.timestamp (descending) - For recent optimization queries
 * - optimization_history.user_action + createdAt - For filtering by user action
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

dotenv.config();

/**
 * Create database indexes for v2.0 optimization queries
 */
async function createIndexes() {
  logger.info('Starting database index creation...');

  try {
    // Connect to database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker';
    await mongoose.connect(uri);

    logger.info('Connected to MongoDB', {
      database: mongoose.connection.name
    });

    const db = mongoose.connection.db;
    const collection = db.collection('workspaces');

    // Get existing indexes
    const existingIndexes = await collection.indexes();
    logger.info('Existing indexes', {
      count: existingIndexes.length,
      names: existingIndexes.map(idx => idx.name)
    });

    // Define indexes to create
    const indexesToCreate = [
      {
        key: { 'optimization_history.timestamp': -1 },
        name: 'optimization_history_timestamp_-1',
        background: true,
        description: 'Query recent optimization history'
      },
      {
        key: { 'optimization_history.user_action': 1, createdAt: -1 },
        name: 'optimization_user_action_created_at',
        background: true,
        description: 'Filter by user action and creation time'
      }
    ];

    const createdIndexes = [];
    const skippedIndexes = [];

    // Create each index
    for (const indexSpec of indexesToCreate) {
      try {
        logger.info('Creating index...', {
          name: indexSpec.name,
          key: indexSpec.key,
          description: indexSpec.description
        });

        await collection.createIndex(indexSpec.key, {
          name: indexSpec.name,
          background: indexSpec.background
        });

        createdIndexes.push(indexSpec.name);
        logger.info('✅ Index created successfully', {
          name: indexSpec.name
        });

      } catch (error) {
        // Handle index already exists
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict' || error.codeName === 'IndexKeySpecsConflict') {
          skippedIndexes.push(indexSpec.name);
          logger.warn('⚠️  Index already exists (skipped)', {
            name: indexSpec.name
          });
        } else {
          logger.error('❌ Failed to create index', {
            name: indexSpec.name,
            error: error.message
          });
          throw error;
        }
      }
    }

    // Display final indexes
    const finalIndexes = await collection.indexes();
    logger.info('Final indexes', {
      count: finalIndexes.length,
      names: finalIndexes.map(idx => idx.name)
    });

    logger.info('✅ Index creation completed successfully', {
      created: createdIndexes.length,
      skipped: skippedIndexes.length,
      total: finalIndexes.length
    });

    return {
      success: true,
      createdIndexes,
      skippedIndexes,
      totalIndexes: finalIndexes.length
    };

  } catch (error) {
    logger.error('❌ Index creation failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createIndexes()
    .then((result) => {
      console.log('\n========================================');
      console.log('✅ Index Creation Completed');
      console.log('========================================');
      console.log(`Created: ${result.createdIndexes.length} indexes`);
      if (result.createdIndexes.length > 0) {
        console.log('  - ' + result.createdIndexes.join('\n  - '));
      }
      if (result.skippedIndexes.length > 0) {
        console.log(`\nSkipped: ${result.skippedIndexes.length} indexes (already exist)`);
        console.log('  - ' + result.skippedIndexes.join('\n  - '));
      }
      console.log(`\nTotal indexes: ${result.totalIndexes}`);
      console.log('========================================\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n========================================');
      console.error('❌ Index Creation Failed');
      console.error('========================================');
      console.error(`Error: ${error.message}`);
      console.error('========================================\n');
      process.exit(1);
    });
}

export { createIndexes };

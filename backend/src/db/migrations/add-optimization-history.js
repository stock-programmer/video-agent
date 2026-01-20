/**
 * Database Migration Script: Add optimization_history field
 *
 * Purpose: Add empty optimization_history array to all existing workspaces
 *
 * Note: This is optional since MongoDB schema automatically handles undefined fields,
 *       but explicitly adding it improves query consistency
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

dotenv.config();

/**
 * Execute migration to add optimization_history field
 */
async function migrateOptimizationHistory() {
  logger.info('Starting optimization_history migration...');

  try {
    // Connect to database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker';
    await mongoose.connect(uri);

    logger.info('Connected to MongoDB', {
      database: mongoose.connection.name
    });

    const db = mongoose.connection.db;
    const collection = db.collection('workspaces');

    // Count documents that need migration
    const totalCount = await collection.countDocuments({});
    const needsMigrationCount = await collection.countDocuments({
      optimization_history: { $exists: false }
    });

    logger.info('Migration statistics', {
      totalWorkspaces: totalCount,
      needsMigration: needsMigrationCount,
      alreadyMigrated: totalCount - needsMigrationCount
    });

    if (needsMigrationCount === 0) {
      logger.info('✅ No workspaces need migration - all documents already have optimization_history field');
      return {
        success: true,
        matchedCount: 0,
        modifiedCount: 0,
        message: 'No migration needed'
      };
    }

    // Execute migration
    logger.info('Executing migration...', {
      documentsToUpdate: needsMigrationCount
    });

    const result = await collection.updateMany(
      { optimization_history: { $exists: false } },
      { $set: { optimization_history: [] } }
    );

    logger.info('Migration batch completed', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });

    // Verify migration results
    const remainingCount = await collection.countDocuments({
      optimization_history: { $exists: false }
    });

    if (remainingCount > 0) {
      logger.warn('⚠️  Some documents were not migrated', {
        remainingCount,
        totalCount,
        migratedCount: result.modifiedCount
      });
      throw new Error(`Migration incomplete: ${remainingCount} documents still missing optimization_history`);
    } else {
      logger.info('✅ All documents migrated successfully', {
        totalMigrated: result.modifiedCount
      });
    }

    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      message: 'Migration completed successfully'
    };

  } catch (error) {
    logger.error('❌ Migration failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Execute migration if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateOptimizationHistory()
    .then((result) => {
      console.log('\n========================================');
      console.log('✅ Migration Completed Successfully');
      console.log('========================================');
      console.log(`Matched: ${result.matchedCount} documents`);
      console.log(`Modified: ${result.modifiedCount} documents`);
      console.log(`Message: ${result.message}`);
      console.log('========================================\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n========================================');
      console.error('❌ Migration Failed');
      console.error('========================================');
      console.error(`Error: ${error.message}`);
      console.error('========================================\n');
      process.exit(1);
    });
}

export { migrateOptimizationHistory };

/**
 * SQLite to PostgreSQL Migration Script for Salon Digital Assistant
 *
 * This script migrates all data from SQLite to PostgreSQL.
 *
 * Prerequisites:
 * 1. Install better-sqlite3 locally first:
 *    npm install better-sqlite3 @types/better-sqlite3
 * 2. PostgreSQL container must be running
 * 3. Run `npx prisma migrate deploy` first to create schema
 *
 * Usage:
 *   npm run migrate:sqlite-to-postgres
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

// SQLite database path
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../prisma/dev.db');

// PostgreSQL connection (from environment)
const postgresClient = new PrismaClient();

// Tables in order of dependencies (foreign key constraints)
const MIGRATION_ORDER = [
  // Independent tables first
  'Service',
  'Stylist',
  'AddOn',
  'BusinessConfig',
  'SupportedLanguage',
  'Department',
  'AiScript',
  'Webhook',
  'SmsConfig',
  'SmsTemplate',
  'TransferConfig',
  'TransferRoute',
  'DtmfMenu',
  'DtmfOption',
  'AiTool',
  'AiAgent',
  'LogicRule',
  'CalendarConfig',
  'CustomFunction',
  'Branding',
  'StoreInfo',
  'Features',
  'PaymentSettings',
  // Dependent tables
  'StylistAvailability',
  'StylistService',
  'KnowledgeDoc',
  'KnowledgeChunk',
  'CallLog',
  'Transcript',
  'Message',
  'IntentLog',
  'CitationsLog',
  'LanguageLog',
  'Appointment',
];

async function migrateTable(sqlite: Database.Database, tableName: string): Promise<number> {
  try {
    // Check if table exists in SQLite
    const tableExists = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).get(tableName);

    if (!tableExists) {
      console.log(`  Table ${tableName} does not exist in SQLite, skipping...`);
      return 0;
    }

    // Get all rows from SQLite
    const rows = sqlite.prepare(`SELECT * FROM "${tableName}"`).all();

    if (rows.length === 0) {
      console.log(`  Table ${tableName}: 0 rows (empty)`);
      return 0;
    }

    // Get the Prisma model name (lowercase first letter)
    const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);

    // Check if model exists in Prisma client
    const model = (postgresClient as any)[modelName];
    if (!model) {
      console.log(`  Model ${modelName} not found in Prisma client, skipping...`);
      return 0;
    }

    // Insert rows one by one (to handle any conversion issues)
    let inserted = 0;
    for (const row of rows) {
      try {
        // Convert any SQLite-specific values
        const convertedRow = convertRow(row);
        await model.create({ data: convertedRow });
        inserted++;
      } catch (err: any) {
        // If it's a unique constraint violation, the data might already exist
        if (err.code === 'P2002') {
          console.log(`    Skipping duplicate in ${tableName}: ${err.meta?.target}`);
        } else {
          console.error(`    Error inserting into ${tableName}:`, err.message);
        }
      }
    }

    console.log(`  Table ${tableName}: ${inserted}/${rows.length} rows migrated`);
    return inserted;
  } catch (err: any) {
    console.error(`  Error migrating ${tableName}:`, err.message);
    return 0;
  }
}

function convertRow(row: any): any {
  const converted: any = {};

  for (const [key, value] of Object.entries(row)) {
    // Convert SQLite integer booleans to actual booleans
    if (typeof value === 'number' && (key.startsWith('is') || key.startsWith('has') || key.includes('Enabled') || key === 'enabled' || key === 'active' || key === 'notified' || key === 'testMode' || key === 'priceVaries' || key === 'acceptingNew' || key === 'reminderSent')) {
      converted[key] = value === 1;
    }
    // Convert date strings to Date objects
    else if (typeof value === 'string' && (key.endsWith('At') || key === 'createdAt' || key === 'updatedAt' || key === 'startedAt' || key === 'endedAt' || key === 'appointmentDate' || key === 'cancelledAt')) {
      converted[key] = value ? new Date(value) : null;
    }
    // Keep null values as null
    else if (value === null) {
      converted[key] = null;
    }
    // Keep everything else as-is
    else {
      converted[key] = value;
    }
  }

  return converted;
}

async function main() {
  console.log('='.repeat(60));
  console.log('SQLite to PostgreSQL Migration - Salon Digital Assistant');
  console.log('='.repeat(60));
  console.log(`\nSQLite source: ${SQLITE_PATH}`);
  console.log(`PostgreSQL target: ${process.env.DATABASE_URL || 'from environment'}\n`);

  // Open SQLite database
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  console.log('Connected to SQLite database\n');

  // Test PostgreSQL connection
  try {
    await postgresClient.$connect();
    console.log('Connected to PostgreSQL database\n');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err);
    process.exit(1);
  }

  console.log('Starting migration...\n');

  let totalMigrated = 0;

  for (const tableName of MIGRATION_ORDER) {
    const count = await migrateTable(sqlite, tableName);
    totalMigrated += count;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Migration complete! Total rows migrated: ${totalMigrated}`);
  console.log('='.repeat(60));

  // Cleanup
  sqlite.close();
  await postgresClient.$disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

/**
 * add_indexes.js — One-time migration to add missing indexes to the SQLite DB.
 *
 * The app opens the DB in read-only mode, so this script must be run separately
 * (in write mode) to create the indexes. Safe to run multiple times (IF NOT EXISTS).
 *
 * Usage:
 *   node backend/src/scripts/add_indexes.js
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH
  ? resolve(process.env.DB_PATH)
  : resolve(__dirname, '../data/careculator.db');

console.log(`Opening DB at: ${DB_PATH}`);
const db = new Database(DB_PATH); // write mode

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_clinics_zip  ON clinics(zip);
  CREATE INDEX IF NOT EXISTS idx_plans_state  ON insurance_plans(state);
`);

db.close();
console.log('Done — indexes created (or already existed).');

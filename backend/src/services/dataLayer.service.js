import Database from 'better-sqlite3';
import { DB_PATH } from '../config/index.js';

/**
 * Singleton read-only SQLite connection shared across all models.
 *
 * better-sqlite3 is synchronous and not thread-safe, but Node.js is
 * single-threaded so a single shared connection is both safe and optimal
 * (avoids the overhead of opening/closing a connection per request).
 *
 * Pragmas are tuned for read-heavy workloads:
 *   - cache_size:  64 MB page cache keeps hot pages (clinics, service_areas)
 *                  in memory, avoiding disk I/O on repeated queries.
 *   - temp_store:  forces sort/join spill buffers into RAM instead of disk.
 *   - mmap_size:   memory-maps up to 256 MB of the DB file; the OS can then
 *                  serve sequential scans directly from the page cache.
 */

let _db = null;

export function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH, { readonly: true });

  _db.pragma('cache_size  = -65536'); // 64 MB  (negative = kibibytes)
  _db.pragma('temp_store  = MEMORY');
  _db.pragma('mmap_size   = 268435456'); // 256 MB

  return _db;
}

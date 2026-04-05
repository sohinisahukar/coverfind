import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the SQLite database file.
 * Resolved relative to this config file so it works regardless of CWD.
 */
export const DB_PATH = path.resolve(__dirname, '../../data/careculator.db');

/** Default page size for paginated endpoints. */
export const DEFAULT_PAGE_SIZE = 50;

/** Hard ceiling on page size to prevent runaway queries. */
export const MAX_PAGE_SIZE = 500;

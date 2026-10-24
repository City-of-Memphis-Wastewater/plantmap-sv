// src/lib/database/build.ts

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

export const DATABASE_PATH = join(
    homedir(),
    '.plantmap-sv',
    'db',
    'local.sqlite'
);

export interface DatabaseStatus {
    ready: boolean;
    path: string;
    error?: string;
}

/**
 * Create the parent directory when necessary.
 */
function ensureDatabaseDirectory(): void {
    mkdirSync(dirname(DATABASE_PATH), { recursive: true });
}

/**
 * Open the local SQLite database and initialize its schema.
 *
 * The caller is responsible for closing the returned connection.
 */
export function buildLocalDatabase(): DatabaseSync {
    ensureDatabaseDirectory();

    const db = new DatabaseSync(DATABASE_PATH);

    try {
        db.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA busy_timeout = 5000;

            CREATE TABLE IF NOT EXISTS sensor_readings (
                sensor_id TEXT NOT NULL,
                sampled_at INTEGER NOT NULL,
                source_timestamp TEXT,
                value REAL,
                quality TEXT,
                PRIMARY KEY (sensor_id, sampled_at)
            );

            CREATE INDEX IF NOT EXISTS idx_sensor_readings_sampled_at
                ON sensor_readings (sampled_at);
        `);

        return db;
    } catch (error) {
        db.close();
        throw error;
    }
}

/**
 * Check whether the database can be opened and queried.
 */
export function checkStatusLocalDatabase(): DatabaseStatus {
    try {
        const db = buildLocalDatabase();

        try {
            db.prepare('SELECT 1').get();
        } finally {
            db.close();
        }

        return {
            ready: true,
            path: DATABASE_PATH
        };
    } catch (error) {
        return {
            ready: false,
            path: DATABASE_PATH,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Ensure the local database exists and is initialized.
 * Initialize it only when the database file does not exist.
 */
export function ensureLocalDatabase(): DatabaseStatus {
    try {
        if (!existsSync(DATABASE_PATH)) {
            const db = buildLocalDatabase();
            db.close();
        }

        return checkStatusLocalDatabase();
    } catch (error) {
        return {
            ready: false,
            path: DATABASE_PATH,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

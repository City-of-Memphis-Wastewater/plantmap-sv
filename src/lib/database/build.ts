// src/lib/database/build.ts

import { mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
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
 * Ensure that the directory containing the database exists.
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
                timestamp INTEGER NOT NULL,
                value REAL,
                quality TEXT,
                PRIMARY KEY (sensor_id, timestamp)
            );

            CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp
                ON sensor_readings (timestamp);
        `);

        return db;
    } catch (error) {
        db.close();
        throw error;
    }
}

/**
 * Check whether the local database exists and can be opened.
 */
export function checkStatusLocalDatabase(): DatabaseStatus {
    try {
        const existed = existsSync(DATABASE_PATH);
        const db = buildLocalDatabase();

        db.prepare('SELECT 1').get();
        db.close();

        return {
            ready: true,
            path: DATABASE_PATH,
            ...(!existed ? {} : {})
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
 * Ensure that the local database is initialized.
 */
export function ensureLocalDatabase(): DatabaseStatus {
    return checkStatusLocalDatabase();
}

// src/lib/database/build.ts

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import type { DatabaseStatus } from './types.ts';

export const DATABASE_PATH = join(homedir(), '.plantmap-sv', 'db', 'local.sqlite');

/**
 * Create the parent directory when necessary.
 */
function ensureDatabaseDirectory(path: string): void {
	mkdirSync(dirname(path), { recursive: true });
}

/**
 * Open the local SQLite database and initialize its schema.
 *
 * The caller is responsible for closing the returned connection.
 */
export function buildLocalDatabase(path: string = DATABASE_PATH): DatabaseSync {
	ensureDatabaseDirectory(path);

	const db = new DatabaseSync(path);

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
 * Check whether the local database exists and is usable.
 * Does not create or initialize the database.
 */
export function checkStatusLocalDatabase(path: string = DATABASE_PATH): DatabaseStatus {
	if (!existsSync(path)) {
		return {
			ready: false,
			path: path,
			error: 'Database does not exist.'
		};
	}

	try {
		const db = new DatabaseSync(path, { readOnly: true });

		try {
			db.prepare('SELECT 1 FROM sensor_readings LIMIT 1').get();
		} finally {
			db.close();
		}

		return {
			ready: true,
			path: path
		};
	} catch (error) {
		return {
			ready: false,
			path: path,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}


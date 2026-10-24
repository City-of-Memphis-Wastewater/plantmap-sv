// src/lib/database/crud.ts

import { buildLocalDatabase } from './build.ts';

import type { CachedSensorReading, DatabasePayload, WriteConfirmation } from './types.ts';

const OVERWRITE = false;

/**
 * Persist a batch of sensor readings in one transaction.
 *
 * Existing readings at the same sensor ID and sampling timestamp
 * are replaced, making retries safe.
 */
export function cacheToLocalDatabase(payload: DatabasePayload[]): WriteConfirmation {
	if (payload.length === 0) {
		return {
			written: 0,
			sampledAt: Math.floor(Date.now() / 1000)
		};
	}

	const sampledAt = payload[0].sampledAt;

	if (payload.some((reading) => reading.sampledAt !== sampledAt)) {
		throw new Error('All readings in a database batch must share the same sampledAt timestamp.');
	}

	const db = buildLocalDatabase();

	try {
		const insert = db.prepare(`
            INSERT INTO sensor_readings (
                sensor_id,
                sampled_at,
                source_timestamp,
                value,
                quality
            )
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (sensor_id, sampled_at)
            DO UPDATE SET
                source_timestamp = excluded.source_timestamp,
                value = excluded.value,
                quality = excluded.quality
        `);

		db.exec('BEGIN');

		try {
			for (const reading of payload) {
				insert.run(
					reading.sensorId,
					reading.sampledAt,
					reading.sourceTimestamp,
					reading.value,
					reading.quality
				);
			}

			db.exec('COMMIT');
		} catch (error) {
			db.exec('ROLLBACK');
			throw error;
		}

		return {
			written: payload.length,
			sampledAt
		};
	} finally {
		db.close();
	}
}

/**
 * Read cached readings for one sensor between two sampling timestamps.
 *
 * Both bounds are Unix seconds and inclusive.
 */
export function readCachedSensorReadings(
	sensorId: string,
	from: number,
	to: number
): CachedSensorReading[] {
	if (from > to) {
		throw new Error('"from" must be less than or equal to "to".');
	}

	const db = buildLocalDatabase();

	try {
		const rows = db
			.prepare(
				`
            SELECT
                sensor_id AS sensorId,
                sampled_at AS sampledAt,
                source_timestamp AS sourceTimestamp,
                value,
                quality
            FROM sensor_readings
            WHERE sensor_id = ?
              AND sampled_at >= ?
              AND sampled_at <= ?
            ORDER BY sampled_at ASC
        `
			)
			.all(sensorId, from, to);

		return rows as unknown as CachedSensorReading[];
	} finally {
		db.close();
	}
}

/**
 * Read the most recent cached readings for one sensor.
 */
export function readLatestCachedSensorReadings(
	sensorId: string,
	limit = 192
): CachedSensorReading[] {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('"limit" must be a positive integer.');
	}

	const db = buildLocalDatabase();

	try {
		const rows = db
			.prepare(
				`
            SELECT
                sensor_id AS sensorId,
                sampled_at AS sampledAt,
                source_timestamp AS sourceTimestamp,
                value,
                quality
            FROM sensor_readings
            WHERE sensor_id = ?
            ORDER BY sampled_at DESC
            LIMIT ?
        `
			)
			.all(sensorId, limit);

		return (rows as unknown as CachedSensorReading[]).reverse();
	} finally {
		db.close();
	}
}

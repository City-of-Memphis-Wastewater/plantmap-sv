// src/lib/database/crud.ts

import { buildLocalDatabase } from './build.ts';

import type { CachedSensorReading, DatabasePayload, WriteConfirmation } from './types.ts';


/**
 * Persist a batch of sensor readings in one transaction.
 *
 * Existing readings at the same sensor ID and sampling timestamp
 * are replaced, making retries safe.
 */

export function writeSensorReadings(
  payload: DatabasePayload[],
  databasePath?: string
): WriteConfirmation {
  if (payload.length === 0) {
    return {
      written: 0,
      databaseTimestamp: null
    };
  }

  const databaseTimestamp = payload[0].databaseTimestamp;

  const db = buildLocalDatabase(databasePath);
  let written = 0;

  try {
    const insert = db.prepare(`
      INSERT INTO sensor_readings (
        sensor_id,
        sampled_at,
        source_timestamp,
        database_timestamp,
        value,
        quality
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (sensor_id, database_timestamp) DO NOTHING
    `);

    db.exec('BEGIN IMMEDIATE');

    try {
      for (const reading of payload) {
        const result = insert.run(
          reading.sensorId,
          reading.sampledAt,
          reading.sourceTimestamp,
          reading.databaseTimestamp,
          reading.value,
          reading.quality
        );

        written += Number(result.changes);
      }

      db.exec('COMMIT');
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Preserve the original error.
      }

      throw error;
    }

    return { written, databaseTimestamp };
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
	to: number,
    databasePath?: string
): CachedSensorReading[] {
	if (from > to) {
		throw new Error('"from" must be less than or equal to "to".');
	}

	const db = buildLocalDatabase(databasePath);

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
	limit = 192,
	databasePath?: string
): CachedSensorReading[] {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('"limit" must be a positive integer.');
	}

	const db = buildLocalDatabase(databasePath);

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

		// The SQL query fetches the newest readings first. Return them
		// oldest-to-newest, which is more convenient for plotting.
		return (rows as unknown as CachedSensorReading[]).reverse();
	} finally {
		db.close();
	}
}

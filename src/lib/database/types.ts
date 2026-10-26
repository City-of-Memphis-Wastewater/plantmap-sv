// src/lib/database/types.ts

import type { EdsPointTelemetry } from '$lib/server/eds/types';

/**
 * One sensor reading selected for persistence.
 *
 * The EDS point provides the value, quality, and source timestamp.
 * PlantMap supplies the map sensor ID and sampling timestamp.
 */

export interface DatabasePayload {
  sensorId: string;
  sampledAt: number;              // Local retrieval time, Unix secondst
  sourceTimestamp: string | null; // Original EDS timestamp
  databaseTimestamp: number;      // Canonical n-minute (n=15, or other) window start.
  value: number | null;
  quality: string | null;
}

/**
 * Status of the local SQLite database.
 */
export interface DatabaseStatus {
	ready: boolean;
	path: string;
	error?: string;
}

/**
 * Result of attempting to persist a batch of sensor readings.
 */
export interface WriteConfirmation {
	written: number;
	databaseTimestamp: number | null;
}


export interface CachedSensorReading {
    sensorId: string;
    sampledAt: number;
    sourceTimestamp: string | null;
    databaseTimestamp: number | null;
    value: number | null;
    quality: string | null;
}

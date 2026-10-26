// src/lib/database/types.ts

import type { EdsPointTelemetry } from '$lib/server/eds/types';

/**
 * One sensor reading selected for persistence.
 *
 * The EDS point provides the value, quality, and source timestamp.
 * PlantMap supplies the map sensor ID and sampling timestamp.
 */
export interface DatabasePayloadDefunct {
	sensorId: string;
	sampledAt: number;
	sourceTimestamp: EdsPointTelemetry['timestamp'];
	value: EdsPointTelemetry['value'];
	quality: EdsPointTelemetry['quality'];
}

export interface DatabasePayload {
  sensorId: string;
  sampledAt: number;              // Canonical n-minute (n=15, or other) window start
  sourceTimestamp: string | null; // Original EDS timestamp
  readAt: number;                 // Local retrieval time, Unix seconds
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
	sampledAt: number;
}

/**
 * A reading retrieved from the local database.
 */
export interface CachedSensorReading {
	sensorId: string;
	sampledAt: number;
	sourceTimestamp: string | null;
	value: number | null;
	quality: string | null;
}

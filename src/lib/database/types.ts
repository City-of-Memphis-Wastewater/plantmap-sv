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
	sampledAt: number;
	sourceTimestamp: EdsPointTelemetry['timestamp'];
	value: EdsPointTelemetry['value'];
	quality: EdsPointTelemetry['quality'];
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



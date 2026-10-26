import type { EdsPointTelemetry } from '$lib/server/eds/types';
import type { SensorNode } from '$lib/telemetry/types';
import type { DatabasePayload } from '$lib/database/types';
import { getDatabaseTimestamp } from '$lib/database/time';
import { writeSensorReadings } from '$lib/database/index';

export function buildPersistencePayload(
	sensorMap: Record<string, SensorNode>,
	liveData: Record<string, EdsPointTelemetry>,
	iessSuffix: string,
	databaseTimestamp: number
): DatabasePayload[] {
	const payload: DatabasePayload[] = [];

	for (const [sensorId] of Object.entries(sensorMap)) {
		const point = liveData[`${sensorId}${iessSuffix}`];

		if (!point || point.timestamp == null) {
			continue;
		}

		const milliseconds = Date.parse(point.timestamp);

		if (!Number.isFinite(milliseconds)) {
			continue;
		}

		payload.push({
			sensorId,
			sampledAt: Math.floor(milliseconds / 1000),
			sourceTimestamp: point.timestamp,
			databaseTimestamp,
			value: point.value,
			quality: point.quality
		});
	}

	return payload;
}

export type PersistenceResult =
	| { persisted: true; databaseTimestamp: number; written: number }
	| { persisted: false; databaseTimestamp: number; reason: 'already-empty' };

export function persistBatch(
	sensorMap: Record<string, SensorNode>,
	liveData: Record<string, EdsPointTelemetry>,
	iessSuffix: string,
	databaseTimestamp: number = getDatabaseTimestamp()
): PersistenceResult {
	const payload = buildPersistencePayload(sensorMap, liveData, iessSuffix, databaseTimestamp);

	if (payload.length === 0) {
		return {
			persisted: false,
			databaseTimestamp,
			reason: 'already-empty'
		};
	}

	const confirmation = writeSensorReadings(payload);

	return {
		persisted: true,
		databaseTimestamp,
		written: confirmation.written
	};
}

import { VALID_MINUTE_INT_LIST } from '$lib/database/index';
import type { EdsPointTelemetry } from '$lib/server/eds/types';
import type { SensorNode } from '$lib/telemetry/types';
import type { DatabasePayload } from '$lib/database/types';

// You must unpack each point to ensure what the timestamp is and if you want to keep it.

export function buildPersistencePayload(
    sensorMap: Record<string, SensorNode>,
    liveData: Record<string, EdsPointTelemetry>,
    iessSuffix: string
): DatabasePayload[] {
    const payload: DatabasePayload[] = [];

    for (const [sensorId] of Object.entries(sensorMap)) {
        const point = liveData[`${sensorId}${iessSuffix}`];

        if (!point?.timestamp) {
            continue;
        }

        const milliseconds = Date.parse(point.timestamp);

        if (!Number.isFinite(milliseconds)) {
            continue;
        }

        const date = new Date(milliseconds);
        const minute = date.getUTCMinutes();

        if (!VALID_MINUTE_INT_LIST.includes(minute as 0 | 15 | 30 | 45)) {
            continue;
        }

        payload.push({
            sensorId,
            sampledAt: Math.floor(milliseconds / 1000),
            sourceTimestamp: point.timestamp,
            value: point.value,
            quality: point.quality
        });
    }

    return payload;
}

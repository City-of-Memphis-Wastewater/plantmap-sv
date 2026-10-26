import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readCachedSensorReadings } from '$lib/database';

const HISTORY_SECONDS = 48 * 60 * 60;

export const GET: RequestHandler = ({ url }) => {
    const sensorId = url.searchParams.get('sensorId')?.trim();

    if (!sensorId) {
        return json({ error: 'Provide a sensorId.' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const from = now - HISTORY_SECONDS;

    try {
        const readings = readCachedSensorReadings(sensorId, from, now);

        return json(
            {
                sensorId,
                from,
                to: now,
                readings: readings.map((reading) => ({
                    sampledAt: reading.sampledAt,
                    databaseTimestamp: reading.databaseTimestamp,
                    value: reading.value,
                    quality: reading.quality
                }))
            },
            {
                headers: {
                    'Cache-Control': 'no-store'
                }
            }
        );
    } catch (error) {
        console.error('[API /api/telemetry-history] Database read failed:', error);

        return json(
            {
                error: 'Could not read cached telemetry history.',
                detail: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
};

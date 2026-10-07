// src/routes/api/telemetry-live/+server.ts
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import type { SensorNode } from '$lib/stores/telemetry.svelte';

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getEdsClient } from '$lib/server/eds/factory';

function loadSensorMap(): Record<string, SensorNode> {
	const configPath = resolve(process.cwd(), 'static/config/sensors.json');

	if (!existsSync(configPath)) {
		return {};
	}

	const raw = readFileSync(configPath, 'utf-8');
	const parsed = JSON.parse(raw);

	if (Array.isArray(parsed)) {
		return Object.fromEntries(parsed.map((sensor: SensorNode) => [sensor.id, sensor]));
	}

	return parsed;
}


export const GET: RequestHandler = async () => {
	console.log('[API /telemetry-live] GET called');
	let sensorMap: Record<string, SensorNode>;

	try {
		sensorMap = loadSensorMap();
	} catch (error) {
		console.error('[API /telemetry-live] Failed reading sensors.json:', error);

		return json({
			success: false,
			error: 'Failed to read sensor configuration',
			sensors: []
		});
	}

	const sensorIds = Object.keys(sensorMap);

	if (sensorIds.length === 0) {
		return json({
			success: true,
			timestamp: new Date().toISOString(),
			sensors: []
		});
	}

    const client = getEdsClient();
    
	try {
		const liveData = await client.points.getRegex(sensorIds);

		console.log('[API /telemetry-live] AFTER getRegex');
		console.log('[API /telemetry-live] getRegex result', {
			requested: sensorIds.length,
			returned: Object.keys(liveData).length,
			ids: Object.keys(liveData)
		});

		const sensors = Object.entries(sensorMap).map(([id, config]) => {
			const point = liveData[`${id}${client.iessSuffix}`];

			return {
				...config,
				//value: point?.value ?? null,
				value: point?.value != null ? Number(point.value.toFixed(config.precision ?? 2)) : null,
				status: point?.quality === 'QUALITY-GOOD' ? 'normal' : 'warning'
			};
		});

		console.log('[API /telemetry-live] sensors mapped', {
			count: sensors.length,
			sensors
		});

		return json({
			success: true,
			timestamp: new Date().toISOString(),
			sensors
		});
	} catch (error) {
		console.warn(
			'[API /telemetry-live] EDS SOAP endpoint unreachable. ' +
				'Serving fallback configuration values:',
			error instanceof Error ? error.message : error
		);

		const fallbackSensors = Object.values(sensorMap).map((config) => ({
			...config,
			value: config.value ?? 0,
			status: config.status ?? 'normal'
		}));

		return json({
			success: true,
			degraded: true,
			warning: 'Ovation EDS endpoint unreachable',
			timestamp: new Date().toISOString(),
			sensors: fallbackSensors
		});
	}
};

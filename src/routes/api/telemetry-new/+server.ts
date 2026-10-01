// src/routes/api/telemetry-new/+server.ts
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { ClientEdsSoap } from '$lib/server/eds/client-new';

interface SensorConfig {
	id: string;
	name?: string;
	lat: number;
	lon: number;
	altitude?: number;
	value?: number;
	unit: string;
	status?: 'normal' | 'warning' | 'alarm';
}

function loadSensorMap(): Record<string, SensorConfig> {
	const configPath = resolve(
		process.cwd(),
		'static/config/sensors.json'
	);

	if (!existsSync(configPath)) {
		return {};
	}

	const raw = readFileSync(configPath, 'utf-8');
	const parsed = JSON.parse(raw);

	if (Array.isArray(parsed)) {
		return Object.fromEntries(
			parsed.map((sensor: SensorConfig) => [
				sensor.id,
				sensor
			])
		);
	}

	return parsed;
}

export const GET: RequestHandler = async () => {
	let sensorMap: Record<string, SensorConfig> = {};

	try {
		sensorMap = loadSensorMap();
	} catch (error) {
		console.error(
			'[API /telemetry-new] Failed reading sensors.json:',
			error
		);

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

	const client = new ClientEdsSoap();

	try {
		console.log(
			'[API /telemetry-new] Fetching EDS points:',
			sensorIds
		);

		const liveData =
			await client.points.getByIdcsList(
				sensorIds
			);

		console.log(
			'[API /telemetry-new] AFTER getByIdcsList'
		);

		console.log(
			'[API /telemetry-new] Requested sensor IDs:',
			sensorIds
		);

		console.log(
			'[API /telemetry-new] Returned live-data keys:',
			Object.keys(liveData)
		);

		const sensors = Object.entries(sensorMap).map(
			([id, config]) => {
				const point = liveData[id];
				

				
				return {
					...config,
					value:
						point?.value ??
						config.value ??
						0,
					status:
						point?.quality === 'QUALITY-GOOD'
							? 'normal'
							: 'warning'
				};
			}
		);

		return json({
			success: true,
			timestamp: new Date().toISOString(),
			sensors
		});
	} catch (error) {
		console.warn(
			'[API /telemetry-new] EDS SOAP endpoint unreachable. ' +
				'Serving fallback configuration values:',
			error instanceof Error
				? error.message
				: error
		);

		const fallbackSensors = Object.entries(
			sensorMap
		).map(([id, config]) => ({
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
	} finally {
		console.log('[API /telemetry-new] Logging out of EDS...');

		try {
			await client.auth.logout();

			console.log(
				'[API /telemetry-new] EDS logout complete'
			);
		} catch (error) {
			console.error(
				'[API /telemetry-new] EDS logout failed:',
				error
			);
		}
	}
};

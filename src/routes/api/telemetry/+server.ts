import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
//import { ClientEdsSoap } from '$lib/server/eds/client';
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
	const configPath = resolve(process.cwd(), 'static/config/sensors.json');

	if (!existsSync(configPath)) {
		return {};
	}

	const raw = readFileSync(configPath, 'utf-8');
	const parsed = JSON.parse(raw);

	if (Array.isArray(parsed)) {
		return Object.fromEntries(parsed.map((s) => [s.id, s]));
	}
	return parsed;
}

const edsClient = new ClientEdsSoap();

export const GET: RequestHandler = async () => {
	let sensorMap: Record<string, SensorConfig> = {};

	try {
		sensorMap = loadSensorMap();
	} catch (err) {
		console.error('[API /telemetry] Failed reading sensors.json:', err);
		return json({ success: false, error: 'Failed to read sensor configuration', sensors: [] });
	}

	const sensorIds = Object.keys(sensorMap);
	if (sensorIds.length === 0) {
		return json({ success: true, timestamp: new Date().toISOString(), sensors: [] });
	}

	try {
		// Native TypeScript SOAP execution
		//const liveData = await edsClient.getPointsByIdcsListParsed(sensorIds);
		const liveData = await edsClient.getRegex(sensorIds);	

		const sensors = Object.entries(sensorMap).map(([id, config]) => ({
			...config,
			value: liveData[id]?.value ?? config.value ?? 0,
			status: liveData[id]?.quality === 'GOOD' ? 'normal' : 'warning'
		}));

		return json({
			success: true,
			timestamp: new Date().toISOString(),
			sensors
		});
	} catch (err) {
		console.warn('[API /telemetry] EDS SOAP endpoint unreachable. Serving fallback configuration values:', (err as Error).message);

		// Fallback safely to static sensors.json configuration so the UI never crashes
		const fallbackSensors = Object.entries(sensorMap).map(([id, config]) => ({
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

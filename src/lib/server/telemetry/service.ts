// src/lib/server/telemetry/service.ts 

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { getEdsClient } from '$lib/server/eds/factory';
import {
	VALID_MINUTE_INT_LIST,
	cacheToLocalDatabase,
	ensureLocalDatabase
} from '$lib/database/index';

import type { SensorNode, TelemetrySnapshot } from '$lib/telemetry/types';
import type { DatabasePayload } from '$lib/database/types';

type Subscriber = (snapshot: TelemetrySnapshot) => void;

class TelemetryService {
	private snapshot: TelemetrySnapshot = {
		success: true,
		timestamp: new Date(0).toISOString(),
		sensors: []
	};

	private timer: ReturnType<typeof setTimeout> | null = null;
	private polling = false;
	private subscribers = new Set<Subscriber>();
	private loadSensorMap(): Record<string, SensorNode> {
		const configPath = resolve(process.cwd(), 'static/config/sensors.json');

		if (!existsSync(configPath)) {
			throw new Error(`Sensor configuration not found: ${configPath}`);
		}

		let parsed: unknown;

		try {
			parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
		} catch (error) {
			throw new Error(
				`Unable to parse sensor configuration at ${configPath}: ${
					error instanceof Error ? error.message : String(error)
				}`,
				{ cause: error }
			);
		}

		if (Array.isArray(parsed)) {
			return Object.fromEntries(parsed.map((sensor: SensorNode) => [sensor.id, sensor]));
		}

		if (parsed === null || typeof parsed !== 'object') {
			throw new Error(`Invalid sensor configuration format: ${configPath}`);
		}

		return parsed as Record<string, SensorNode>;
	}

	/**
	 * Return the configured fallback values without modifying them.
	 */
	private buildFallbackSensors(sensorMap: Record<string, SensorNode>): SensorNode[] {
		return Object.values(sensorMap).map((sensor) => ({
			...sensor
		}));
	}

	private async poll(): Promise<void> {
		// Configuration errors are reported by pollLoop instead of being
		// mistaken for an EDS connection failure.
		const sensorMap = this.loadSensorMap();
		const sensorIds = Object.keys(sensorMap);

		if (sensorIds.length === 0) {
			this.snapshot = {
				success: true,
				timestamp: new Date().toISOString(),
				sensors: []
			};

			this.broadcast();
			return;
		}

		const fallbackSensors = this.buildFallbackSensors(sensorMap);

		try {
			const client = getEdsClient();
			const liveData = await client.points.getRegex(sensorIds);
            const timestamp = new Date().toISOString()
            console.info('[TelemetryService] Script calculated time:',  timestamp);
            console.info('[TelemetryService] Onward');
            
            const sensors: SensorNode[] = Object.entries(sensorMap).map(([id, config]) => {
				const point = liveData[`${id}${client.iessSuffix}`];

				// Ignore quality for now. Only a missing point or value
				// should result in a placeholder.
				if (point?.value == null) {
					return {
						...config,
						value: '-',
						status: 'warning'
					};
				}

				const precision = config.precision ?? 2;

				return {
					...config,
					value: Number(point.value.toFixed(precision)),
					status: 'normal'
				};
			});

			this.snapshot = {
				success: true,
				timestamp: new Date().toISOString(),
				sensors
			};

			this.broadcast();
		} catch (error) {
			console.warn(
				'[TelemetryService] EDS SOAP endpoint unreachable:',
				error instanceof Error ? error.message : error
			);

			this.snapshot = {
				success: true,
				degraded: true,
				warning: 'Ovation EDS endpoint unreachable',
				timestamp: new Date().toISOString(),
				sensors: fallbackSensors
			};

			this.broadcast();
		}
	}

	private async pollLoop(): Promise<void> {
		if (!this.polling) {
			return;
		}

		try {
			await this.poll();
		} catch (error) {
			console.error('[TelemetryService] Poll failed:', error);
		}

		if (!this.polling) {
			return;
		}

		this.timer = setTimeout(() => {
			void this.pollLoop();
		}, 2000);
	}

	private broadcast(): void {
		for (const subscriber of this.subscribers) {
			try {
				subscriber(this.snapshot);
			} catch (error) {
				console.error('[TelemetryService] Subscriber failed:', error);
			}
		}
	}

	startPolling(): void {
		if (this.polling) {
			return;
		}

		this.polling = true;
		void this.pollLoop();
	}

	subscribe(subscriber: Subscriber): () => void {
		this.subscribers.add(subscriber);

		return () => {
			this.subscribers.delete(subscriber);
		};
	}

	getLatest(): TelemetrySnapshot {
		return this.snapshot;
	}

	stopPolling(): void {
		this.polling = false;

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}

export const telemetryService = new TelemetryService();

// Polling is started explicitly by the application lifecycle.

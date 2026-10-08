// src/lib/server/telemetry/service.ts

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { SensorNode, TelemetrySnapshot } from '$lib/telemetry/types';

import { getEdsClient } from '$lib/server/eds/factory';

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
			return {};
		}

		const raw = readFileSync(configPath, 'utf-8');
		const parsed = JSON.parse(raw);

		if (Array.isArray(parsed)) {
			return Object.fromEntries(parsed.map((sensor: SensorNode) => [sensor.id, sensor]));
		}

		return parsed;
	}

	private async poll(): Promise<void> {
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

		try {
			const client = getEdsClient();
			const liveData = await client.points.getRegex(sensorIds);

			const sensors: SensorNode[] = Object.entries(sensorMap).map(([id, config]) => {
				const point = liveData[`${id}${client.iessSuffix}`];

				return {
					...config,
					value: point?.value != null ? Number(point.value.toFixed(config.precision ?? 2)) : null,
					status: point?.quality === 'QUALITY-GOOD' ? 'normal' : 'warning'
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
				sensors: this.snapshot.sensors
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
			subscriber(this.snapshot);
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

// telemetryService.startPolling(); // always on

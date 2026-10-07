// src/lib/stores/telemetry-client.svelte.ts
import type { TelemetrySnapshot, SensorNode } from '$lib/telemetry/types';

class TelemetryStore {
	sensors = $state<Record<string, SensorNode>>({});
	isPolling = $state(false);
	isDegraded = $state(true);
	error = $state<string | null>(null);

	private eventSource: EventSource | null = null;

	start() {
		if (this.eventSource) return;

		console.log('[TelemetryStore] CONNECTING');

		this.isPolling = true;
		this.error = null;

		const eventSource = new EventSource('/api/telemetry-live/stream');
		this.eventSource = eventSource;

		eventSource.onopen = () => {
			console.log('[TelemetryStore] CONNECTED');
			this.error = null;
		};

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as TelemetrySnapshot;

				if (!data.success) {
					this.isDegraded = true;
					this.error = data.warning ?? 'Telemetry service error';
					return;
				}

				this.isDegraded = data.degraded ?? false;
				this.error = data.warning ?? null;

				if (Array.isArray(data.sensors)) {
					this.sensors = Object.fromEntries(data.sensors.map((sensor) => [sensor.id, sensor]));
				}
			} catch (error) {
				this.isDegraded = true;
				this.error = 'Invalid telemetry response';

				console.error('[TelemetryStore] Failed to parse telemetry:', error);
			}
		};

		eventSource.onerror = () => {
			this.isDegraded = true;
			this.error = 'Telemetry connection lost';

			console.warn('[TelemetryStore] CONNECTION ERROR');
		};
	}

	stop() {
		console.log('[TelemetryStore] DISCONNECTING');

		this.eventSource?.close();
		this.eventSource = null;
		this.isPolling = false;
	}
}

export const telemetryStore = new TelemetryStore();

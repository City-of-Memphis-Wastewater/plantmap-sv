// src/lib/stores/telementry.svelte.ts
export interface SensorNode {
	id: string;
	name: string;
	lat: number;
	lon: number;
	altitude?: number;
	value: number;
	unit: string;
	status: 'normal' | 'warning' | 'alarm';
}

class TelemetryStore {
	sensors = $state<Record<string, SensorNode>>({});
	isLoaded = $state(false);
	isPolling = $state(false);

	// Start degraded until a real telemetry request succeeds.
	isDegraded = $state(true);

	error = $state<string | null>(null);

	private timer: ReturnType<typeof setInterval> | null = null;

	async init(configUrl = '/config/sensors.json') {
		try {
			const response = await fetch(configUrl);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();

			if (Array.isArray(data)) {
				this.sensors = Object.fromEntries(data.map((s) => [s.id, s]));
			} else {
				this.sensors = data;
			}

			this.isLoaded = true;
		} catch (err) {
			this.error = `Failed to load config: ${(err as Error).message}`;
			console.error('[TelemetryStore] Initialization error:', err);
		}
	}

	updateSensor(
		id: string,
		value: number,
		status: SensorNode['status'] = 'normal'
	) {
		if (this.sensors[id]) {
			this.sensors[id].value = value;
			this.sensors[id].status = status;
		}
	}

	async fetchTelemetry() {
		try {
			//const res = await fetch('/api/telemetry');
			const res = await fetch('/api/telemetry-new');
			const data = await res.json();

			if (!res.ok || !data.success) {
				this.isDegraded = true;
				this.error =
					data.warning ||
					data.error ||
					`Server error (${res.status})`;
			} else {
				// This is the only condition that declares the
				// telemetry connection ONLINE.
				this.isDegraded = false;
				this.error = null;
			}

			// Merge live or fallback data into the active store.
			if (data.sensors && Array.isArray(data.sensors)) {
				for (const sensor of data.sensors) {
					if (this.sensors[sensor.id]) {
						this.sensors[sensor.id].value = sensor.value;
						this.sensors[sensor.id].status =
							sensor.status ?? 'normal';
					} else {
						this.sensors[sensor.id] = sensor;
					}
				}
			}
		} catch (err) {
			this.isDegraded = true;
			this.error = `Connection offline: ${(err as Error).message}`;

			console.warn(
				'[TelemetryStore] Network fetch failed:',
				err
			);
		}
	}

	startPolling(intervalMs = 10000) {
		if (this.isPolling) return;

		this.isPolling = true;

		if (!this.isLoaded) {
			this.init().then(() => this.fetchTelemetry());
		} else {
			this.fetchTelemetry();
		}

		this.timer = setInterval(() => {
			this.fetchTelemetry();
		}, intervalMs);
	}

	stopPolling() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}

		this.isPolling = false;
	}
}

export const telemetryStore = new TelemetryStore();

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

	/**
	 * Loads initial sensor definitions from an external configuration endpoint or JSON file.
	 * Config URL can be overridden via parameter or environment variable.
	 */
	async init(configUrl = '/config/sensors.json') {
		try {
			const response = await fetch(configUrl);
			if (!response.ok) {
				throw new Error(`Failed to load sensor definitions: ${response.statusText}`);
			}
			const data: Record<string, SensorNode> = await response.json();
			this.sensors = data;
			this.isLoaded = true;
		} catch (err) {
			console.error('Error initializing telemetry store:', err);
		}
	}

	// Method to update values from WebSocket / SCADA telemetry payloads
	updateSensor(id: string, value: number, status: SensorNode['status'] = 'normal') {
		if (this.sensors[id]) {
			this.sensors[id].value = value;
			this.sensors[id].status = status;
		}
	}
}

export const telemetry = new TelemetryStore();

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
	sensors = $state<Record<string, SensorNode>>({
		'SWG-100': {
			id: 'SWG-100',
			name: 'SWG 100 Biogas Analyzer',
			lat: 35.0256,
			lon: -90.0908,
			value: 450,
			unit: 'ppm H2S',
			status: 'normal'
		},
		'BIOREM-01': {
			id: 'BIOREM-01',
			name: 'BioRem Scrubber Stage 1',
			lat: 35.0261,
			lon: -90.0912,
			value: 12.4,
			unit: 'in. w.c.',
			status: 'normal'
		}
	});

	// Method to update values from WebSocket / API payload
	updateSensor(id: string, value: number, status: SensorNode['status'] = 'normal') {
		if (this.sensors[id]) {
			this.sensors[id].value = value;
			this.sensors[id].status = status;
		}
	}
}

export const telemetry = new TelemetryStore();

// src/lib/telemetry/types.ts

export interface SensorNode {
	id: string;
	name: string;
	lat: number;
	lon: number;
	altitude?: number;
	value: number | null;
	unit?: string;
	precision?: number;
	status: 'normal' | 'warning' | 'alarm' | 'missing';
}

export interface TelemetrySnapshot {
	success: boolean;
	degraded?: boolean;
	warning?: string;
	timestamp: string;
	sensors: SensorNode[];
}

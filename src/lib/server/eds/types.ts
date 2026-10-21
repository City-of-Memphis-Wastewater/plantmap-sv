export interface PointFilter {
	iessRe?: string;
}

export interface TabularPeriod {
	from: string; // ISO string or Ovation formatted timestamp
	till: string;
}

export interface EDSTelemetryValue {
	iessTag: string;
	value: number | null;
	quality: string;
	timestamp: string | null;
}

/** One series of historical samples for a sensor. */
export type EDSTelemetrySeries = Record<string, EDSTelemetryValue[]>;

export interface EdsPointTelemetry {
	sid: string;
	iess: string;
	idcs: string;
	description: string;
	units: string;
	value: number | null;
	quality: string;
	timestamp: string | null;
}

export interface EDSClientOptions {
	endpoint: string;
	username: string;
	password: string;
	iessSuffix: string;
	timeoutMs?: number;
	debug?: boolean;
}

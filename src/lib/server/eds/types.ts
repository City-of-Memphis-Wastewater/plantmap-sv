export interface PointFilter {
	iessRe?: string;
}

export interface TabularPeriod {
	from: string; // ISO string or Ovation formatted timestamp
	till: string;
}

export interface EDSTelemetryValue {
	iessTag: string;
	value: number;
	quality: string;
	timestamp: string;
}

export interface EdsPointTelemetry {
	sid: string;
	iess: string;
	idcs: string;
	description: string;
	units: string;
	value: number;
	quality: string;
	timestamp: string;
}

export interface EDSClientOptions {
	wsdlUrl?: string;
	endpoint?: string;
	username?: string;
	password?: string;
	iessSuffix?: string;
	timeoutMs?: number;
	debug?: boolean;
}

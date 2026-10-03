// src/lib/server/eds/client.ts

import { Auth } from './auth';
import { Points } from './requests/points';
import { Tabular } from './requests/tabular';

import type { EDSClientOptions, EdsPointTelemetry } from './types';

export class ClientEdsSoap {
	public readonly endpoint?: string;
	public readonly iessSuffix: string;
	public readonly timeoutMs: number;
	public readonly username?: string;
	public readonly password?: string;
	public readonly debug: boolean;

	public readonly auth: Auth;
	public readonly points: Points;
	public readonly tabular: Tabular;

	constructor(options: EDSClientOptions) {
		this.endpoint = options.endpoint;
		this.iessSuffix = options.iessSuffix ?? '.UNIT0@NET0';
		this.timeoutMs = options.timeoutMs ?? 1000;
		this.username = options.username;
		this.password = options.password;
		this.debug = options.debug ?? false;
		this.auth = new Auth(this);
		this.points = new Points(this);
		this.tabular = new Tabular(this);
		
		this.log('==========================================================================');
		this.log('Client initialized', {
			endpoint: this.endpoint,
			iessSuffix: this.iessSuffix,
			timeoutMs: this.timeoutMs,
			username: this.username ? '<configured>' : '<anonymous>',
			debug: this.debug
			
		});
	}

	public log(label: string, data?: unknown): void {
		if (!this.debug) {
			return;
		}

		if (data === undefined) {
			console.log(`[EDS DEBUG] ${label}`);
			return;
		}

		console.log(
			`[EDS DEBUG] ${label}:`,
			typeof data === 'string' ? data : JSON.stringify(data, null, 2)
		);
	}

	/**
	 * Convenience API for callers that want all point data in one call.
	 *
	 * The actual SOAP request and parsing remain owned by Points.
	 */
	public async getRegex(idcsTags: string[]): Promise<Record<string, EdsPointTelemetry>> {
		return this.points.getRegex(idcsTags);
	}

	/**
	 * Convenience API matching the old client's fetchTabularValues().
	 */
	public async fetchTabularValues(
		sensorIds: string[],
		windowSeconds: number = 600,
		stepSeconds: number = 60,
		functionType: string = 'AVG'
	) {
		return this.tabular.fetch(sensorIds, windowSeconds, stepSeconds, functionType);
	}

	public async logout(): Promise<void> {
		return this.auth.logout();
	}
}

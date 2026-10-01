import { env } from '$env/dynamic/private';

import { Auth } from './auth';
import { Points } from './requests/points';
import { Tabular } from './requests/tabular';

import type { EDSClientOptions } from './types';

export class ClientEdsSoap {
	public readonly endpoint: string;
	public readonly iessSuffix: string;
	public readonly timeoutMs: number;
	public readonly username?: string;
	public readonly password?: string;
	public readonly debug: boolean;

	public readonly auth: Auth;
	public readonly points: Points;
	public readonly tabular: Tabular;

	constructor(options: EDSClientOptions = {}) {
		this.endpoint =
			options.endpoint ??
			env.OVATION_EDS_ENDPOINT ??
			'http://000.00.0.000:00000';

		this.iessSuffix = options.iessSuffix ?? '.UNIT0@NET0';

		this.timeoutMs = options.timeoutMs ?? 10000;

		this.username =
			options.username ??
			env.OVATION_EDS_USER;

		this.password =
			options.password ??
			env.OVATION_EDS_PASSWORD;

		this.debug =
			env.OVATION_EDS_DEBUG === 'true' ||
			options.wsdlUrl !== undefined;

		this.auth = new Auth(this);
		this.points = new Points(this);
		this.tabular = new Tabular(this);

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
			typeof data === 'string'
				? data
				: JSON.stringify(data, null, 2)
		);
	}

	public formatIessTag(id: string): string {
		const upper = id.toUpperCase();

		if (upper.includes('@') || upper.includes('.UNIT')) {
			return upper;
		}

		return `${upper}${this.iessSuffix}`;
	}

	/**
	 * Convenience API for callers that want all point data in one call.
	 *
	 * The actual SOAP request and parsing remain owned by Points.
	 */
	public async getPoints(
		iessNames: string[]
	) {
		return this.points.get(iessNames);
	}

	/**
	 * Convenience API matching the old client's getPointsByIess().
	 */
	public async getPointsByIess(
		iessName: string
	): Promise<string> {
		return this.points.getByIess(iessName);
	}

	/**
	 * Convenience API matching the old client's getPointsByIessList().
	 */
	public async getPointsByIessList(
		iessNames: string[]
	): Promise<Record<string, string>> {
		return this.points.getByIessList(iessNames);
	}

	/**
	 * Convenience API matching the old client's
	 * getPointsByIessListParsed().
	 */
	public async getPointsByIessListParsed(
		iessNames: string[]
	) {
		return this.points.getByIessListParsed(iessNames);
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
		return this.tabular.fetch(
			sensorIds,
			windowSeconds,
			stepSeconds,
			functionType
		);
	}

	public async login(): Promise<string> {
		return this.auth.getToken();
	}

	public async logout(): Promise<void> {
		return this.auth.logout();
	}
}
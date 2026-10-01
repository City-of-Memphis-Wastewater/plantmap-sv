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
    }

    public log(label: string, data: unknown): void {
        if (!this.debug) return;

        console.log(
            `[EDS DEBUG] ${label}:`,
            typeof data === 'string'
                ? data
                : JSON.stringify(data, null, 2)
        );
    }
}

// src/lib/server/eds/factory.ts

import os from 'node:os';
import path from 'node:path';

import { MemphisConfig } from '$lib/memphis-config';
import { MemphisEnv } from '$lib/memphis-env';
import { MemphisSecret } from '$lib/memphis-secret';
import { loadPlantMapConfig } from '$lib/plantmap/config';

import { ClientEdsSoap } from './client';

function requiredEnv(env: MemphisEnv, key: string): string {
	const value = env.value(key);

	if (value === undefined || value === null) {
		throw new Error(`Required environment variable is missing: ${key}`);
	}

	return value;
}

export function createEdsClient(): ClientEdsSoap {
	const appDir = path.join(os.homedir(), '.plantmap');

	const memphisConfig = new MemphisConfig({
		appDir
	});

	const memphisSecret = new MemphisSecret({
		appDir
	});

	const memphisEnv = new MemphisEnv();

	const plantMapConfig = loadPlantMapConfig(memphisConfig);

	// const username = requiredEnv(memphisEnv, 'OVATION_EDS_USERNAME');

	// const password = requiredEnv(memphisEnv, 'OVATION_EDS_PASSWORD');

	const username = memphisSecret.value('eds', 'username');

	const edsPassword = memphisSecret.value('eds', 'password');

	const baseUrl = requiredEnv(memphisEnv, 'OVATION_EDS_BASE_URL');

	const endpoint = `http://${baseUrl}:${plantMapConfig.eds.soapPort}`;

	return new ClientEdsSoap({
		endpoint,
		username,
		edsPassword,
		iessSuffix: plantMapConfig.eds.suffix,
		debug: plantMapConfig.eds.debug
	});
}

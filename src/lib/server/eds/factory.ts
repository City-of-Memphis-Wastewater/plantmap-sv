// src/lib/server/eds/factory.ts

import os from 'node:os';
import path from 'node:path';

import { MemphisConfig } from '$lib/memphis-config';
import { MemphisSecret } from '$lib/memphis-secret';
import { loadPlantMapConfig } from '$lib/plantmap/config';
import { loadPlantMapSecret } from '$lib/plantmap/secret';

import { ClientEdsSoap } from './client';

export function createEdsClient(): ClientEdsSoap {

	const appDir = path.join(os.homedir(), '.plantmap');

	const memphisConfig = new MemphisConfig({
		appDir
	});

	const memphisSecret = new MemphisSecret({
		appDir
	});

	const plantMapConfig = loadPlantMapConfig(memphisConfig);
	const plantMapSecret = loadPlantMapSecret(memphisSecret);

	const endpoint = `${plantMapConfig.eds.protocol}${plantMapConfig.eds.host}:${plantMapConfig.eds.soapPort}`;

	return new ClientEdsSoap({
		endpoint,
		username: plantMapSecret.eds.username,
		password: plantMapSecret.eds.password,
		iessSuffix: plantMapConfig.eds.suffix,
		debug: plantMapConfig.eds.debug
	});
}

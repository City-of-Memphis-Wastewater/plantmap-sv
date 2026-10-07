// src/lib/server/eds/factory.ts

import os from 'node:os';
import path from 'node:path';

import {
    bootstrapPlantMapConfig,
    bootstrapPlantMapSecret
} from '../plantmap/bootstrap';
import { loadPlantMapConfig } from '$lib/plantmap/config';
import { loadPlantMapSecret } from '$lib/plantmap/secret';

import { ClientEdsSoap } from './client';

export function createEdsClient(): ClientEdsSoap {
	
    const config = bootstrapPlantMapConfig();
    const secret = bootstrapPlantMapSecret();
            
	const plantMapConfig = loadPlantMapConfig(config);
	const plantMapSecret = loadPlantMapSecret(secret);

	const endpoint = `${plantMapConfig.eds.protocol}${plantMapConfig.eds.host}:${plantMapConfig.eds.soapPort}`;

	return new ClientEdsSoap({
		endpoint,
		username: plantMapSecret.eds.username,
		password: plantMapSecret.eds.password,
		iessSuffix: plantMapConfig.eds.suffix,
		debug: plantMapConfig.eds.debug
	});
}

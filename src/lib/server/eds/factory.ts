// src/lib/server/eds/factory.ts

import { bootstrapPlantMapConfig, bootstrapPlantMapSecret } from '#lib/plantmap-sv/bootstrap.js';
import { loadPlantMapConfig } from '#lib/plantmap-sv/config.js';
import { loadPlantMapSecret } from '#lib/plantmap-sv/secret.js';

import { ClientEdsSoap } from './client.ts';

let client: ClientEdsSoap | undefined;

function createEdsClient(): ClientEdsSoap {
	const config = bootstrapPlantMapConfig();
	const secret = bootstrapPlantMapSecret();

	const plantMapConfig = loadPlantMapConfig(config);
	const plantMapSecret = loadPlantMapSecret(secret);

	const endpoint = `${plantMapConfig.eds.protocol}${plantMapConfig.eds.host}:${plantMapConfig.eds.soapPort}`;

	return new ClientEdsSoap({
		endpoint,
		username: plantMapSecret.eds.username,
		password: plantMapSecret.eds.password,
		iessSuffix: plantMapConfig.eds.iessSuffix,
		tabularMaxPolls: plantMapConfig.eds.tabularMaxPolls,
		tabularPollTimeoutMs: plantMapConfig.eds.tabularPollTimeoutMs,
		debug: plantMapConfig.eds.debug
	});
}
export function getEdsClient(): ClientEdsSoap {
	if (!client) {
		client = createEdsClient();
	}

	return client;
}

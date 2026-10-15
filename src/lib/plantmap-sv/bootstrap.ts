// src/lib/plantmap-sv/bootstrap.ts

import packageJson from '../../../package.json' with { type: 'json' };

import {
	bootstrapMemphisConfig,
	bootstrapMemphisSecret,
	bootstrapMemphisEnv
} from 'memphis-settings';

const appName = packageJson.name;

export function bootstrapPlantMapConfig() {
	return bootstrapMemphisConfig(appName);
}

export function bootstrapPlantMapSecret() {
	return bootstrapMemphisSecret(appName);
}

export function bootstrapPlantMapEnv() {
	return bootstrapMemphisEnv();
}

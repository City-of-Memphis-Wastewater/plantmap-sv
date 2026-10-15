// src/lib/plantmap-sv/bootstrap.ts

import os from 'node:os';
import path from 'node:path';

import packageJson from '../../../package.json' with { type: 'json' };

import {
	bootstrapMemphisConfig,
	bootstrapMemphisSecret,
	bootstrapMemphisEnv
} from 'memphis-settings';

const appName = packageJson.name;

export function bootstrapPlantMapConfig() {
	return new bootstrapMemphisConfig({
		appName
	});
}

export function bootstrapPlantMapSecret() {
	return new bootstrapMemphisSecret({
		appName
	});
}

export function bootstrapPlantMapEnv() {
	return new bootstrapMemphisEnv();
}

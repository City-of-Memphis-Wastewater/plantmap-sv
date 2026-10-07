// src/lib/plantmap/bootstrap.ts

import os from 'node:os';
import path from 'node:path';

import packageJson from '../../../package.json' with { type: 'json' };

import { MemphisConfig } from '$lib/memphis-config';
import { MemphisSecret } from '$lib/memphis-secret';

const appDir = path.join(os.homedir(), `.${packageJson.name}`);

export function bootstrapPlantMapConfig() {
	return new MemphisConfig({
		appDir
	});
}

export function bootstrapPlantMapSecret() {
	return new MemphisSecret({
		appDir
	});
}

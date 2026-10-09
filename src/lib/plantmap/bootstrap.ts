// src/lib/plantmap/bootstrap.ts

import os from 'node:os';
import path from 'node:path';

import packageJson from '../../../package.json' with { type: 'json' };

import { MemphisConfig, MemphisSecret } from 'memphis-settings';

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

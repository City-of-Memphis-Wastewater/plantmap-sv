import os from 'node:os';
import path from 'node:path';

import { bootstrapPlantMapConfig } from '../plantmap/bootstrap';

export function config() {
	const configs = bootstrapPlantMapConfig();

	for (const item of configs.list()) {
		console.log(`${item.key}=${item.value}`);
	}
}

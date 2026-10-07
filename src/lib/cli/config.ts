// src/lib/cli/config.ts

import { bootstrapPlantMapConfig } from '../plantmap/bootstrap.ts';

export function config() {
	const configs = bootstrapPlantMapConfig();

	for (const item of configs.list()) {
		console.log(`${item.key}=${item.value}`);
	}
}

// src/lib/cli/config.ts

import { bootstrapPlantMapConfig } from '../plantmap/bootstrap.ts';

export function config() {
	const configs = bootstrapPlantMapConfig();
	if (!configs.isInitialized()) {
		console.error('[plantmap] Configuration is not initialized.');
		console.error('');
		console.error('[plantmap] Run `npx plantmap-sv setup` first.');
		return;
	}
	for (const item of configs.list()) {
		console.log(`${item.service},${item.item}=${item.value}`);
	}
}

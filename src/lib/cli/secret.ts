// src/lib/cli/secret.ts

import { bootstrapPlantMapSecret } from '../plantmap/bootstrap.ts';

export function secret() {
	const secrets = bootstrapPlantMapSecret();
	if (!secrets.isInitialized()) {
		console.error('[plantmap] Secret vault is not initialized.');
		console.error('');
		console.error('[plantmap] Run `npx plantmap-sv setup` first.');
		return;
	}
	for (const credential of secrets.list()) {
		console.log(`${credential.service}/${credential.item}`);
	}
}

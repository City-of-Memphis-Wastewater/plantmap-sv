// src/lib/cli/secret.ts

import { bootstrapPlantMapSecret } from '../plantmap/bootstrap.ts';

export function secret() {
	const secrets = bootstrapPlantMapSecret();

	for (const credential of secrets.list()) {
		console.log(`${credential.service}/${credential.item}`);
	}
}

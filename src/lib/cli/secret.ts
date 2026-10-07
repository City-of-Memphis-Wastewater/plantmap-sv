// src/lib/cli/secret.ts

import os from 'node:os';
import path from 'node:path';

import { bootstrapPlantMapSecret } from '../plantmap/bootstrap';

export function secret() {
	const secrets = bootstrapPlantMapSecret();

	for (const credential of secrets.list()) {
		console.log(`${credential.service}/${credential.item}`);
	}
}

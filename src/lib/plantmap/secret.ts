// src/lib/plantmap/secret.ts

import { z } from 'zod';

import type { MemphisSecret } from '$lib/memphis-secret';

const PlantMapSecretSchema = z.object({
	eds: z.object({
		username: z.string().min(1),
		password: z.string()
	})
});

export type PlantMapSecret = z.infer<typeof PlantMapSecretSchema>;

export function loadPlantMapSecret(secret: MemphisSecret): PlantMapSecret {
	const username = secret.value('eds', 'username');
	const password = secret.value('eds', 'password');

	if (!username || password === undefined) {
		throw new Error('Ovation EDS credentials are not configured. Run `plantmap-sv setup`.');
	}

	return PlantMapSecretSchema.parse({
		eds: {
			username,
			password
		}
	});
}

// src/lib/plantmap/config.ts

import { z } from 'zod';

import type { MemphisConfig } from '$lib/memphis-config';

export const PlantMapConfigSchema = z.object({
	eds: z.object({
	    protocol: z.string(),
        host: z.string(),
		soapPort: z.number().int(),
		suffix: z.string(),
		debug: z.boolean()
	}),

	server: z.object({
		port: z.number().int()
	})
});

export type PlantMapConfig = z.infer<typeof PlantMapConfigSchema>;

export function loadPlantMapConfig(config: MemphisConfig): PlantMapConfig {
	return PlantMapConfigSchema.parse({
		eds: {
			protocol: config.value('eds.protocol') ?? 'http://',
			host: config.value('eds.host') ?? '127.0.0.1',
			soapPort: config.value('eds.soapPort') ?? 43080,
			suffix: config.value('eds.suffix') ?? '.UNIT0@NET0',
			debug: config.value('eds.debug') ?? false
		},

		server: {
			port: config.value('server.port') ?? 3000 // 5173
		}
	});
}

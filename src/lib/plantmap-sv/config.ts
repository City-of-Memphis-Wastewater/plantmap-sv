// src/lib/plantmap-sv/config.ts

import { z } from 'zod';

import type { MemphisConfig } from 'memphis-settings';

export const PlantMapConfigSchema = z.object({
	eds: z.object({
		protocol: z.string(),
		host: z.string(),
		soapPort: z.number().int(),
		iessSuffix: z.string(),
		tabularMaxPolls: z.number().int().positive(),
		tabularPollTimeoutMs: z.number().int().positive(),
		debug: z.boolean()
	}),

	prodServer: z.object({
		port: z.number().int()
	}),

	devServer: z.object({
		port: z.number().int()
	})
});

export type PlantMapConfig = z.infer<typeof PlantMapConfigSchema>;

export function loadPlantMapConfig(config: MemphisConfig): PlantMapConfig {
	return PlantMapConfigSchema.parse({
		eds: {
			protocol: config.value('eds', 'protocol') ?? 'http://',
			host: config.value('eds', 'host') ?? '127.0.0.1',
			soapPort: config.value('eds', 'soapPort') ?? 43080,
			iessSuffix: config.value('eds', 'iessSuffix') ?? '.UNIT0@NET0',
			tabularMaxPolls: config.value('eds', 'tabularMaxPolls') ?? 10,
		    tabularPollTimeoutMs: config.value('eds', 'tabularPollTimeoutMs') ?? 1000,
		    debug: config.value('eds', 'debug') ?? false
		},

		prodServer: {
			port: config.value('prodServer', 'port') ?? 4000
		},

		devServer: {
			port: config.value('devServer', 'port') ?? 5173
		}
	});
}

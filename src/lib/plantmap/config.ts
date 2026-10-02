// src/lib/plantmap/config.ts

import { z } from 'zod';

import type { MemphisConfig } from '$lib/memphis-config';

export const PlantMapConfigSchema = z.object({
    eds: z.object({
        baseUrl: z.url(),
        port: z.number().int(),
        suffix: z.string(),
        debug: z.boolean()
    }),

    server: z.object({
        port: z.number().int()
    })
});

export type PlantMapConfig = z.infer<typeof PlantMapConfigSchema>;

export function loadPlantMapConfig(
    config: MemphisConfig
): PlantMapConfig {
    return PlantMapConfigSchema.parse({
        eds: {
            baseUrl: config.value('eds.baseUrl'),
            port: config.value('eds.port'),
            suffix: config.value('eds.suffix'),
            debug: config.value('eds.debug')
        },

        server: {
            port: config.value('server.port')
        }
    });
}
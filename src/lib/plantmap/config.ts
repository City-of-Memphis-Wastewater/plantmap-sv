// src/lib/plantmap/config.ts

import { z } from 'zod';

import type { MemphisConfig } from '$lib/memphis-config';
import type { MemphisEnv } from '$lib/memphis-env';
import type { MemphisSecretOptions } from '$lib/memphis-secret';

export const PlantMapConfigSchema = z.object({
    eds: z.object({
        baseUrl: z.url(),
        soapPort: z.number().int(),
        suffix: z.string(),
        debug: z.boolean()
    }),

    server: z.object({
        port: z.number().int()
    })
});

export type PlantMapConfig = z.infer<typeof PlantMapConfigSchema>;

export function loadPlantMapConfig(
    config: MemphisConfig,
    //secret: MemphisSecret,
    env: MemphisEnv
): PlantMapConfig {
    return PlantMapConfigSchema.parse({
        eds: {
            //baseUrl: config.value('eds.baseUrl'),
            baseUrl: env.value('OVATION_EDS_BASEURL'),
            soapPort: config.value('eds.soapPort'),
            suffix: config.value('eds.suffix'),
            debug: config.value('eds.debug')
        },

        server: {
            port: config.value('server.port')
        }
    });
}
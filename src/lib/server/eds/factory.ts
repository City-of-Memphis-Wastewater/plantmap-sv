// src/lib/server/eds/factory.ts

import os from 'node:os';
import path from 'node:path';

import { MemphisConfig } from '$lib/memphis-config';
import { MemphisEnv } from '$lib/memphis-env';
//import { MemphisSecret } from '$lib/memphis-secret';
import { loadPlantMapConfig } from '$lib/plantmap/config';

import { ClientEdsSoap } from './client-new';

export function createEdsClient(): ClientEdsSoap {
    const appDir = path.join(os.homedir(), '.plantmap');

    const memphisConfig = new MemphisConfig({
        appDir
    });

    const memphisEnv = new MemphisEnv();

    const plantMapConfig = loadPlantMapConfig(
        memphisConfig,
        memphisEnv
    );


    //const plantMapConfig = loadPlantMapConfig(memphisConfig);

    //const memphisSecret = new MemphisSecret({
    //   appDir
    //});

    const endpoint =
        `${plantMapConfig.eds.baseUrl}:${plantMapConfig.eds.port}`;

    return new ClientEdsSoap({
        endpoint,
        iessSuffix: plantMapConfig.eds.suffix,
        debug: plantMapConfig.eds.debug,

        // TODO:
        // username: memphisSecret.value('eds.username'),
        // password: memphisSecret.value('eds.password')
    });
}
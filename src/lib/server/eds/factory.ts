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

    //const memphisSecret = new MemphisSecret({
    //   appDir
    //});

    const memphisEnv = new MemphisEnv();

    const plantMapConfig = loadPlantMapConfig(
        memphisConfig
    );

    const username = memphisEnv.value(
        'OVATION_EDS_USERNAME'
    );

    const password = memphisEnv.value(
        'OVATION_EDS_PASSWORD'
    );

    const baseUrl = memphisEnv.value(
        'OVATION_EDS_BASE_URL'
    );

    const endpoint =
        `${baseUrl}:${plantMapConfig.eds.soapPort}`;

    return new ClientEdsSoap({
        endpoint,
        username,
        password,
        iessSuffix: plantMapConfig.eds.suffix,
        debug: plantMapConfig.eds.debug,

        // TODO:
        // username: memphisSecret.value('eds.username'),
        // password: memphisSecret.value('eds.password')
    });
}
// server/eds/factory.ts

import { MemphisConfig } from '$lib/memphis-config';
import { loadPlantMapConfig } from '$lib/plantmap/config';
import { MemphisSecret } from '$lib/memphis-secret';

import { ClientEdsSoap } from './client-new';

export async function createEdsClient() {
    const memphisConfig = new MemphisConfig();
    const plantMapConfig = loadPlantMapConfig(memphisConfig);

    const memphisSecret = new MemphisSecret();

    // ...
}

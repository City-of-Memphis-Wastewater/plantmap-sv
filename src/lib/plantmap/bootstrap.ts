// src/lib/plantmap/bootstrap.ts

import os from 'node:os';
import path from 'node:path';

import { MemphisConfig } from '$lib/memphis-config';
import { loadPlantMapConfig } from './config';

import { MemphisSecret } from '$lib/memphis-secret';
import { loadPlantMapSecret } from './secret';

export function bootstrapPlantMapSecret() {
        const packageName = 'plantmap-sv';
        const appDir = path.join(os.homedir(), `.${packageName}`);

        return loadPlantMapSecret(
                new MemphisSecret({
                        appDir
                })
        );
}

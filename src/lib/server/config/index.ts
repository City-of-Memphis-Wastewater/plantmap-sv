// lib/server/config/index.ts
import type { PlantMapConfig, PlantMapSecrets } from './types';
import { loadConfigFile } from './store';

export async function loadConfig(): Promise<PlantMapConfig> {
    return loadConfigFile();
}

export async function loadSecrets(): Promise<PlantMapSecrets> {
    // temporary implementation
    throw new Error('Secret store not implemented yet');
}

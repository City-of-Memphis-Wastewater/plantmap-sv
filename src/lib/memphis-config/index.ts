// src/lib/memphis-config/index.ts

import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type {
    ConfigValue,
    MemphisConfigOptions
} from './types';

export class MemphisConfig {
    private readonly configFile: string;
    private values: Record<string, ConfigValue> = {};

    constructor(options: MemphisConfigOptions = {}) {
        const configDir = options.appDir
            ? path.join(options.appDir, '.memphis-config')
            : path.join(os.homedir(), '.memphis-config');

        this.configFile = path.join(configDir, 'values.json');

        if (existsSync(this.configFile)) {
            this.values = JSON.parse(
                readFileSync(this.configFile, 'utf8')
            );
        }
    }

    public value(key: string): ConfigValue | undefined {
        const parts = key.split('.');

        let current: ConfigValue = this.values;

        for (const part of parts) {
            if (
                typeof current !== 'object' ||
                current === null ||
                Array.isArray(current) ||
                !(part in current)
            ) {
                return undefined;
            }

            current = current[part];
        }

        return current;
    }

    public setValue(key: string, value: ConfigValue): void {
        const parts = key.split('.');

        if (parts.length === 0) {
            throw new Error('Configuration key cannot be empty');
        }

        let current: Record<string, ConfigValue> = this.values;

        for (const part of parts.slice(0, -1)) {
            const existing = current[part];

            if (
                typeof existing !== 'object' ||
                existing === null ||
                Array.isArray(existing)
            ) {
                current[part] = {};
            }

            current = current[part] as Record<string, ConfigValue>;
        }

        current[parts[parts.length - 1]] = value;

        const configDir = path.dirname(this.configFile);

        mkdirSync(configDir, { recursive: true });

        writeFileSync(
            this.configFile,
            JSON.stringify(this.values, null, 2) + '\n',
            'utf8'
        );
    }
}
// src/lib/memphis-env/index.ts
import {
    existsSync,
    readFileSync
} from 'node:fs';

import os from 'node:os';
import path from 'node:path';

import type { MemphisEnvOptions, EnvValue } from './types';

export class MemphisEnv {
    private readonly envFile: string;
    private readonly values: Record<string, EnvValue> = {};

    constructor(options: MemphisEnvOptions = {}) {
        const envDir = options.appDir ?? process.cwd();

        this.envFile = path.join(envDir, '.env');

        if (!existsSync(this.envFile)) {
            return;
        }

        const contents = readFileSync(this.envFile, 'utf8');

        for (const line of contents.split(/\r?\n/)) {
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            const equals = trimmed.indexOf('=');

            if (equals === -1) {
                continue;
            }

            const key = trimmed.slice(0, equals).trim();
            let value = trimmed.slice(equals + 1).trim();

            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }

            this.values[key] = value;
        }
    }

    public value(key: string): EnvValue | undefined {
        return this.values[key];
    }
}

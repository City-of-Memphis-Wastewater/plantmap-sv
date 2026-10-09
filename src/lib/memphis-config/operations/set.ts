// src/lib/memphis-config/operations/set.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type {
        ConfigValue,
        MemphisConfigSetOptions
} from '../types.ts';

export function setConfigValue(
        values: Record<string, ConfigValue>,
        configFile: string,
        key: string,
        value: ConfigValue,
        options: MemphisConfigSetOptions = {}
): void {
        if (value === undefined) {
                throw new Error(
                        '[memphis-config] Configuration value cannot be undefined.'
                );
        }

        const parts = key.split('.');

        if (
                key.trim() === '' ||
                parts.length < 2 ||
                parts.some((part) => part.trim() === '')
        ) {
                throw new Error(
                        '[memphis-config] Configuration key must use "service.item" format.'
                );
        }

        let current: Record<string, ConfigValue> = values;

        for (const part of parts.slice(0, -1)) {
                const child = current[part];

                if (
                        typeof child !== 'object' ||
                        child === null ||
                        Array.isArray(child)
                ) {
                        current[part] = {};
                }

                current = current[part] as Record<string, ConfigValue>;
        }

        const finalKey = parts[parts.length - 1];
        const existing = current[finalKey];

        if (existing !== undefined && options.overwrite !== true) {
                console.log(
                        `[memphis-config] Configuration already exists: ${key}`
                );
                return;
        }

        current[finalKey] = value;

        const configDir = path.dirname(configFile);

        mkdirSync(configDir, { recursive: true });

        writeFileSync(
                configFile,
                JSON.stringify(values, null, 2) + '\n',
                'utf8'
        );

        if (existing !== undefined) {
                console.log(
                        `[memphis-config] Configuration overwritten: ${key}`
                );
        } else {
                console.log(
                        `[memphis-config] Configuration stored: ${key}`
                );
        }
}

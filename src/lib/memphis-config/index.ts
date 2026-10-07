// src/lib/memphis-config/index.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type {
	ConfigValue,
	MemphisConfigItem,
	MemphisConfigOptions,
	MemphisConfigSetOptions
} from './types.ts';

export class MemphisConfig {
	private readonly configFile: string;
	private values: Record<string, ConfigValue> = {};

	constructor(options: MemphisConfigOptions = {}) {
		const configDir = options.appDir
			? path.join(options.appDir, '.memphis-config')
			: path.join(os.homedir(), '.memphis-config');

		this.configFile = path.join(configDir, 'values.json');

		if (existsSync(this.configFile)) {
			this.values = JSON.parse(readFileSync(this.configFile, 'utf8'));
		}
	}

	public isInitialized(): boolean {
		return existsSync(this.configFile);
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

	public setValue(key: string, value: ConfigValue, options: MemphisConfigSetOptions = {}): void {
		const parts = key.split('.');

		if (key.trim() === '' || parts.some((part) => part.trim() === '')) {
			throw new Error('Configuration key cannot be empty');
		}

		const existing = this.value(key);

		if (existing !== undefined && options.overwrite === false) {
			return;
		}

		let current: Record<string, ConfigValue> = this.values;

		for (const part of parts.slice(0, -1)) {
			const child = current[part];

			if (typeof child !== 'object' || child === null || Array.isArray(child)) {
				current[part] = {};
			}

			current = current[part] as Record<string, ConfigValue>;
		}

		current[parts[parts.length - 1]] = value;

		const configDir = path.dirname(this.configFile);

		mkdirSync(configDir, { recursive: true });

		writeFileSync(this.configFile, JSON.stringify(this.values, null, 2) + '\n', 'utf8');
	}

	public list(): MemphisConfigItem[] {
		const items: MemphisConfigItem[] = [];

		const walk = (value: ConfigValue, prefix = ''): void => {
			if (typeof value !== 'object' || value === null || Array.isArray(value)) {
				if (prefix !== '') {
					items.push({
						key: prefix,
						value
					});
				}

				return;
			}

			for (const [key, child] of Object.entries(value)) {
				const fullKey = prefix ? `${prefix}.${key}` : key;
				walk(child, fullKey);
			}
		};

		walk(this.values);

		return items;
	}
}

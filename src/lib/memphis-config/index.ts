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

	/**
	 * Read a configuration value using dot notation.
	 *
	 * Example:
	 *
	 *     config.value('eds.host');
	 */
	public value(key: string): ConfigValue | undefined;

	/**
	 * Read a configuration value using separate path components.
	 *
	 * Example:
	 *
	 *     config.value('eds', 'host');
	 */
	public value(service: string, item: string): ConfigValue | undefined;

	public value(keyOrService: string, item?: string): ConfigValue | undefined {
		const key = item === undefined ? keyOrService : `${keyOrService}.${item}`;

		const parts = this.parseKey(key);

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

	/**
	 * Store a configuration value using dot notation.
	 *
	 * Existing values are preserved by default.
	 *
	 * Set `overwrite: true` to explicitly replace an existing value.
	 *
	 *     config.setValue('eds.host', 'new-host', {
	 *         overwrite: true
	 *     });
	 *
	 */
	public setValue(key: string, value: ConfigValue, options?: MemphisConfigSetOptions): void;

	/**
	 * Store a configuration value using separate path components.
	 *
	 * This is equivalent to the dot-notation form:
	 *
	 *     config.setValue('eds', 'host', 'test');
	 *
	 * is equivalent to:
	 *
	 *     config.setValue('eds.host', 'test');
	 */
	public setValue(
		service: string,
		item: string,
		value: ConfigValue,
		options?: MemphisConfigSetOptions
	): void;

	public setValue(
		keyOrService: string,
		valueOrItem: ConfigValue,
		valueOrOptions?: ConfigValue | MemphisConfigSetOptions,
		options: MemphisConfigSetOptions = {}
	): void {
		let key: string;
		let value: ConfigValue;
		let setOptions: MemphisConfigSetOptions;

		/*
		 * Two supported forms:
		 *
		 *   setValue('eds.host', value, options?)
		 *
		 *   setValue('eds', 'host', value, options?)
		 *
		 * The presence of a third argument determines which
		 * runtime form was supplied.
		 */
		if (valueOrOptions !== undefined) {
			key = `${keyOrService}.${String(valueOrItem)}`;
			value = valueOrOptions as ConfigValue;
			setOptions = options;
		} else {
			key = keyOrService;
			value = valueOrItem;
			setOptions = {};
		}

		const parts = this.parseKey(key);
		const existing = this.value(key);

		if (existing !== undefined && setOptions.overwrite !== true) {
			console.log(`[memphis-config] Configuration already exists: ${key}`);
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

		if (existing !== undefined) {
			console.log(`[memphis-config] Configuration overwritten: ${key}`);
		} else {
			console.log(`[memphis-config] Configuration stored: ${key}`);
		}
	}

	/**
	 * Return all leaf configuration values.
	 *
	 * Nested values are returned using dot notation.
	 *
	 * Example:
	 *
	 *     [
	 *         { key: 'eds.host', value: 'test' },
	 *         { key: 'server.port', value: '4000' }
	 *     ]
	 */
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

	/**
	 * Convert either a dot-notation key or a single configuration
	 * component into validated path components.
	 *
	 * Configuration keys must contain at least two non-empty
	 * components when used through the overloaded API.
	 */
	private parseKey(key: string): string[] {
		const parts = key.split('.');

		if (key.trim() === '' || parts.length < 2 || parts.some((part) => part.trim() === '')) {
			throw new Error('[memphis-config] Configuration key must use "service.item" format.');
		}

		return parts;
	}
}

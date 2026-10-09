// src/lib/memphis-config/lib/index.ts

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
	private readonly values: Record<string, ConfigValue> = {};

	constructor(options: MemphisConfigOptions = {}) {
		const configDir = options.appDir
			? path.join(options.appDir, '.memphis-config')
			: path.join(os.homedir(), '.memphis-config');

		this.configFile = path.join(configDir, 'values.json');

		if (!existsSync(this.configFile)) {
			return;
		}

		const contents = readFileSync(this.configFile, 'utf8');
		const parsed: unknown = JSON.parse(contents);

		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw new Error('[memphis-config] Configuration file must contain a JSON object.');
		}

		Object.assign(this.values, parsed);
	}

	private validateNames(service: string, item: string): void {
		if (typeof service !== 'string' || service.trim() === '') {
			throw new Error('[memphis-config] Service must be a non-empty string.');
		}

		if (typeof item !== 'string' || item.trim() === '') {
			throw new Error('[memphis-config] Item must be a non-empty string.');
		}
	}

	private save(): void {
		mkdirSync(path.dirname(this.configFile), { recursive: true });

		writeFileSync(this.configFile, JSON.stringify(this.values, null, 2) + '\n', 'utf8');
	}

	public isInitialized(): boolean {
		return existsSync(this.configFile);
	}

	public value(service: string, item: string): ConfigValue | undefined {
		this.validateNames(service, item);

		const serviceValues = this.values[service];

		if (
			typeof serviceValues !== 'object' ||
			serviceValues === null ||
			Array.isArray(serviceValues)
		) {
			return undefined;
		}

		return Object.hasOwn(serviceValues, item) ? serviceValues[item] : undefined;
	}

	public setValue(
		service: string,
		item: string,
		value: ConfigValue,
		options: MemphisConfigSetOptions = {}
	): void {
		this.validateNames(service, item);

		if (value === undefined) {
			throw new Error('[memphis-config] Configuration value cannot be undefined.');
		}

		let serviceValues = this.values[service];

		if (
			typeof serviceValues !== 'object' ||
			serviceValues === null ||
			Array.isArray(serviceValues)
		) {
			serviceValues = {};
			this.values[service] = serviceValues;
		}

		const entries = serviceValues as Record<string, ConfigValue>;
		const exists = Object.hasOwn(entries, item);

		if (exists && options.overwrite !== true) {
			console.log(`[memphis-config] Configuration already exists: ${service}.${item}`);
			return;
		}

		entries[item] = value;
		this.save();

		console.log(
			exists
				? `[memphis-config] Configuration overwritten: ${service}.${item}`
				: `[memphis-config] Configuration stored: ${service}.${item}`
		);
	}

	public deleteValue(service: string, item: string): boolean {
		this.validateNames(service, item);

		const serviceValues = this.values[service];

		if (
			typeof serviceValues !== 'object' ||
			serviceValues === null ||
			Array.isArray(serviceValues) ||
			!Object.hasOwn(serviceValues, item)
		) {
			console.log(`[memphis-config] Configuration not found: ${service}.${item}`);
			return false;
		}

		delete serviceValues[item];
		this.save();

		console.log(`[memphis-config] Configuration deleted: ${service}.${item}`);

		return true;
	}

	public list(): MemphisConfigItem[] {
		const items: MemphisConfigItem[] = [];

		for (const [service, serviceValues] of Object.entries(this.values)) {
			if (
				typeof serviceValues !== 'object' ||
				serviceValues === null ||
				Array.isArray(serviceValues)
			) {
				continue;
			}

			for (const [item, value] of Object.entries(serviceValues)) {
				items.push({
					service,
					item,
					value
				});
			}
		}

		return items;
	}
}

// src/lib/memphis-config/operations/delete.ts

import { writeFileSync } from 'node:fs';

import { parseKey } from '../lib/helpers/parse-key.ts';
import type { ConfigValue } from '../types.ts';

export function deleteConfigValue(
	values: Record<string, ConfigValue>,
	configFile: string,
	key: string
): boolean {
	const parts = parseKey(key);
	let current: Record<string, ConfigValue> = values;

	for (const part of parts.slice(0, -1)) {
		const child = current[part];

		if (typeof child !== 'object' || child === null || Array.isArray(child)) {
			console.log(`[memphis-config] Configuration not found: ${key}`);
			return false;
		}

		current = child as Record<string, ConfigValue>;
	}

	const finalKey = parts[parts.length - 1];

	if (!(finalKey in current)) {
		console.log(`[memphis-config] Configuration not found: ${key}`);
		return false;
	}

	delete current[finalKey];

	writeFileSync(configFile, JSON.stringify(values, null, 2) + '\n', 'utf8');

	console.log(`[memphis-config] Configuration deleted: ${key}`);

	return true;
}

// src/lib/memphis-config/operations/get.ts

import type { ConfigValue } from '../types.ts';
import { parseKey } from '../lib/helpers/parse-key.ts';

export function getConfigValue(
	values: Record<string, ConfigValue>,
	key: string
): ConfigValue | undefined {
	const parts = parseKey(key);
	let current: ConfigValue = values;

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

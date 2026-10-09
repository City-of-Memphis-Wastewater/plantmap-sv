// src/lib/memphis-config/operations/list.ts

import type { ConfigValue, MemphisConfigItem } from '../types.ts';

export function listConfigValues(values: Record<string, ConfigValue>): MemphisConfigItem[] {
	const items: MemphisConfigItem[] = [];

	const walk = (value: ConfigValue, prefix = ''): void => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			if (prefix !== '') {
				items.push({ key: prefix, value });
			}

			return;
		}

		for (const [key, child] of Object.entries(value)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			walk(child, fullKey);
		}
	};

	walk(values);

	return items;
}

// src/lib/memphis-config/lib/helpers/parse-key.ts

/**
 * Parse and validate a dot-notation configuration key.
 *
 * Configuration keys must contain at least two non-empty components.
 */
export function parseKey(key: string): string[] {
	const parts = key.split('.');

	if (key.trim() === '' || parts.length < 2 || parts.some((part) => part.trim() === '')) {
		throw new Error('[memphis-config] Configuration key must use "service.item" format.');
	}

	return parts;
}

export function formatIessTag(id: string, suffix = '.UNIT0@NET0'): string {
	const upper = id.toUpperCase();

	if (upper.includes('@') || upper.includes('.UNIT')) {
		return upper;
	}

	return `${upper}${suffix}`;
}

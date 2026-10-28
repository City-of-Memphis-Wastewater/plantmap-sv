import type { EDSTelemetrySeries } from '../server/eds/types';

/**
 * Escape a field according to CSV quoting rules.
 */
function escapeCsvField(value: string | number | null): string {
	if (value === null) {
		return '';
	}

	const text = String(value);

	if (/[",\r\n]/.test(text)) {
		return `"${text.replace(/"/g, '""')}"`;
	}

	return text;
}

/**
 * Convert EDS series into a wide-format CSV table.
 *
 * Samples are aligned by timestamp rather than array position because
 * different tags may return different timestamp sequences.
 *
 * A blank cell represents a missing reading.
 */
export function serializeTelemetryCsv(series: EDSTelemetrySeries): string {
	const tags = Object.keys(series);

	const timestamps = new Set<string>();

	for (const samples of Object.values(series)) {
		for (const sample of samples) {
			if (sample.timestamp !== null && Number.isFinite(Date.parse(sample.timestamp))) {
				timestamps.add(new Date(sample.timestamp).toISOString());
			}
		}
	}

	const sortedTimestamps = [...timestamps].sort((a, b) => Date.parse(a) - Date.parse(b));

	const valuesByTag = new Map<string, Map<string, number | null>>();

	for (const [tag, samples] of Object.entries(series)) {
		const values = new Map<string, number | null>();

		for (const sample of samples) {
			if (sample.timestamp === null || !Number.isFinite(Date.parse(sample.timestamp))) {
				continue;
			}

			const timestamp = new Date(sample.timestamp).toISOString();

			values.set(timestamp, sample.value);
		}

		valuesByTag.set(tag, values);
	}

	const rows = [['timestamp', ...tags].map(escapeCsvField).join(',')];

	for (const timestamp of sortedTimestamps) {
		const values = tags.map((tag) => valuesByTag.get(tag)?.get(timestamp) ?? null);

		rows.push([timestamp, ...values].map(escapeCsvField).join(','));
	}

	return `${rows.join('\r\n')}\r\n`;
}

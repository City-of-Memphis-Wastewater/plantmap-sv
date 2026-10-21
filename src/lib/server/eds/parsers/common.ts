/**
 * Shared helpers for parsing Ovation EDS XML responses.
 *
 * These helpers preserve data as received wherever possible.
 * Quality does not determine whether a reading is retained.
 */

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Decode common XML entities in text nodes. */
export function decodeXmlText(value: string): string {
	return value
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&');
}

/**
 * Extract the contents of the first matching element.
 * Supports namespaced and unprefixed element names.
 */
export function getXmlText(xml: string, tagName: string): string | null {
	const tag = escapeRegExp(tagName);
	const regex = new RegExp(
		`<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${tag}\\s*>`,
		'i'
	);

	const match = regex.exec(xml);

	if (!match) {
		return null;
	}

	return decodeXmlText(match[1].trim());
}

/**
 * Extract complete matching element blocks.
 * Useful when a response contains repeated rows or points.
 */
export function getXmlBlocks(xml: string, tagName: string): string[] {
	const tag = escapeRegExp(tagName);
	const regex = new RegExp(
		`<(?:[\\w.-]+:)?${tag}\\b[^>]*>[\\s\\S]*?<\\/(?:[\\w.-]+:)?${tag}\\s*>`,
		'gi'
	);

	return Array.from(xml.matchAll(regex), (match) => match[0]);
}

/**
 * Parse a numeric reading without turning missing or invalid data into zero.
 * A genuine numeric zero remains zero.
 */
export function parseNumericValue(value: string | null | undefined): number | null {
	if (value == null || value.trim() === '') {
		return null;
	}

	const parsed = Number(value.trim());

	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse an epoch-seconds timestamp.
 * Missing or invalid timestamps remain null rather than being replaced
 * with the current time.
 */
export function parseEpochSeconds(value: string | null | undefined): string | null {
	if (value == null || value.trim() === '') {
		return null;
	}

	const seconds = Number(value.trim());

	if (!Number.isFinite(seconds) || seconds <= 0) {
		return null;
	}

	const date = new Date(seconds * 1000);

	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Parse the nested timestamp used in point and tabular response blocks. */
export function parseXmlTimestamp(block: string): string | null {
	const seconds = getXmlText(block, 'second');

	if (seconds != null) {
		const timestamp = parseEpochSeconds(seconds);

		if (timestamp != null) {
			return timestamp;
		}
	}

	// Support responses that provide an ISO-like timestamp directly.
	const directTimestamp =
		getXmlText(block, 'timestamp') ??
		getXmlText(block, 'timeStamp');

	if (directTimestamp == null || directTimestamp === '') {
		return null;
	}

	const milliseconds = Date.parse(directTimestamp);

	return Number.isFinite(milliseconds)
		? new Date(milliseconds).toISOString()
		: null;
}

/**
 * Read quality without normalizing or filtering it.
 * A missing quality field is represented by an empty string.
 */
export function parseXmlQuality(block: string): string {
	return getXmlText(block, 'quality') ?? '';
}

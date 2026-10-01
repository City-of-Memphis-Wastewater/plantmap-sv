import type { EdsPointTelemetry } from '../types';

export function parseGetPointsResponse(
	xml: string
): Record<string, EdsPointTelemetry> {
	const results: Record<
		string,
		EdsPointTelemetry
	> = {};

	// Match individual point blocks.
	// Handles both prefixed <eds:points> and bare <points>.
	const pointsRegex =
		/<(?:[a-zA-Z0-9]+:)?points[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?points>/gi;

	let match: RegExpExecArray | null;

	while ((match = pointsRegex.exec(xml)) !== null) {
		const block = match[1];

		const sid =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?sid>([^<]+)<\/(?:[a-zA-Z0-9]+:)?sid>/i
			)?.[1] ?? '';

		const iess =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?iess>([^<]+)<\/(?:[a-zA-Z0-9]+:)?iess>/i
			)?.[1] ?? '';

		const idcs =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?idcs>([^<]+)<\/(?:[a-zA-Z0-9]+:)?idcs>/i
			)?.[1] ?? '';

		const description =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?desc>([^<]+)<\/(?:[a-zA-Z0-9]+:)?desc>/i
			)?.[1] ?? '';

		const units =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?un>([^<]+)<\/(?:[a-zA-Z0-9]+:)?un>/i
			)?.[1] ?? '';

		const quality =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?quality>([^<]+)<\/(?:[a-zA-Z0-9]+:)?quality>/i
			)?.[1] ?? '';

		// Analog values use <av>.
		const avMatch =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?av>([^<]+)<\/(?:[a-zA-Z0-9]+:)?av>/i
			);

		// Digital values use <dv>.
		const dvMatch =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?dv>([^<]+)<\/(?:[a-zA-Z0-9]+:)?dv>/i
			);

		const rawValue = avMatch
			? parseFloat(avMatch[1])
			: dvMatch
				? parseFloat(dvMatch[1])
				: 0;

		// Parse timestamp from seconds epoch.
		const tsMatch =
			block.match(
				/<(?:[a-zA-Z0-9]+:)?ts>\s*<(?:[a-zA-Z0-9]+:)?second>([^<]+)<\/(?:[a-zA-Z0-9]+:)?second>/i
			);

		const epochSec = tsMatch
			? parseInt(tsMatch[1], 10)
			: 0;

		const timestamp =
			epochSec > 0
				? new Date(
						epochSec * 1000
					).toISOString()
				: new Date().toISOString();

		if (iess) {
			results[iess] = {
				sid,
				iess,
				idcs,
				description,
				units,
				value: Number.isNaN(rawValue)
					? 0
					: rawValue,
				quality,
				timestamp
			};
		}
	}

	return results;
}
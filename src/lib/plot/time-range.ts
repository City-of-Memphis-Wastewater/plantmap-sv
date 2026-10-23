// time-range.ts
/**
 *Default to 400 data points, or provide a specific dp, and from this calulate seconds between.
 *Or, if seconds between is provided and data point count is not, use that.
 * If start is provided but end is not assume two days. Days can be provided.
 * If end is provided but start is not, assume two days. Days can be provided.
 * If start and end and days are provided, use start and end and ignore days.
 * Which parameters should be available in the plot web interface and in the URL?
 * How can a URL have a null? How can an input have a null?
 */

/**

* Resolve a requested plot time range into Unix timestamps.
* 
* Behavior:
* - Both start and end: use both; ignore days.
* - Start only: end at now unless days is provided.
* - Start and days: end at start + days.
* - End only: start at end - days, defaulting to two days.
* - Neither boundary: default to two days ending now.
    */

export const SECONDS_PER_DAY = 86_400;
export const DEFAULT_DAYS = 2;
export const MAX_DAYS = 365;

export interface TimeRangeInput {
	start?: string;
	end?: string;
	days?: number;
}

export interface ResolvedTimeRange {
	startSeconds: number;
	endSeconds: number;
	windowSeconds: number;
}

function parseTimestamp(value: string, name: string): number {
	const milliseconds = Date.parse(value);

	if (!Number.isFinite(milliseconds)) {
		throw new Error(`Invalid ${name} time: ${value}`);
	}

	return Math.floor(milliseconds / 1000);
}

function validateDays(days: number): void {
	if (!Number.isFinite(days) || days <= 0 || days > MAX_DAYS) {
		throw new Error('days must be greater than 0 and no greater than ${MAX_DAYS}.');
	}
}

export function assessTimeRange(
	input: TimeRangeInput,
	nowSeconds = Math.floor(Date.now() / 1000)
): ResolvedTimeRange {
	const { start, end, days } = input;

	if (!Number.isFinite(nowSeconds)) {
		throw new Error('nowSeconds must be a finite number.');
	}

	if (days !== undefined) {
		validateDays(days);
	}

	const explicitStart = start === undefined ? undefined : parseTimestamp(start, 'start');

	const explicitEnd = end === undefined ? undefined : parseTimestamp(end, 'end');

	let startSeconds: number;
	let endSeconds: number;

	if (explicitStart !== undefined && explicitEnd !== undefined) {
		// Explicit boundaries take precedence over days.
		startSeconds = explicitStart;
		endSeconds = explicitEnd;
	} else if (explicitStart !== undefined) {
		startSeconds = explicitStart;

		if (days !== undefined) {
			endSeconds = startSeconds + Math.round(days * SECONDS_PER_DAY);
		} else {
			endSeconds = nowSeconds;
		}
	} else if (explicitEnd !== undefined) {
		endSeconds = explicitEnd;

		const durationDays = days ?? DEFAULT_DAYS;

		startSeconds = endSeconds - Math.round(durationDays * SECONDS_PER_DAY);
	} else {
		endSeconds = nowSeconds;

		const durationDays = days ?? DEFAULT_DAYS;

		startSeconds = endSeconds - Math.round(durationDays * SECONDS_PER_DAY);
	}

	if (startSeconds >= endSeconds) {
		throw new Error('Start time must be earlier than end time.');
	}

	const windowSeconds = endSeconds - startSeconds;

	if (windowSeconds > MAX_DAYS * SECONDS_PER_DAY) {
		throw new Error(`The time range cannot exceed ${MAX_DAYS} days.`);
	}

	return {
		startSeconds,
		endSeconds,
		windowSeconds
	};
}

// src/lib/plot/sampling.ts

import {
	DEFAULT_DATAPOINT_COUNT,
	MAX_DATAPOINT_COUNT,
	MAX_SECONDS_BETWEEN_POINTS,
	NICE_SAMPLING_INTERVALS
} from './context';

// -----------------------------------------------------------------------------
// Sampling resolution
// -----------------------------------------------------------------------------

/**
 * Select the first supported sampling interval greater than or equal to
 * the requested minimum interval.
 *
 * Falls back to the largest supported interval if the requested interval
 * exceeds all supported intervals.
 */
function niceStep(minimumSeconds: number): number {
	for (const interval of NICE_SAMPLING_INTERVALS) {
		if (interval >= minimumSeconds) {
			return interval;
		}
	}

	return NICE_SAMPLING_INTERVALS[NICE_SAMPLING_INTERVALS.length - 1];
}

/**
 * Resolve the sampling interval for a plot.
 *
 * If datapointCount is provided, it takes precedence over
 * secondsBetweenPoints.
 *
 * If neither is provided, DEFAULT_DATAPOINT_COUNT is used.
 *
 * datapointCount represents a target, not an exact number of points.
 *
 * @param windowSeconds Duration of the requested time range, in seconds.
 * @param datapointCount Target number of data points.
 * @param secondsBetweenPoints Requested sampling interval, in seconds.
 * @returns A supported sampling interval, in seconds.
 */
export function resolveSamplingInterval(
	windowSeconds: number,
	datapointCount?: number,
	secondsBetweenPoints?: number
): number {
	if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
		throw new Error('windowSeconds must be a positive finite number.');
	}

	if (datapointCount !== undefined) {
		if (
			!Number.isInteger(datapointCount) ||
			datapointCount <= 0 ||
			datapointCount > MAX_DATAPOINT_COUNT
		) {
			throw new Error(`datapointCount must be an integer between 1 and ${MAX_DATAPOINT_COUNT}.`);
		}

		const minimumSeconds = Math.max(1, Math.floor(windowSeconds / datapointCount));

		return niceStep(minimumSeconds);
	}

	if (secondsBetweenPoints !== undefined) {
		if (
			!Number.isFinite(secondsBetweenPoints) ||
			secondsBetweenPoints <= 0 ||
			secondsBetweenPoints > MAX_SECONDS_BETWEEN_POINTS
		) {
			throw new Error(
				`secondsBetweenPoints must be greater than 0 and no greater than ${MAX_SECONDS_BETWEEN_POINTS}.`
			);
		}

		return niceStep(secondsBetweenPoints);
	}

	const minimumSeconds = Math.max(1, Math.floor(windowSeconds / DEFAULT_DATAPOINT_COUNT));

	return niceStep(minimumSeconds);
}

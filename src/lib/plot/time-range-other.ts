// src/lib/plot/time-range.ts

import {
    DEFAULT_DAYS,
    DEFAULT_DATAPOINT_COUNT,
    MAX_DAYS,
    MAX_DATAPOINT_COUNT,
    MAX_SECONDS_BETWEEN_POINTS,
    NICE_SAMPLING_INTERVALS,
    SECONDS_PER_DAY
} from './context';

import type {
    PlotOptions,
    ResolvedPlotRequest
} from './types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ResolvedTimeRange {
    startSeconds: number;
    endSeconds: number;
}

// -----------------------------------------------------------------------------
// Time-range resolution
// -----------------------------------------------------------------------------

/**
 * Resolve a requested time range into Unix timestamps in seconds.
 *
 * Rules:
 * - Both start and end: use both; ignore days.
 * - Start only: end now, unless days is explicitly supplied.
 * - End only: start days before end, or DEFAULT_DAYS before end.
 * - Neither: end now, starting DEFAULT_DAYS before now unless days is supplied.
 *
 * The maximum duration is MAX_DAYS.
 */
function resolveTimeBounds(
    options: PlotOptions,
    nowSeconds: number
): ResolvedTimeRange {
    const { start, end, days } = options;

    const hasStart = start !== undefined;
    const hasEnd = end !== undefined;
    const hasDays = days !== undefined;

    let startSeconds: number;
    let endSeconds: number;

    if (hasStart && hasEnd) {
        startSeconds = parseTimestamp(start, 'start');
        endSeconds = parseTimestamp(end, 'end');
    } else if (hasStart) {
        startSeconds = parseTimestamp(start, 'start');

        if (hasDays) {
            validateDays(days);
            endSeconds = startSeconds + days * SECONDS_PER_DAY;
        } else {
            endSeconds = nowSeconds;
        }
    } else if (hasEnd) {
        endSeconds = parseTimestamp(end, 'end');

        const durationDays = hasDays
            ? validateDays(days)
            : DEFAULT_DAYS;

        startSeconds = endSeconds - durationDays * SECONDS_PER_DAY;
    } else {
        endSeconds = nowSeconds;

        const durationDays = hasDays
            ? validateDays(days)
            : DEFAULT_DAYS;

        startSeconds = endSeconds - durationDays * SECONDS_PER_DAY;
    }

    validateTimeBounds(startSeconds, endSeconds);

    return {
        startSeconds,
        endSeconds
    };
}

/**
 * Parse a timestamp supplied as a Unix-seconds string or ISO date string.
 *
 * Numeric strings are interpreted as Unix seconds, never milliseconds.
 */
function parseTimestamp(
    value: string | undefined,
    fieldName: string
): number {
    if (value === undefined || value.trim() === '') {
        throw new Error(`${fieldName} must be a valid timestamp.`);
    }

    const trimmed = value.trim();

    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
        const seconds = Number(trimmed);

        if (!Number.isFinite(seconds)) {
            throw new Error(`${fieldName} must be a finite timestamp.`);
        }

        return seconds;
    }

    const milliseconds = Date.parse(trimmed);

    if (!Number.isFinite(milliseconds)) {
        throw new Error(`${fieldName} must be a valid timestamp.`);
    }

    return milliseconds / 1000;
}

/**
 * Validate the requested duration in days.
 */
function validateDays(days: number | undefined): number {
    if (
        days === undefined ||
        !Number.isFinite(days) ||
        days <= 0 ||
        days > MAX_DAYS
    ) {
        throw new Error(
            `days must be greater than 0 and no greater than ${MAX_DAYS}.`
        );
    }

    return days;
}

/**
 * Validate the resolved timestamp range.
 */
function validateTimeBounds(
    startSeconds: number,
    endSeconds: number
): void {
    if (
        !Number.isFinite(startSeconds) ||
        !Number.isFinite(endSeconds)
    ) {
        throw new Error('Start and end must be finite timestamps.');
    }

    if (startSeconds >= endSeconds) {
        throw new Error('Start must be earlier than end.');
    }

    const windowSeconds = endSeconds - startSeconds;
    const maxWindowSeconds = MAX_DAYS * SECONDS_PER_DAY;

    if (windowSeconds > maxWindowSeconds) {
        throw new Error(
            `The time range cannot exceed ${MAX_DAYS} days.`
        );
    }
}

// -----------------------------------------------------------------------------
// Sampling resolution
// -----------------------------------------------------------------------------

/**
 * Select the first supported sampling interval greater than or equal to
 * the requested minimum interval.
 *
 * Falls back to the largest supported interval when necessary.
 */
function niceStep(minimumSeconds: number): number {
    for (const interval of NICE_SAMPLING_INTERVALS) {
        if (interval >= minimumSeconds) {
            return interval;
        }
    }

    return NICE_SAMPLING_INTERVALS[
        NICE_SAMPLING_INTERVALS.length - 1
    ];
}

/**
 * Resolve the sampling interval.
 *
 * If datapointCount is provided, it takes precedence over
 * secondsBetweenPoints.
 *
 * datapointCount is a target, not a guarantee of an exact number of points.
 */
function resolveSamplingInterval(
    options: PlotOptions,
    windowSeconds: number
): number {
    const { datapointCount, secondsBetweenPoints } = options;

    if (datapointCount !== undefined) {
        if (
            !Number.isInteger(datapointCount) ||
            datapointCount <= 0 ||
            datapointCount > MAX_DATAPOINT_COUNT
        ) {
            throw new Error(
                `datapointCount must be an integer between 1 and ${MAX_DATAPOINT_COUNT}.`
            );
        }

        const minimumSeconds = Math.max(
            1,
            Math.floor(windowSeconds / datapointCount)
        );

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

    const minimumSeconds = Math.max(
        1,
        Math.floor(windowSeconds / DEFAULT_DATAPOINT_COUNT)
    );

    return niceStep(minimumSeconds);
}

// -----------------------------------------------------------------------------
// Request resolution
// -----------------------------------------------------------------------------

/**
 * Resolve plot options into a normalized request ready for the EDS layer.
 *
 * This is the shared entry point for the page, CLI, and API.
 *
 * @param options User-supplied plot options.
 * @param nowSeconds Optional current time in Unix seconds, useful for testing.
 */
export function resolveTimeRange(
    options: PlotOptions,
    nowSeconds: number = Date.now() / 1000
): ResolvedPlotRequest {
    if (!Number.isFinite(nowSeconds)) {
        throw new Error('nowSeconds must be a finite timestamp.');
    }

    const bounds = resolveTimeBounds(options, nowSeconds);

    const windowSeconds =
        bounds.endSeconds - bounds.startSeconds;

    const secondsBetweenPoints = resolveSamplingInterval(
        options,
        windowSeconds
    );

    const functionType = options.functionType ?? 'AVG';

    if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(functionType)) {
        throw new Error('functionType is invalid.');
    }

    if (!Array.isArray(options.tags) || options.tags.length === 0) {
        throw new Error('At least one tag must be supplied.');
    }

    const tags = options.tags.map((tag) => tag.trim());

    if (tags.some((tag) => tag.length === 0)) {
        throw new Error('Tags cannot be empty.');
    }

    return {
        tags,
        startSeconds: bounds.startSeconds,
        endSeconds: bounds.endSeconds,
        secondsBetweenPoints,
        functionType
    };
}

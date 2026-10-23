// src/lib/plot/resolve-time.ts

import { assessTimeRange } from './time-range';
import { resolveSamplingInterval } from './sampling';
import type {
    AllTimeInputs,
    ResolvedTimeAspects
} from './types';

/**
 * Resolve all time-related inputs into a concrete time range
 * and sampling interval.
 *
 * Time range resolution happens first because sampling depends
 * on the resolved windowSeconds.
 */
export function resolveTimeAspects(
    input: AllTimeInputs
): ResolvedTimeAspects {
    const timeRange = assessTimeRange(input);

    const samplingInterval = resolveSamplingInterval(
        timeRange.windowSeconds,
        input.datapointCount,
        input.secondsBetweenPoints
    );

    return {
        ...timeRange,
        secondsBetweenPoints: samplingInterval
    };
}

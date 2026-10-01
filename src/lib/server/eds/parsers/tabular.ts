// parsers/tabular.ts

import type { EDSTelemetryValue } from '../types';

export function parseTabularResponse(
    xml: string,
    requestedTags: string[]
): Record<string, EDSTelemetryValue> {
    // Move existing parser here verbatim.
}

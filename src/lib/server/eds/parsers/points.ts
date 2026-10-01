// parsers/points.ts

import type { EdsPointTelemetry } from '../types';

export function parseGetPointsResponse(
    xml: string
): Record<string, EdsPointTelemetry> {
    // Move existing parser here verbatim.
}

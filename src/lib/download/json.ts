import type { EDSTelemetrySeries } from '../server/eds/types';

/**
 * Serialize historical telemetry without discarding quality or timestamps.
 */
export function serializeTelemetryJson(series: EDSTelemetrySeries): string {
	return `${JSON.stringify(series, null, 2)}\n`;
}

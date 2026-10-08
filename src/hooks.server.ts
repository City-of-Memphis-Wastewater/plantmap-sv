import { telemetryService } from '$lib/server/telemetry/service';

export async function init() {
	telemetryService.startPolling();
}

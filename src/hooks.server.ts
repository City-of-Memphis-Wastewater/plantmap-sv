import { telemetryService } from '$lib/server/telemetry/service';

export async function init() {
  telemetryService.startPolling();

  const shutdown = () => {
    console.log('[Server] Shutting down...');
    telemetryService.stopPolling();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

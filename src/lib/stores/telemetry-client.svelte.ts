// src/lib/stores/telemetry-client.svelte.ts

export interface SensorNode {
    id: string;
    name: string;
    lat: number;
    lon: number;
    altitude?: number;
    value: number | null;
    unit?: string;
    precision?: number;
    status: 'normal' | 'warning' | 'alarm' | 'missing';
}

class TelemetryStore {
    sensors = $state<Record<string, SensorNode>>({});
    isPolling = $state(false);
    isDegraded = $state(true);
    error = $state<string | null>(null);

    private timer: ReturnType<typeof setTimeout> | null = null;

    async fetchTelemetry() {
        console.log('[TelemetryStore] fetchTelemetry START');

        try {
            const res = await fetch('/api/telemetry-live');

            const data = await res.json();

            console.log('[TelemetryStore] response', {
                ok: res.ok,
                success: data.success,
                sensorCount: data.sensors?.length
            });

            if (!res.ok || !data.success) {
                this.isDegraded = true;
                this.error =
                    data.warning ||
                    data.error ||
                    `Server error (${res.status})`;
                return;
            }

            this.isDegraded = false;
            this.error = null;

            if (Array.isArray(data.sensors)) {
                this.sensors = Object.fromEntries(
                    data.sensors.map((sensor: SensorNode) => [
                        sensor.id,
                        sensor
                    ])
                );
            }

            console.log('[TelemetryStore] sensors updated', this.sensors);
        } catch (err) {
            this.isDegraded = true;
            this.error = `Connection offline: ${(err as Error).message}`;

            console.error('[TelemetryStore] fetchTelemetry FAILED', err);
        }
    }

    private async poll(intervalMs: number) {
        if (!this.isPolling) return;

        console.log('[TelemetryStore] POLL');

        await this.fetchTelemetry();

        if (!this.isPolling) return;

        this.timer = setTimeout(() => {
            this.poll(intervalMs);
        }, intervalMs);
    }

    startPolling(intervalMs = 2000) {
        console.log('[TelemetryStore] START POLLING');

        if (this.isPolling) return;

        this.isPolling = true;
        this.poll(intervalMs);
    }

    stopPolling() {
        console.log('[TelemetryStore] STOP POLLING');

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.isPolling = false;
    }
}

export const telemetryStore = new TelemetryStore();

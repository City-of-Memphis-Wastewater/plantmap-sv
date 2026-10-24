export interface Status {
    protocolVersion: 1;

    application: {
        name: string;
        version: string;
    };

    runtime: {
        environment: 'development' | 'production';
        pid: number;
        uptimeSeconds: number;
    };

    server: {
        status: 'ready';
        startedAt: string;
    };

    capabilities: {
        plot: boolean;
        telemetry: boolean;
        liveStream: boolean;
    };
}

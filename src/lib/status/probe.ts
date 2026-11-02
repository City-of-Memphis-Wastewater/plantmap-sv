
import { bootstrapPlantMapConfig } from '../plantmap-sv/bootstrap.ts';
import { loadPlantMapConfig } from '../plantmap-sv/config.ts';

import type { AppStatus } from './types.ts';

export interface DiscoveredServer {
        host: string;
        port: number;
        url: string;
        status: AppStatus;
}

const PROTOCOL = 'http://';

function getTargets(): { host: string; port: number }[] {
        const config = loadPlantMapConfig(bootstrapPlantMapConfig());

        const hosts = [...new Set([
                '127.0.0.1',
                config.appServer.host
        ])];

        const ports = [...new Set([
                config.appServer.devPort,
                config.appServer.prodPort
        ])];

        return hosts.flatMap((host) =>
                ports.map((port) => ({ host, port }))
        );
}

async function probeServer(
        host: string,
        port: number
): Promise<DiscoveredServer | null> {
        const baseUrl = `${PROTOCOL}${host}:${port}`;
        const url = `${baseUrl}/api/status`;

        try {
                const response = await fetch(url, {
                        signal: AbortSignal.timeout(1500)
                });

                if (!response.ok) return null;

                const status = (await response.json()) as AppStatus;

                if (
                        status.protocolVersion !== 1 ||
                        status.application?.name !== 'plantmap-sv' ||
                        status.server?.status !== 'ready'
                ) {
                        return null;
                }

                return { host, port, url: baseUrl, status };
        } catch {
                return null;
        }
}

export async function discoverServer(): Promise<DiscoveredServer | null> {
        for (const { host, port } of getTargets()) {
                const server = await probeServer(host, port);

                if (server) return server;
        }

        return null;
}

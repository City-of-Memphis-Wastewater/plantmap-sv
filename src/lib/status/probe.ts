import { bootstrapPlantMapConfig } from '../plantmap-sv/bootstrap.ts';
import { loadPlantMapConfig } from '../plantmap-sv/config.ts';

import type { Status } from './types.ts';

export interface DiscoveredServer {
	host: string;
	port: number;
	url: string;
	status: Status;
}

function getPorts(): number[] {
	const config = loadPlantMapConfig(bootstrapPlantMapConfig());

	return [...new Set([config.devServer.port, config.prodServer.port])];
}

async function probeServer(port: number): Promise<DiscoveredServer | null> {
	const host = '127.0.0.1';
	const url = `http://${host}:${port}/api/status`;

	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(1500)
		});

		if (!response.ok) return null;

		const status = (await response.json()) as Status;

		if (
			status.protocolVersion !== 1 ||
			status.application?.name !== 'plantmap-sv' ||
			status.server?.status !== 'ready'
		) {
			return null;
		}

		return { host, port, url: `http://${host}:${port}`, status };
	} catch {
		return null;
	}
}

export async function discoverServer(): Promise<DiscoveredServer | null> {
	for (const port of getPorts()) {
		const server = await probeServer(port);

		if (server) return server;
	}

	return null;
}

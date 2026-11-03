//
// Something like "curl http://172.19.4.127:4000/api/status | jq ."
// but href /api/status/
//

import { discoverServer } from '../status/probe.ts';
import type { AppStatus } from '../status/types.ts';

export async function status(): Promise<void> {
	const relativeUrl = `/api/status/`;

	console.log(`PlantMap status relative URL:\n${relativeUrl}\n`);

	const server = await discoverServer();

	if (!server) {
		console.log(
			'PlantMap server is not running locally. Open the URL above when the server is available.'
		);
		return;
	}

	const url = new URL(relativeUrl, server.url);

	console.log(`Getting PlantMap status:\n${url}`);

	let response: Response;

	try {
		response = await fetch(url);
	} catch (error) {
		throw new Error(
			`Could not contact the PlantMap server: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}

	if (!response.ok) {
		throw new Error(`Status request failed (HTTP ${response.status}): ${response.statusText}`);
	}

	let data: AppStatus;

	try {
		data = (await response.json()) as AppStatus;
	} catch {
		throw new Error('PlantMap returned an invalid JSON status response.');
	}

	console.log(data);
}

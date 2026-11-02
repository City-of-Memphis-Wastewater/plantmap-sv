//
// Something like "curl http://172.19.4.127:4000/api/status | jq ."
// but href /api/status/
//

import { discoverServer } from '../status/probe.ts';
import { openUrl } from '../../lib/utils/launch.ts';

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

    //const statusUrl = `${server.url}${relativeUrl}`;
    const statusUrl = new URL(relativeUrl, server.url)

    console.log(`Getting PlantMap status:\n${statusUrl}`);

    //openUrl(statusUrl);

    console.log(statusUrl.toString());

    let response: Response;

    try { 
        response = await fetch(statusUrl);
    } catch (error) { 
        throw new Error(
            `Could not contact the PlantMap server: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
    console.log(response)

    if (!response.ok) {
        const message = await readErrorMessage(response);

        throw new Error(
            `${format.toUpperCase()} download failed (HTTP ${response.status}): ${message}`
        );
    }

    const data = Buffer.from(await response.arrayBuffer());

    if (data.length === 0) {
        throw new Error(`The server returned an empty ${format.toUpperCase()} response.`);
    }
}

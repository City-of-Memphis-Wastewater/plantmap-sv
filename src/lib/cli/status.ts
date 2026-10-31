// 
// Something like "curl http://172.19.4.127:4000/api/status | jq ."
// but href /api/status/

import { discoverServer } from '../status/probe.ts';
import { openUrl } from '../lib/utils/launch.ts';

//
// Suggest known config combos and as least print the url
//

export function status(): null {
    const server = discoverServer();
    const relativeUrl = `/api/status/`;

    console.log(`PlantMap status relative URL:\n${relativeUrl}\n`);

    if (!server) {
            console.log(
                    'PlantMap server is not running locally. Open the URL above when the server is available.'
            );
            return;
    }

    const statusUrl = `${server.url}${relativeUrl}`;
    console.log(`Getting PlantMap status:\n${plotUrl.toString()}`);
    openUrl(statusUrl.toString());    
}

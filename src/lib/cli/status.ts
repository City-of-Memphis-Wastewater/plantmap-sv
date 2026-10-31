// 
// Something like "curl http://172.19.4.127:4000/api/status | jq ."
// but href /api/status/

import { discoverServer } from '../status/probe.ts';

//
// Suggest known config combos and as least print the url
//

export function status(): null {
    console.log('/api/status/');
    const server = discoverServer();
    
}

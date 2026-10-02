// route/api/test-memphis-config
import os from 'node:os';
import path from 'node:path';

import { json } from '@sveltejs/kit';
import { MemphisConfig } from '$lib/memphis-config';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {

    const appConfig = new MemphisConfig({
        appDir: path.join(os.homedir(), '.plantmap')
    });


    appConfig.setValue(
        'eds.baseUrl',
        'http://172.19.4.127'
    );

    appConfig.setValue(
        'eds.port',
        43080
    );


     return json({
        
        app: {
            baseUrl: appConfig.value('eds.baseUrl'),
            port: appConfig.value('eds.port')
        }
    });
};
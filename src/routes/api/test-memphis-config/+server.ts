// route/api/test-memphis-config


import { json } from '@sveltejs/kit';
import { MemphisConfig } from '$lib/memphis-config';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
    const config = new MemphisConfig();

    const before = config.value('eds.endpoint');

    config.setValue(
        'eds.endpoint',
        'http://172.19.4.127:43080'
    );

    const after = config.value('eds.endpoint');

    return json({
        before,
        after
    });
};
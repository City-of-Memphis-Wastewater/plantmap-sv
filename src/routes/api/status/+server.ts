// src/routes/api/status/+server.ts

import packageJson from '../../../../package.json';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { dev } from '$app/environment';
import type { Status } from '$lib/status/types';

const startedAt = new Date().toISOString();

export const GET: RequestHandler = () => {
    const status: Status = {
        protocolVersion: 1,

        application: {
            name: packageJson.name,
            version: packageJson.version
        },

        runtime: {
            environment: dev ? 'development' : 'production',
            pid: process.pid,
            uptimeSeconds: Math.floor(process.uptime())
        },

        server: {
            status: 'ready',
            startedAt
        },

        capabilities: {
            plot: true,
            telemetry: true,
            liveStream: true
        }
    };

    return json(status, {
        headers: {
            'Cache-Control': 'no-store'
        }
    });
};

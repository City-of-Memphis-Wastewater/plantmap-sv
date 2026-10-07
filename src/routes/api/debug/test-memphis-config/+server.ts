// route/api/debug/test-memphis-config/+server.ts

import os from 'node:os';
import path from 'node:path';

import { json } from '@sveltejs/kit';
import { MemphisConfig } from '$lib/memphis-config';
import { MemphisEnv } from '$lib/memphis-env';
//import { MemphisSecret } from '$lib/memphis-secret';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const env = new MemphisEnv();

	const config = new MemphisConfig({
		appDir: path.join(os.homedir(), '.plantmap')
	});

	config.setValue('eds.soapPort', 43080);
	config.setValue('eds.suffix', '.UNIT0@NET0');
	config.setValue('eds.debug', false);
	config.setValue('server.port', 5173);

	return json({
		app: {
			baseUrl: env.value('OVATION_EDS_BASE_URL'),
			soapPort: config.value('eds.soapPort')
		}
	});
};

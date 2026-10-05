// src/lib/cli/setup.ts

import os from 'node:os';
import path from 'node:path';

import { input, password, confirm, number } from '@inquirer/prompts';

import { MemphisConfig } from '$lib/memphis-config';
import { MemphisEnv } from '$lib/memphis-env';

export async function setup() {
	const appDir = path.join(os.homedir(), '.plantmap');

	const config = new MemphisConfig({
		appDir
	});

	const env = new MemphisEnv();

	const baseUrl = await input({
		message: 'Ovation EDS endpoint baseUrl:',
		default: 'http://127.0.0.1'
	});

	const soapPort = await number({
		message: 'Ovation EDS endpoint port:',
		default: (config.value('eds.soapPort') as number | undefined) ?? 43080
	});

	if (soapPort === undefined) {
		throw new Error('Ovation EDS port is required');
	}

	const username = await password({
		message: 'Ovation EDS username:'
	});

	const edsPassword = await password({
		message: 'Ovation EDS password:'
	});

	const suffix = await input({
		message: 'Ovation EDS suffix:',
		default: (config.value('eds.suffix') as string | undefined) ?? '.UNIT0@NET0'
	});

	const debug = await confirm({
		message: 'Enable EDS debugging?',
		default: (config.value('eds.debug') as boolean | undefined) ?? false
	});

	env.setValue('OVATION_EDS_BASE_URL', baseUrl);

	env.setValue('OVATION_EDS_USERNAME', username);

	env.setValue('OVATION_EDS_PASSWORD', edsPassword);

	config.setValue('eds.soapPort', soapPort);

	config.setValue('eds.suffix', suffix);

	config.setValue('eds.debug', debug);
}

// src/lib/cli/setup.ts

import os from 'node:os';
import path from 'node:path';

import { input, password, confirm, number } from '@inquirer/prompts';

import { MemphisConfig } from '../memphis-config/index.ts';
import { MemphisEnv } from '../memphis-env/index.ts';
import { MemphisSecret } from '../memphis-secret/index.ts';

export async function setup() {
	const appDir = path.join(os.homedir(), '.plantmap');

	const config = new MemphisConfig({
		appDir
	});

	const env = new MemphisEnv();

	const secret = new MemphisSecret({
		appDir
	});

	// --- Inputs ---

	const baseUrl = await input({
		message: 'Ovation EDS endpoint baseUrl:',
		default: env.value('OVATION_EDS_BASE_URL') ?? '127.0.0.1'
	});

	const soapPort = await number({
		message: 'Ovation EDS endpoint port:',
		default: (config.value('eds.soapPort') as number | undefined) ?? 43080
	});

	if (soapPort === undefined) {
		throw new Error('Ovation EDS port is required');
	}

	const existingUsername = secret.value('eds', 'username');
	const existingPassword = secret.value('eds', 'password');

	const username = await password({
		message: existingUsername
			? 'Ovation EDS username (Enter to keep existing):'
			: 'Ovation EDS username:'
	});

	const edsPassword = await password({
		message: existingPassword
			? 'Ovation EDS password (Enter to keep existing):'
			: 'Ovation EDS password:'
	});

	const suffix = await input({
		message: 'Ovation EDS suffix:',
		default: (config.value('eds.suffix') as string | undefined) ?? '.UNIT0@NET0'
	});

	const debug = await confirm({
		message: 'Enable EDS debugging?',
		default: (config.value('eds.debug') as boolean | undefined) ?? false
	});

	const appPort = await input({
		message: 'Host server port for this app:',
		default: (config.value('server.port') as string | undefined) ?? '3000'
	});

	// --- Save ---

	env.setValue('OVATION_EDS_BASE_URL', baseUrl);

	if (username !== '' || edsPassword !== '') {
		secret.initializeVault();
	}

	if (username !== '') {
		secret.setValue('eds', 'username', username);
	}

	if (edsPassword !== '') {
		secret.setValue('eds', 'password', edsPassword);
	}

	config.setValue('eds.soapPort', soapPort);

	config.setValue('eds.suffix', suffix);

	config.setValue('eds.debug', debug);

    config.setValue('server.port', appPort);
}

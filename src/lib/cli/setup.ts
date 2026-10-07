// src/lib/cli/setup.ts

import os from 'node:os';
import path from 'node:path';

import { input, password, confirm, number } from '@inquirer/prompts';

import {
        bootstrapPlantMapConfig,
        bootstrapPlantMapSecret
} from '../plantmap/bootstrap';

export async function setup() {
	
    const config = bootstrapPlantMapConfig();
    const secret = bootstrapPlantMapSecret();
        
	// --- Inputs ---

	const protocol = await input({
		message: 'Ovation EDS endpoint protocol:',
		default: (config.value('eds.protocol') as string | undefined) ?? 'http://'
	});

	const host = await input({
		message: 'Ovation EDS endpoint host address:',
		default: (config.value('eds.host') as string | undefined) ?? '127.0.0.1'
	});

	const soapPort = await number({
		message: 'Ovation EDS SOAP API port:',
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

	const appPort = await number({
		message: 'Host server port for this app:',
		default: (config.value('server.port') as number | undefined) ?? 3000
	});

	if (appPort === undefined) {
		throw new Error('Host server port is required');
	}

	const debug = await confirm({
		message: 'Enable EDS debugging?',
		default: (config.value('eds.debug') as boolean | undefined) ?? false
	});

	// --- Save ---

	//env.setValue('OVATION_EDS_BASE_URL', baseUrl);

	config.setValue('eds.protocol', protocol);

	config.setValue('eds.host', host);

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

	config.setValue('server.port', appPort);

	config.setValue('eds.debug', debug);
}

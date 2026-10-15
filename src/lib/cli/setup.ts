// src/lib/cli/setup.ts

import { input, password, confirm, number } from '@inquirer/prompts';

import { bootstrapPlantMapConfig, bootstrapPlantMapSecret } from '../plantmap/bootstrap.ts';

export async function setup() {
	const config = bootstrapPlantMapConfig();
	const secret = bootstrapPlantMapSecret();

	// --- Inputs ---

	const protocol = await input({
		message: 'Ovation EDS endpoint protocol:',
		default: (config.value('eds', 'protocol') as string | undefined) ?? 'http://'
	});

	const host = await input({
		message: 'Ovation EDS endpoint host address:',
		default: (config.value('eds', 'host') as string | undefined) ?? '127.0.0.1'
	});

	const soapPort = await number({
		message: 'Ovation EDS SOAP API port:',
		default: (config.value('eds', 'soapPort') as number | undefined) ?? 43080
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
		default: (config.value('eds', 'suffix') as string | undefined) ?? '.UNIT0@NET0'
	});

	const prodPort = await number({
		message: 'Production server port for this app:',
		default: (config.value('prodServer', 'port') as number | undefined) ?? 4000
	});

	if (prodPort === undefined) {
		throw new Error('Production server port is required');
	}

	const devPort = await number({
		message: 'Development server port for this app:',
		default: (config.value('devServer', 'port') as number | undefined) ?? 5173
	});

	if (devPort === undefined) {
		throw new Error('Development server port is required');
	}

	const debug = await confirm({
		message: 'Enable EDS debugging?',
		default: (config.value('eds', 'debug') as boolean | undefined) ?? false
	});

	// --- Save ---

	//env.setValue('OVATION_EDS_BASE_URL', baseUrl, { overwrite: true });

	config.setValue('eds', 'protocol', protocol, { overwrite: true });

	config.setValue('eds', 'host', host, { overwrite: true });

	if (username !== '' || edsPassword !== '') {
		secret.initializeVault();
	}

	if (username !== '') {
		secret.setValue('eds', 'username', username, { overwrite: true });
	}

	if (edsPassword !== '') {
		secret.setValue('eds', 'password', edsPassword, { overwrite: true });
	}

	config.setValue('eds', 'soapPort', soapPort, { overwrite: true });

	config.setValue('eds', 'suffix', suffix, { overwrite: true });

	config.setValue('devServer', 'port', devPort, { overwrite: true });

	config.setValue('prodServer', 'port', prodPort, { overwrite: true });

	config.setValue('eds', 'debug', debug, { overwrite: true });
}

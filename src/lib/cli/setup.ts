// src/lib/cli/setup.ts

import { input, password, confirm, number } from '@inquirer/prompts';

import { bootstrapPlantMapConfig, bootstrapPlantMapSecret } from '../plantmap-sv/bootstrap.ts';

import {
    VAULT_SERVICE as EMAIL_VAULT_SERVICE,
    VAULT_SENDER_ADDRESS_ITEM,
    VAULT_PASSWORD_ITEM,
    CONFIG_SERVICE as EMAIL_CONFIG_SERVICE,
    CONFIG_SMTP_HOST_ITEM,
    CONFIG_SMTP_PORT_ITEM,
    CONFIG_SMTP_SECURITY_ITEM
} from '../email/settings.ts';

function validatePort(value: number | undefined, name: string): number {
	if (value === undefined || !Number.isInteger(value) || value < 1 || value > 65535) {
		throw new Error(`${name} must be an integer between 1 and 65535`);
	}

	return value;
}

export async function setup() {
	const config = bootstrapPlantMapConfig();
	const secret = bootstrapPlantMapSecret();

	// --- Inputs ---
    
    console.log(`--- EDS Configuration ---`)
    console.log(`This app relies on calling an Emerson Ovation EDS server.`)

	const edsProtocol = await input({
		message: 'Ovation EDS endpoint protocol:',
		default: (config.value('eds', 'protocol') as string | undefined) ?? 'http://'
	});

	const edsHost = await input({
		message: 'Ovation EDS endpoint host address:',
		default: (config.value('eds', 'host') as string | undefined) ?? '127.0.0.1'
	});
    

	const edsSoapPort = validatePort(
		await number({
			message: 'Ovation EDS SOAP API port:',
			default: (config.value('eds', 'soapPort') as number | undefined) ?? 43080
		}),
		'Ovation EDS SOAP API port'
	);

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

	const iessSuffix = await input({
		message: 'Ovation EDS IDCS to IESS suffix:',
		default: (config.value('eds', 'iessSuffix') as string | undefined) ?? '.UNIT0@NET0'
	});

    console.log(`\n--- Plantmap-SV Self-Hosted Application Configuration ---`)
    const appProtocol = await input({
		message: 'Endpoint protocol for this app:',
		default: (config.value('appServer', 'protocol') as string | undefined) ?? 'https://'
	});

	const appHost = await input({
		message: 'Endpoint host address for this app:',
		default: (config.value('appServer', 'host') as string | undefined) ?? config.value('eds', 'host') as string | undefined ?? '127.0.0.1'
	});

	const appProdPort = validatePort(
		await number({
			message: 'Production server port for this app:',
			default: (config.value('appServer', 'prodPort') as number | undefined) ?? 4000
		}),
		'Production server port'
	);

	const appDevPort = validatePort(
		await number({
			message: 'Development server port for this app:',
			default: (config.value('appServer', 'devPort') as number | undefined) ?? 5173
		}),
		'Development server port'
	);

	const appDebug = await confirm({
		message: 'Enable debugging for this app?',
		default: (config.value('appServer', 'debug') as boolean | undefined) ?? false
	});

    console.log(`\n--- Email Reporting Configuration ---`)
    // make it optional to even provide 
    
    const existingEmailSender = secret.value(EMAIL_VAULT_SERVICE, VAULT_SENDER_ADDRESS_ITEM);
	const existingEmailPassword = secret.value(EMAIL_VAULT_SERVICE, VAULT_PASSWORD_ITEM);

    const emailSmtpSenderEmail = await password({
		message: existingEmailSender
			? 'Email SMTP sender address (Enter to keep existing):'
			: 'Email SMTP sender address:'
	});

    const emailSmtpPassword = await password({
		message: existingEmailPassword
			? 'Email SMTP password (Enter to keep existing):'
			: 'Email SMTP password:'
	});

    const emailSmtpHost = await input({
		message: 'SMTP host for emailing reports:',
		default: (config.value(EMAIL_CONFIG_SERVICE, CONFIG_SMTP_HOST_ITEM) as string | undefined) ?? 'smtp.gmail.com'
	});
    

    const emailSmtpPort = validatePort(
		await number({
			message: 'SMTP port for emailing reports:',
			default: (config.value(EMAIL_CONFIG_SERVICE, CONFIG_SMTP_PORT_ITEM) as number | undefined) ?? 587
		}),
		'Development server port'
	);

    const emailSmtpSecurity = await input({
		message: 'SMTP security config for emailing reports:',
		default: (config.value(EMAIL_CONFIG_SERVICE, CONFIG_SMTP_SECURITY_ITEM) as string | undefined) ?? 'starttls'
	});

	// --- Save ---

	config.setValue('eds', 'protocol', edsProtocol, { overwrite: true });

	config.setValue('eds', 'host', edsHost, { overwrite: true });
    
    config.setValue('eds', 'soapPort', edsSoapPort, { overwrite: true });

	if (username !== '') {
		secret.initializeVault();
	}

	if (username !== '') {
		secret.setValue('eds', 'username', username, { overwrite: true });
	}

	secret.setValue('eds', 'password', edsPassword, { overwrite: true });

	config.setValue('eds', 'iessSuffix', iessSuffix, { overwrite: true });

	config.setValue('appServer', 'protocol', appProtocol, { overwrite: true });

    config.setValue('appServer', 'host', appHost, { overwrite: true });

    config.setValue('appServer', 'devPort', appDevPort, { overwrite: true });

	config.setValue('appServer', 'prodPort', appProdPort, { overwrite: true });

	config.setValue('appServer', 'debug', appDebug, { overwrite: true });
    
    if (emailSmtpSenderEmail !== '') {
        secret.setValue(EMAIL_VAULT_SERVICE, VAULT_SENDER_ADDRESS_ITEM, emailSmtpSenderEmail, { overwrite: true });
    }

	secret.setValue(EMAIL_VAULT_SERVICE, VAULT_PASSWORD_ITEM, emailSmtpPassword, { overwrite: true }); 

    config.setValue(EMAIL_CONFIG_SERVICE, CONFIG_SMTP_HOST_ITEM, emailSmtpHost, { overwrite: true });

    config.setValue(EMAIL_CONFIG_SERVICE, CONFIG_SMTP_PORT_ITEM, emailSmtpPort, { overwrite: true });

    config.setValue(EMAIL_CONFIG_SERVICE, CONFIG_SMTP_SECURITY_ITEM, emailSmtpSecurity, { overwrite: true });
}

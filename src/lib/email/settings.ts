import { bootstrapPlantMapSecret, bootstrapPlantMapConfig } from '../plantmap-sv/bootstrap.ts';

export const VAULT_SERVICE = 'email';
export const VAULT_SENDER_ADDRESS_ITEM = 'send-address';
export const VAULT_PASSWORD_ITEM = 'send-password';
export const CONFIG_SERVICE = 'email';
export const CONFIG_SMTP_HOST_ITEM = 'smtp-host';
export const CONFIG_SMTP_PORT_ITEM = 'smtp-port';
export const CONFIG_SMTP_SECURITY_ITEM = 'smtp-security';

import type { EmailCredentials, EmailConfigs } from './types.ts';

export function getEmailCreds(): EmailCredentials {
	const secret = bootstrapPlantMapSecret();

	const sender_email_address = secret.value(VAULT_SERVICE, VAULT_SENDER_ADDRESS_ITEM);
	const sender_password = secret.value(VAULT_SERVICE, VAULT_PASSWORD_ITEM);

	return { sender_email_address, sender_password };
}

export function getEmailConfigs(): EmailConfigs {
	const config = bootstrapPlantMapConfig();

	const smtp_host = config.value(CONFIG_SERVICE, CONFIG_SMTP_HOST_ITEM) ?? 'smtp.gmail.com';
	const smtp_port = config.value(CONFIG_SERVICE, CONFIG_SMTP_PORT_ITEM) ?? 587;
	const smtp_security = config.value(CONFIG_SERVICE, CONFIG_SMTP_SECURITY_ITEM) ?? 'starttls';

	return { smtp_host, smtp_port, smtp_security };
}

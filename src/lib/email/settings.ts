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
    
    //console.log({
    //    hasSenderAddress: Boolean(sender_email_address),
    //    hasSenderPassword: Boolean(sender_password)
    //});
    
	return { sender_email_address, sender_password };
}

export function getEmailConfigs(): EmailConfigs {
    const config = bootstrapPlantMapConfig();

    const host = config.value(CONFIG_SERVICE, CONFIG_SMTP_HOST_ITEM);
    const port = config.value(CONFIG_SERVICE, CONFIG_SMTP_PORT_ITEM);
    const security = config.value(CONFIG_SERVICE, CONFIG_SMTP_SECURITY_ITEM);

    const smtp_host =
        typeof host === 'string' ? host : 'smtp.gmail.com';

    const smtp_port =
        typeof port === 'number' ? port : 587;

    const smtp_security =
        typeof security === 'string' ? security : 'starttls';

    return { smtp_host, smtp_port, smtp_security };
}

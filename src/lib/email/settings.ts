import { bootstrapPlantMapSecret } from '$lib/plantmap-sv/bootstrap';

const VAULT_SERVICE = "email"
const VAULT_SENDER_ADDRESS_ITEM = "send-address"
const VAULT_PASSWORD_ITEM = "send-password"
const CONFIG_SERVICE = "email"
const CONFIG_SMTP_HOST_ITEM = "smpt-host"
const CONFIG_SMTP_PORT_ITEM = "smpt-port"
const CONFIG_SMTP_SECURITY_ITEM = "smpt-security"

export interface EmailCredentials {
	email_address: string | undefined;
	password: string | undefined;
}

export function getEmailCreds(): EmailCredentials {
	const secret = bootstrapPlantMapSecret();
    const config = bootstrapPlantMapConfig();

	const email_address = secret.value(VAULT_SERVICE, VAULT_SENDER_ADDRESS_ITEM);
	const password = secret.value(VAULT_SERVICE, VAULT_PASSWORD_ITEM);
    const 
	return { email_address, password };
}

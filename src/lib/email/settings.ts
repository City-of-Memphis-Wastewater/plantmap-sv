import { bootstrapPlantMapSecret, bootstrapPlantMapConfig } from '$lib/plantmap-sv/bootstrap';

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

export interface EmailConfigs {
	smtp_host: string   ;
    smtp_port: number;
    smtp_security: string;
}

export function getEmailCreds(): EmailCredentials {
	const secret = bootstrapPlantMapSecret();

	const sender_email_address = secret.value(VAULT_SERVICE, VAULT_SENDER_ADDRESS_ITEM);
	const password = secret.value(VAULT_SERVICE, VAULT_PASSWORD_ITEM);
    
	return { sender_email_address, password };
}

export function getEmailConfigs(): EmailConfigs {
    const config = bootstrapPlantMapConfig();

    const smtp_host=config.value(CONFIG_SERVICE, CONFIG_SMTP_HOST_ITEM) ?? "smtp.gmail.com";
    const smtp_port=config.value(CONFIG_SERVICE, CONFIG_SMTP_PORT_ITEM) ?? 587;
    const smtp_security=config.value(CONFIG_SERVICE, CONFIG_SMTP_SECURITY_ITEM) ?? "starttls";

	return { smtp_host, smtp_port, smtp_security };
}

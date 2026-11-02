export interface EmailCredentials {
	sender_email_address: string | undefined;
	password: string | undefined;
}

export interface EmailConfigs {
	smtp_host: string;
	smtp_port: number;
	smtp_security: string;
}

export interface SendEmailOptions {
	recipient: string;
	attachments: string[];
	subject?: string;
	body?: string;
}

export interface SendEmailResult {
	messageId: string;
	accepted: string[];
	rejected: string[];
}

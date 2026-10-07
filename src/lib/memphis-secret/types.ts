// memphis-secret/types.ts

export type SecretValue = string;

export interface MemphisSecretOptions {
	appDir?: string;
}

export interface MemphisSecretSetOptions {
	overwrite?: boolean;
}

export interface MemphisSecretItem {
        service: string;
        item: string;
}

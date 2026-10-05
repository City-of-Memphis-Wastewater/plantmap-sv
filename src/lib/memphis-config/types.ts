// memphis-config/types.ts

export type ConfigValue =
	string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };

export interface MemphisConfigOptions {
	appDir?: string;
}

export interface MemphisConfigSetOptions {
	overwrite?: boolean;
}

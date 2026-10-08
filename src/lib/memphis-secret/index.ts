// src/lib/memphis-secret/index.ts

import os from 'node:os';

import { decrypt, encrypt, initializeKey } from './crypto.ts';
import {
	getCredential,
	initializeVault,
	isVaultInitialized,
	listCredentials,
	removeCredential,
	setCredential
} from './vault.ts';

import type {
	MemphisSecretItem,
	MemphisSecretOptions,
	MemphisSecretSetOptions,
	SecretValue
} from './types.ts';

export class MemphisSecret {
	private readonly appDir: string;

	constructor(options: MemphisSecretOptions = {}) {
		this.appDir = options.appDir ?? os.homedir();
	}

	public isInitialized(): boolean {
		return isVaultInitialized(this.appDir);
	}

	public initializeVault(): void {
		initializeKey(this.appDir);
		initializeVault(this.appDir);
	}

	public value(key: string): SecretValue | undefined;
	public value(service: string, item: string): SecretValue | undefined;

	public value(keyOrService: string, item?: string): SecretValue | undefined {
		const [service, secretItem] =
			item === undefined ? this.parseKey(keyOrService) : [keyOrService, item];

		const encrypted = getCredential(service, secretItem, this.appDir);

		if (!encrypted) {
			return undefined;
		}

		return decrypt(encrypted, this.appDir);
	}

	public setValue(key: string, value: SecretValue, options?: MemphisSecretSetOptions): void;

	public setValue(
		service: string,
		item: string,
		value: SecretValue,
		options?: MemphisSecretSetOptions
	): void;

	public setValue(
		keyOrService: string,
		valueOrItem: string,
		valueOrOptions?: SecretValue | MemphisSecretSetOptions,
		options: MemphisSecretSetOptions = {}
	): void {
		let service: string;
		let item: string;
		let value: SecretValue;
		let setOptions: MemphisSecretSetOptions;

		if (typeof valueOrOptions === 'string') {
			service = keyOrService;
			item = valueOrItem;
			value = valueOrOptions;
			setOptions = options;
		} else {
			[service, item] = this.parseKey(keyOrService);
			value = valueOrItem;
			setOptions = valueOrOptions ?? {};
		}

		const encrypted = encrypt(value, this.appDir);

		setCredential(service, item, encrypted, this.appDir, setOptions.overwrite ?? true);
	}

	public remove(key: string): boolean;
	public remove(service: string, item: string): boolean;

	public remove(keyOrService: string, item?: string): boolean {
		const [service, secretItem] =
			item === undefined ? this.parseKey(keyOrService) : [keyOrService, item];

		return removeCredential(service, secretItem, this.appDir);
	}

	public list(): MemphisSecretItem[] {
		return listCredentials(this.appDir);
	}

	private parseKey(key: string): [string, string] {
		const parts = key.split('.');

		if (key.trim() === '' || parts.length !== 2 || parts.some((part) => part.trim() === '')) {
			throw new Error('[memphis-secret] Secret key must use "service.item" format.');
		}

		return [parts[0], parts[1]];
	}
}

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

	/**
	 * Create a MemphisSecret instance.
	 *
	 * By default, the vault is stored under the user's home
	 * directory. An application-specific directory can be
	 * supplied when the application needs its own secret store.
	 *
	 * @param options Secret storage configuration.
	 */
	constructor(options: MemphisSecretOptions = {}) {
		this.appDir = options.appDir ?? os.homedir();
	}

	/**
	 * Check whether the secret vault has been initialized.
	 *
	 * This does not create the vault or encryption key.
	 */
	public isInitialized(): boolean {
		return isVaultInitialized(this.appDir);
	}

	/**
	 * Initialize the encryption key and secret vault.
	 *
	 * Existing key and vault files are preserved by the
	 * underlying initialization functions.
	 */
	public initializeVault(): void {
		initializeKey(this.appDir);
		initializeVault(this.appDir);
	}

	/**
	 * Retrieve a secret using dot notation.
	 *
	 * Example:
	 *
	 *     secret.value('eds','username');
	 *
	 * The first component identifies the service and the
	 * second component identifies the secret within that service.
	 */
	public value(key: string): SecretValue | undefined;

	/**
	 * Retrieve a secret using separate service and item names.
	 *
	 * This is equivalent to the dot-notation form:
	 *
	 *     secret.value('eds', 'username');
	 *
	 * is equivalent to:
	 *
	 *     secret.value('eds','username');
	 */
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

	/**
	 * Store a secret using dot notation.
	 *
	 * Existing secrets are overwritten by default.
	 *
	 * Example:
	 *
	 *     secret.setValue('eds','username', 'operator');
	 *
	 * Pass `{ overwrite: false }` to preserve an existing
	 * secret instead.
	 *
	 *     secret.setValue('eds','username', 'operator', {
	 *         overwrite: false
	 *     });
	 */
	public setValue(key: string, value: SecretValue, options?: MemphisSecretSetOptions): void;

	/**
	 * Store a secret using separate service and item names.
	 *
	 * This is equivalent to the dot-notation form:
	 *
	 *     secret.setValue('eds', 'username', 'operator');
	 *
	 * is equivalent to:
	 *
	 *     secret.setValue('eds','username', 'operator');
	 *
	 * Options may be supplied as the fourth argument.
	 */
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

	/**
	 * Remove a secret using dot notation.
	 *
	 * Returns `true` when the secret was removed and `false`
	 * when the requested secret did not exist.
	 *
	 * Example:
	 *
	 *     secret.remove('eds','username');
	 */
	public remove(key: string): boolean;

	/**
	 * Remove a secret using separate service and item names.
	 *
	 * This is equivalent to:
	 *
	 *     secret.remove('eds','username');
	 */
	public remove(service: string, item: string): boolean;

	public remove(keyOrService: string, item?: string): boolean {
		const [service, secretItem] =
			item === undefined ? this.parseKey(keyOrService) : [keyOrService, item];

		return removeCredential(service, secretItem, this.appDir);
	}

	/**
	 * List all stored secrets.
	 *
	 * Returns service/item identifiers only. Secret values
	 * are not returned by this method.
	 */
	public list(): MemphisSecretItem[] {
		return listCredentials(this.appDir);
	}

	/**
	 * Parse the public dot-notation form into the service/item
	 * representation used by the vault.
	 *
	 * A secret key must contain exactly two non-empty components:
	 *
	 *     service.item
	 *
	 * Examples:
	 *
	 *     eds.username
	 *     eds.password
	 */
	private parseKey(key: string): [string, string] {
		const parts = key.split('.');

		if (key.trim() === '' || parts.length !== 2 || parts.some((part) => part.trim() === '')) {
			throw new Error('[memphis-secret] Secret key must use "service.item" format.');
		}

		return [parts[0], parts[1]];
	}
}

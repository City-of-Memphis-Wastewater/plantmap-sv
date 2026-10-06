// memphis-secret/index.ts

import os from 'node:os';
import path from 'node:path';

import type { MemphisSecretOptions, MemphisSecretSetOptions, SecretValue } from './types';

export class MemphisSecret {
	private readonly secretDir: string;

	constructor(options: MemphisSecretOptions = {}) {
		const appDir = options.appDir ?? path.join(os.homedir(), '.plantmap');

		this.secretDir = path.join(appDir, '.memphis-secret');
	}

	public value(service: string, item: string): SecretValue | undefined {
		console.log(service);
		console.log(item);
		throw new Error('Not implemented');
	}

	public setValue(
		service: string,
		item: string,
		_value: SecretValue,
		options: MemphisSecretSetOptions = {}
	): void {
		console.log(service);
		console.log(item);
		console.log(options);
		throw new Error('Not implemented');
	}

	public remove(service: string, item: string): boolean {
		console.log(service);
		console.log(item);
		throw new Error('Not implemented');
	}
}

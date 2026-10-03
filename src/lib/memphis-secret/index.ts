// memphis-secret/index.ts

import os from 'node:os';
import path from 'node:path';

import type {
    MemphisSecretOptions,
    MemphisSecretSetOptions,
    SecretValue
} from './types';

export class MemphisSecret {
    private readonly secretDir: string;

    constructor(options: MemphisSecretOptions = {}) {
        const appDir =
            options.appDir ??
            path.join(os.homedir(), '.plantmap');

        this.secretDir = path.join(
            appDir,
            '.memphis-secret'
        );
    }

    public value(
        service: string,
        item: string
    ): SecretValue | undefined {
        throw new Error('Not implemented');
    }

    public setValue(
        service: string,
        item: string,
        value: SecretValue,
        options: MemphisSecretSetOptions = {}
    ): void {
        throw new Error('Not implemented');
    }

    public remove(
        service: string,
        item: string
    ): boolean {
        throw new Error('Not implemented');
    }
}

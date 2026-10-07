// src/lib/memphis-secret/index.ts

import os from 'node:os';
import path from 'node:path';

import {
    decrypt,
    encrypt,
    initializeKey,
} from './crypto';
import {
    getCredential,
    initializeVault,
    removeCredential,
    setCredential,
} from './vault';

import type {
    MemphisSecretOptions,
    MemphisSecretSetOptions,
    SecretValue,
} from './types';

export class MemphisSecret {
    private readonly appDir: string;

    constructor(options: MemphisSecretOptions = {}) {
        this.appDir = options.appDir ?? os.homedir();
    }

    public initializeVault(): void {
        initializeKey(this.appDir);
        initializeVault(this.appDir);
    }

    public value(
        service: string,
        item: string
    ): SecretValue | undefined {
        const encrypted = getCredential(
            service,
            item,
            this.appDir
        );

        if (!encrypted) {
            return undefined;
        }

        return decrypt(encrypted, this.appDir);
    }

    public setValue(
        service: string,
        item: string,
        value: SecretValue,
        options: MemphisSecretSetOptions = {}
    ): void {
        const encrypted = encrypt(value, this.appDir);

        setCredential(
            service,
            item,
            encrypted,
            this.appDir,
            options.overwrite ?? true
        );
    }

    public remove(
        service: string,
        item: string
    ): boolean {
        return removeCredential(
            service,
            item,
            this.appDir
        );
    }
}

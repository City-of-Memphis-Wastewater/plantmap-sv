// src/lib/memphis-secret/index.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type {
    MemphisSecretOptions,
    MemphisSecretSetOptions,
    SecretValue,
} from './types';

export class MemphisSecret {
    private readonly secretDir: string;
    private readonly vaultFile: string;
    private readonly keyFile: string;

    constructor(options: MemphisSecretOptions = {}) {
        const baseDir = options.appDir ?? os.homedir();

        this.secretDir = path.join(baseDir, '.memphis-secret');
        this.vaultFile = path.join(this.secretDir, 'vault.db');
        this.keyFile = path.join(this.secretDir, '.key');
    }

    public initialize(): void {
        mkdirSync(this.secretDir, { recursive: true });

        if (!existsSync(this.vaultFile)) {
            // Create vault database.
        }

        if (!existsSync(this.keyFile)) {
            // Generate and store encryption key.
        }
    }

    public value(service: string, item: string): SecretValue | undefined {
        // Read/decrypt service + item from vault.db.
        throw new Error('Not implemented');
    }

    public setValue(
        service: string,
        item: string,
        value: SecretValue,
        options: MemphisSecretSetOptions = {}
    ): void {
        // Encrypt and store service + item in vault.db.
        throw new Error('Not implemented');
    }

    public remove(service: string, item: string): boolean {
        // Remove service + item from vault.db.
        throw new Error('Not implemented');
    }
}

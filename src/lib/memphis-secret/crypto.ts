// src/lib/memphis-secret/crypto.ts

import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from 'node:crypto';
import {
    chmodSync,
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
} from 'node:fs';

import { 
    getKeyPath,
    getSecretDir,
} from './paths.ts';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function loadKey(appDir?: string): Buffer {
    const keyPath = getKeyPath(appDir);

    if (!existsSync(keyPath)) {
        throw new Error(
            `[memphis-secret] Encryption key does not exist: ${keyPath}\n` +
                `[memphis-secret] Initialize the vault explicitly before using secrets.`
        );
    }

    const key = readFileSync(keyPath);

    if (key.length !== KEY_LENGTH) {
        throw new Error(
            `[memphis-secret] Invalid encryption key: ${keyPath}\n` +
                `[memphis-secret] Expected ${KEY_LENGTH} bytes, found ${key.length}.`
        );
    }

    return key;
}

export function initializeKey(appDir?: string): void {
    const keyPath = getKeyPath(appDir);

    if (existsSync(keyPath)) {
        console.log(`[memphis-secret] Encryption key already exists: ${keyPath}`);
        return;
    }

    
    const key = randomBytes(KEY_LENGTH);

    mkdirSync(getSecretDir(appDir), { recursive: true });

    writeFileSync(keyPath, key, {
        mode: 0o600,
    });

    // Ensure permissions are correct even if the file somehow already existed
    // or the platform did not honor the write mode.
    try {
        chmodSync(keyPath, 0o600);
    } catch {
        // Windows does not use POSIX file permissions.
    }

    console.log(`[memphis-secret] Encryption key initialized: ${keyPath}`);
}

export function encrypt(
    value: string,
    appDir?: string
): Buffer {
    const key = loadKey(appDir);
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([
        iv,
        authTag,
        ciphertext,
    ]);
}

export function decrypt(
    encrypted: Uint8Array,
    appDir?: string
): string {
    const key = loadKey(appDir);
    const payload = Buffer.from(encrypted);

    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error(
            '[memphis-secret] Invalid encrypted credential: payload is too short.'
        );
    }

    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(
        IV_LENGTH,
        IV_LENGTH + AUTH_TAG_LENGTH
    );
    const ciphertext = payload.subarray(
        IV_LENGTH + AUTH_TAG_LENGTH
    );

    try {
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        return Buffer.concat([
            decipher.update(ciphertext),
            decipher.final(),
        ]).toString('utf8');
    } catch {
        throw new Error(
            '[memphis-secret] Unable to decrypt credential. ' +
                'The vault key may be incorrect or the credential data may be corrupted.'
        );
    }
}

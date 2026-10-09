// src/lib/memphis-secret/vault.ts

import { existsSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { getSecretDir, getVaultPath } from './paths.ts';
import type { MemphisSecretItem } from './types.ts';

const SCHEMA_VERSION = 1;

export interface VaultCredential {
	service: string;
	item: string;
	encryptedSecret: Buffer;
}

export function isVaultInitialized(appDir?: string): boolean {
	return existsSync(getVaultPath(appDir));
}

function createVault(appDir?: string): DatabaseSync {
	const secretDir = getSecretDir(appDir);
	const vaultPath = getVaultPath(appDir);

	mkdirSync(secretDir, { recursive: true });

	console.log(`[memphis-secret] Creating vault: ${vaultPath}`);

	const database = new DatabaseSync(vaultPath);

	database.exec(`
        CREATE TABLE IF NOT EXISTS credentials (
            service TEXT NOT NULL,
            item TEXT NOT NULL,
            encrypted_secret BLOB NOT NULL,
            PRIMARY KEY (service, item)
        );

        PRAGMA user_version = ${SCHEMA_VERSION};
    `);

	console.log(`[memphis-secret] Vault initialized: ${vaultPath}`);

	return database;
}

function requireVault(appDir?: string): void {
	const vaultPath = getVaultPath(appDir);

	if (!existsSync(vaultPath)) {
		throw new Error(
			`[memphis-secret] Vault does not exist: ${vaultPath}\n` +
				`[memphis-secret] Initialize it explicitly before storing or retrieving secrets.`,
			{}
		);
	}
}

function openVaultIfExists(appDir?: string): DatabaseSync | undefined {
	const vaultPath = getVaultPath(appDir);

	if (!existsSync(vaultPath)) {
		return undefined;
	}

	return new DatabaseSync(vaultPath);
}

function openVault(appDir?: string): DatabaseSync {
	requireVault(appDir);

	return new DatabaseSync(getVaultPath(appDir));
}

export function initializeVault(appDir?: string): void {
	const vaultPath = getVaultPath(appDir);

	if (existsSync(vaultPath)) {
		console.log(`[memphis-secret] Vault already exists: ${vaultPath}`);
		return;
	}

	const database = createVault(appDir);
	database.close();
}

export function getCredential(service: string, item: string, appDir?: string): Buffer | undefined {
	//const database = openVault(appDir);

	// ---
	const database = openVaultIfExists(appDir);

	if (!database) {
		console.log(`[memphis-secret] Vault does not exist: ${getVaultPath(appDir)}`);
		return undefined;
	}
	// ---

	try {
		const statement = database.prepare(`
            SELECT encrypted_secret
            FROM credentials
            WHERE service = ? AND item = ?
        `);

		const row = statement.get(service, item) as { encrypted_secret: Buffer } | undefined;

		if (!row) {
			console.log(`[memphis-secret] Credential not found: ${service}/${item}`);
			return undefined;
		}

		return row.encrypted_secret;
	} finally {
		database.close();
	}
}

export function setCredential(
	service: string,
	item: string,
	encryptedSecret: Buffer,
	appDir?: string,
	overwrite = true
): void {
	const database = openVault(appDir);

	try {
		if (overwrite) {
			const statement = database.prepare(`
                INSERT OR REPLACE INTO credentials
                    (service, item, encrypted_secret)
                VALUES (?, ?, ?)
            `);

			statement.run(service, item, encryptedSecret);

			console.log(`[memphis-secret] Credential stored: ${service}/${item}`);

			return;
		}

		const statement = database.prepare(`
            INSERT INTO credentials
                (service, item, encrypted_secret)
            VALUES (?, ?, ?)
        `);

		try {
			statement.run(service, item, encryptedSecret);
		} catch (error) {
			if (error instanceof Error && error.message.includes('UNIQUE')) {
				throw new Error(`[memphis-secret] Credential already exists: ${service}/${item}`, {
					cause: error
				});
			}

			throw error;
		}

		console.log(`[memphis-secret] Credential stored: ${service}/${item}`);
	} finally {
		database.close();
	}
}

export function removeCredential(service: string, item: string, appDir?: string): boolean {
	const database = openVault(appDir);

	try {
		const statement = database.prepare(`
            DELETE FROM credentials
            WHERE service = ? AND item = ?
        `);

		const result = statement.run(service, item);

		if (result.changes > 0) {
			console.log(`[memphis-secret] Credential removed: ${service}/${item}`);
			return true;
		}

		console.log(`[memphis-secret] Credential not found: ${service}/${item}`);

		return false;
	} finally {
		database.close();
	}
}

export function listCredentials(appDir?: string): MemphisSecretItem[] {
	const database = openVault(appDir);

	try {
		const statement = database.prepare(`
            SELECT service, item
            FROM credentials
            ORDER BY service, item
        `);

		const rows = statement.all() as Array<{
			service: string;
			item: string;
		}>;

		const credentials: MemphisSecretItem[] = rows.map((row) => ({
			service: row.service,
			item: row.item
		}));

		console.log(
			`[memphis-secret] Found ${credentials.length} credential${
				credentials.length === 1 ? '' : 's'
			}`
		);

		return credentials;
	} finally {
		database.close();
	}
}

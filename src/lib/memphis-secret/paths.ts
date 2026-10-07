import os from 'node:os';
import path from 'node:path';

export function getSecretDir(appDir?: string): string {
	return path.join(appDir ?? os.homedir(), '.memphis-secret');
}

export function getVaultPath(appDir?: string): string {
	return path.join(getSecretDir(appDir), 'vault.db');
}

export function getKeyPath(appDir?: string): string {
	return path.join(getSecretDir(appDir), '.key');
}

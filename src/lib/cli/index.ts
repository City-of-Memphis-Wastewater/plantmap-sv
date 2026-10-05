// cli/index.ts
import { setup } from './setup';

export async function runCli(command: string) {
	switch (command) {
		case 'setup':
			return setup();

		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

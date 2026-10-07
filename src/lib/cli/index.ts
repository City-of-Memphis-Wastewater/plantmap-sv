// src/lib/cli/index.ts

import { setup } from './setup.ts';
import { secret } from './secret.ts';
import { config } from './config.ts';

export async function runCli(args: string[]) {
	const [command = 'help'] = args;

	switch (command) {
		case 'setup':
			await setup();
			return;

		case 'secret':
			secret();
			return;

		case 'config':
            config();
            return;

		case 'start':
			// await start();
			return;

		case 'help':
			printHelp();
			return;

		default:
			console.error(`Unknown command: ${command}`);
			console.error('');
			printHelp();
			process.exitCode = 1;
	}
}

function printHelp() {
	console.log(`
PlantMap

Usage:
  plantmap <command>

Commands:
  setup     Configure PlantMap
  secret    List secrets stored in app dir
  config    List config values stored in app dir
  start     Start PlantMap
  help      Show this help
`);
}

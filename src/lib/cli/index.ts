// src/lib/cli/index.ts

import { setup } from './setup.ts';

export async function runCli(args: string[]) {
	const [command = 'help'] = args;

	switch (command) {
		case 'setup':
			await setup();
			return;

		case 'config':
			// await config();
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
  config    Show or edit configuration
  start     Start PlantMap
  help      Show this help
`);
}

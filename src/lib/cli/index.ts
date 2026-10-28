// src/lib/cli/index.ts

import { setup } from './setup.ts';
import { secret } from './secret.ts';
import { config } from './config.ts';
import { start } from './start.ts';
import { plot } from './plot.ts';
import { download } from './download.ts';

export async function runCli(args: string[]) {
	const [command = 'help'] = args;

	switch (command) {
		case 'setup':
			await setup();
			return;

		case 'plot':
			plot(args.slice(1));
			return;

		case 'download':
			await download(args.slice(1));
			break;

		case 'secret':
			secret();
			return;

		case 'config':
			config();
			return;

		case 'start':
			start(args.slice(1));
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
  start     Start the production server.
  setup     Configure PlantMap.
  plot      Call plant data by tags and time aspects.
  secret    List secrets stored in app dir.
  config    List config values stored in app dir.
  help      Show this help.
`);
}

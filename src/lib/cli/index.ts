// src/lib/cli/index.ts

import { setup } from './setup.ts';
import { secret } from './secret.ts';
import { config } from './config.ts';
import { start } from './start.ts';
import { status } from './status.ts';
import { email } from './email.ts';
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

        case 'status':
			status();
			return;

        case 'email':
			email(args.slice(1));
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
  plot      Plot plant data by tags and time aspects, converted to URL.
  download  Download plant data by tags and time aspects, converted to URL.
  secret    List secrets stored in app dir.
  config    List config values stored in app dir.
  status    Pending, call status endpoint at /api/status/
  email     Send file to target, using configured gmail and app settings.  
  help      Show this help.
`);
}

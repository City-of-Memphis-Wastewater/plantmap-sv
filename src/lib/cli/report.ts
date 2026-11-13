import process from 'node:process';

import { runReport } from '../report/runner.ts';

function printHelp(): void {
	console.log(`
Usage:
  plantmap-sv report [name] [options]

Arguments:
  name                  Report name (default: default)
                        Loads ~/.plantmap-sv/reports/<name>.json
                        An absolute JSON file path is also accepted.

Options:
  --dry-run             Download and validate files, but do not send email.
  --help, -h            Show this help.

Examples:
  plantmap-sv report
  plantmap-sv report --dry-run
  plantmap-sv report t-weekly
  plantmap-sv report t-weekly --dry-run
`);
}

export async function report(args: string[] = []): Promise<void> {
	try {
		let identifier = 'default';
		let dryRun = false;
		let nameProvided = false;

		for (const arg of args) {
			if (arg === '--help' || arg === '-h') {
				printHelp();
				return;
			}

			if (arg === '--dry-run') {
				dryRun = true;
				continue;
			}

			if (arg.startsWith('-')) {
				throw new Error(`Unknown report option: ${arg}`);
			}

			if (nameProvided) {
				throw new Error('Only one report name or path may be provided.');
			}

			identifier = arg;
			nameProvided = true;
		}

		await runReport(identifier, { dryRun });
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}

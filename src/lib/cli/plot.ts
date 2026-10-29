// src/lib/cli/plot.ts

import { spawn } from 'node:child_process';
import process from 'node:process';

import {
	DEFAULT_DAYS,
	DEFAULT_DATAPOINT_COUNT,
	MAX_DAYS,
	MAX_SECONDS_BETWEEN_POINTS
} from '../plot/context.ts';

import type { PlotOptions } from '../plot/types.ts';
//import { resolveTimeAspects } from '../plot/resolve-time.ts';
import { buildPlotSearchParams } from '../plot/url.ts';
import { discoverServer } from '../status/probe.ts';
import { parseTags } from './helpers/parse-tags.ts';

function printHelp(): void {
	console.log(`
Usage:
  plantmap-sv plot <IDCS...> [options]

Time options:
  --start, -s <time>                 Start time (independent of --end)
  --end, -e <time>                   End time (independent of --start)
  --days, -ds <number>               Relative range in days (default: ${DEFAULT_DAYS})

Sampling options:
  --datapoint-count, -dp <number>    Desired sample count (default: ${DEFAULT_DATAPOINT_COUNT})
  --seconds-between-points, -sec <n> Sample interval in seconds

Time-range behavior:
  No bounds                           Default lookback through now
  --start TIME                        Start through now
  --start TIME --days N               Start through N days later
  --end TIME                          Default lookback ending at TIME
  --end TIME --days N                 N days before TIME through TIME
  --start TIME --end TIME             Use both explicit bounds; ignore --days

Sampling behavior:
  --datapoint-count takes precedence over --seconds-between-points.
  Without either option, the default sample count is ${DEFAULT_DATAPOINT_COUNT}.

Examples:
  plantmap-sv plot M100FI
  plantmap-sv plot M100FI --days 1
  plantmap-sv plot M100FI FI8001 --days 7 -dp 400
  plantmap-sv plot M100FI --start "2026-10-21"
  plantmap-sv plot M100FI --start "2026-10-21" --days 3
  plantmap-sv plot M100FI --end "2026-10-22"
  plantmap-sv plot M100FI --start "2026-10-21" --end "2026-10-22"
  plantmap-sv plot M100FI --days 7 -sec 900
`);
}

function parsePositiveNumber(
	value: string,
	option: string,
	maximum: number,
	integer = false
): number {
	const parsed = Number(value);

	if (
		!Number.isFinite(parsed) ||
		parsed <= 0 ||
		parsed > maximum ||
		(integer && !Number.isInteger(parsed))
	) {
		throw new Error(
			`${option} must be a positive ${integer ? 'integer' : 'number'} no greater than ${maximum}.`
		);
	}

	return parsed;
}

function parseArgs(args: string[]): PlotOptions {
	//const tags: string[] = [];
    const tags = await parseTags(rawTags);

    if (tags.length === 0) {
      throw new Error(
        'No IDCS tags found. Provide tags or a query file.'
      );
    }

	let start: string | undefined;
	let end: string | undefined;
	let windowDays: number | undefined;
	//let daysProvided = false;
	let datapointCount: number | undefined;
	let secondsBetweenPoints: number | undefined;

	const valueOptions = new Map<string, string>([
		['--start', 'start'],
		['-s', 'start'],
		['--end', 'end'],
		['-e', 'end'],
		['--days', 'windowDays'],
		['-ds', 'windowDays'],
		['--datapoint-count', 'datapointCount'],
		['-dp', 'datapointCount'],
		['--seconds-between-points', 'secondsBetweenPoints'],
		['-sec', 'secondsBetweenPoints']
	]);

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exitCode = 0;
			return {
				tags: []
				//daysProvided: false
			};
		}

		const option = valueOptions.get(arg);

		if (!option) {
			if (arg.startsWith('-')) {
				throw new Error(`Unknown option: ${arg}`);
			}

			tags.push(arg);
			continue;
		}

		const value = args[++i];

		if (value === undefined || value.startsWith('--')) {
			throw new Error(`Option ${arg} requires a value.`);
		}

		switch (option) {
			case 'start':
				start = value;
				break;
			case 'end':
				end = value;
				break;
			case 'windowDays':
				windowDays = parsePositiveNumber(value, arg, MAX_DAYS);
				//daysProvided = true;
				break;
			case 'datapointCount':
				datapointCount = parsePositiveNumber(value, arg, 1_000_000, true);
				break;
			case 'secondsBetweenPoints':
				secondsBetweenPoints = parsePositiveNumber(value, arg, MAX_SECONDS_BETWEEN_POINTS, true);
				break;
		}
	}

	if (tags.length === 0) {
		throw new Error('Provide at least one IDCS tag.');
	}

	return {
		tags: [...new Set(tags)],
		start,
		end,
		windowDays: windowDays,
		datapointCount,
		secondsBetweenPoints
	};
}

function openUrl(url: string): void {
	let commands: Array<{ command: string; args: string[] }>;

	if (process.env.TERMUX_VERSION) {
		commands = [
			{ command: 'termux-open-url', args: [url] },
			{ command: 'xdg-open', args: [url] }
		];
	} else if (process.platform === 'darwin') {
		commands = [{ command: 'open', args: [url] }];
	} else if (process.platform === 'win32') {
		commands = [{ command: 'cmd.exe', args: ['/c', 'start', '', url] }];
	} else {
		commands = [{ command: 'xdg-open', args: [url] }];
	}

	const tryCommand = (index: number): void => {
		const entry = commands[index];

		if (!entry) {
			console.error('Could not launch a browser. Open this URL manually:\n' + url);
			return;
		}

		const child = spawn(entry.command, entry.args, {
			detached: true,
			stdio: 'ignore'
		});

		child.once('error', () => {
			tryCommand(index + 1);
		});

		child.once('spawn', () => {
			child.unref();
		});
	};

	tryCommand(0);
}

export async function plot(args: string[] = []): Promise<void> {
	try {
		const options = parseArgs(args);

		// --help has already printed its output.
		if (options.tags.length === 0) return;

		const query = buildPlotSearchParams(options).toString().replace(/%2C/gi, ',');

		const relativeUrl = `/plot?${query}`;

		console.log(`PlantMap plot relative URL:\n${relativeUrl}\n`);

		const server = await discoverServer();

		if (!server) {
			console.log(
				'PlantMap server is not running locally. Open the URL above when the server is available.'
			);
			return;
		}

		const plotUrl = `${server.url}${relativeUrl}`;
		console.log(`Opening PlantMap plot:\n${plotUrl.toString()}`);
		openUrl(plotUrl.toString());
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		console.error('');
		printHelp();
		process.exitCode = 1;
	}
}

// src/lib/cli/download.ts

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
	DEFAULT_DAYS,
	DEFAULT_DATAPOINT_COUNT,
	MAX_DAYS,
	MAX_SECONDS_BETWEEN_POINTS
} from '../plot/context.ts';

import { SUPPORTED_DOWNLOAD_FORMATS, DEFAULT_DOWNLOAD_FORMAT } from '../download/context.ts';

import type { DownloadFormat } from '../download/context.ts';

import type { PlotOptions } from '../plot/types.ts';

import { buildPlotSearchParams } from '../plot/url.ts';
import { discoverServer } from '../status/probe.ts';
import { parseTags } from './helpers/parse-tags.ts';
import { readErrorMessage } from './helpers/errors.ts';

interface DownloadOptions extends PlotOptions {
	formats: DownloadFormat[];
	outputDir: string;
}

function printHelp(): void {
	console.log(`
Usage:
  plantmap-sv download <IDCS...> [options]

Output formats:
  --format, -f <format>             Output format: ${SUPPORTED_DOWNLOAD_FORMATS.join(', ')}
                                    Repeat to request multiple formats.
                                    Default: ${DEFAULT_DOWNLOAD_FORMAT}

Time options:
  --start, -s <time>                Start time
  --end, -e <time>                  End time
  --days, -ds <number>              Relative range in days (default: ${DEFAULT_DAYS})

Sampling options:
  --datapoint-count, -dp <number>   Desired sample count (default: ${DEFAULT_DATAPOINT_COUNT})
  --seconds-between-points, -sec <n> Sample interval in seconds

Time-range behavior:
  No bounds                          Default lookback through now
  --start TIME                       Start through now
  --start TIME --days N              Start through N days later
  --end TIME                         Default lookback ending at TIME
  --end TIME --days N                N days before TIME through TIME
  --start TIME --end TIME            Use both explicit bounds; ignore --days

Sampling behavior:
  --datapoint-count takes precedence over --seconds-between-points.

Output directory:
  --output-dir, -o <directory>   Directory for downloaded files (default: current directory)
  
Examples:
  plantmap-sv download M100FI
  plantmap-sv download M100FI FI8001 --days 4
  plantmap-sv download M100FI --format csv
  plantmap-sv download M100FI --format json
  plantmap-sv download M100FI --format csv --format json
  plantmap-sv download M100FI --start "2026-10-21" --days 3
  plantmap-sv download M100FI --days 7 --format csv
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

function parseFormat(value: string): DownloadFormat[] {
	const formats = value
		.split(',')
		.map((format) => format.trim().toLowerCase())
		.filter(Boolean);

	if (formats.length === 0) {
		throw new Error('Provide at least one output format.');
	}

	for (const format of formats) {
		if (
			!SUPPORTED_DOWNLOAD_FORMATS.includes(format as (typeof SUPPORTED_DOWNLOAD_FORMATS)[number])
		) {
			throw new Error(
				`Unsupported format "${format}". Supported formats: ${SUPPORTED_DOWNLOAD_FORMATS.join(', ')}.`
			);
		}
	}

	return formats as DownloadFormat[];
}

function parseArgs(args: string[]): DownloadOptions | null {
	const tags: string[] = [];
	const requestedFormats: DownloadFormat[] = [];

	let start: string | undefined;
	let end: string | undefined;
	let windowDays: number | undefined;
	let datapointCount: number | undefined;
	let secondsBetweenPoints: number | undefined;
	let outputDir: string = process.cwd();

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
		['-sec', 'secondsBetweenPoints'],
		['--format', 'format'],
		['-f', 'format'],
		['--output-dir', 'outputDir'],
		['-o', 'outputDir']
	]);

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--help' || arg === '-h') {
			printHelp();
			return null;
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

		if (value === undefined || value.startsWith('-')) {
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
				break;

			case 'datapointCount':
				datapointCount = parsePositiveNumber(value, arg, 1_000_000, true);
				break;

			case 'secondsBetweenPoints':
				secondsBetweenPoints = parsePositiveNumber(value, arg, MAX_SECONDS_BETWEEN_POINTS, true);
				break;

			case 'format':
				requestedFormats.push(...parseFormat(value));
				break;

			case 'outputDir':
				outputDir = path.resolve(process.cwd(), value);
				break;
		}
	}

	return {
		tags: [...new Set(tags)],
		start,
		end,
		windowDays,
		datapointCount,
		secondsBetweenPoints,
		outputDir,
		formats: [
			...new Set(
				requestedFormats.length > 0
					? requestedFormats
					: ([DEFAULT_DOWNLOAD_FORMAT] as DownloadFormat[])
			)
		]
	};
}

function getFilename(response: Response, format: DownloadFormat, tags: string[]): string {
	const disposition = response.headers.get('content-disposition');

	let filename: string | undefined;

	if (disposition) {
		const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);

		if (encodedMatch?.[1]) {
			try {
				filename = decodeURIComponent(encodedMatch[1].trim());
			} catch {
				// Fall back to the regular filename or a generated name.
			}
		}

		if (!filename) {
			const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
			filename = regularMatch?.[1]?.trim();
		}
	}

	if (!filename) {
		const safeTags = tags.map((tag) => tag.replace(/[^a-zA-Z0-9_-]/g, '_')).join('_');

		filename = `plantmap-${safeTags}-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
	}

	// Never allow a server-provided filename to write outside the current directory.
	filename = path.basename(filename).replace(/[\r\n]/g, '');

	if (!filename || filename === '.' || filename === '..') {
		throw new Error('The download server returned an invalid filename.');
	}

	return filename;
}

async function downloadFormat(
	serverUrl: string | null,
	options: DownloadOptions,
	format: DownloadFormat
): Promise<string | null> {
	const params = buildPlotSearchParams(options);

	params.set('format', format);

	const relativeUrl = `/api/download?${params.toString().replace(/%2C/gi, ',')}`;
	console.error(relativeUrl);
	if (!serverUrl) {
		return null;
	}

	//const url = `${serverUrl}${relativeUrl}`;
	const url = new URL(relativeUrl, serverUrl);

	console.error(`Requesting ${format.toUpperCase()} data...`);
	console.error(url.toString());

	let response: Response;

	try {
		response = await fetch(url);
	} catch (error) {
		throw new Error(
			`Could not contact the PlantMap server: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}

	if (!response.ok) {
		const message = await readErrorMessage(response);

		throw new Error(
			`${format.toUpperCase()} download failed (HTTP ${response.status}): ${message}`
		);
	}

	const filename = getFilename(response, format, options.tags);
	const data = Buffer.from(await response.arrayBuffer());

	if (data.length === 0) {
		throw new Error(`The server returned an empty ${format.toUpperCase()} file.`);
	}

	await mkdir(options.outputDir, { recursive: true });

	const outputPath = path.join(options.outputDir, filename);

	await writeFile(outputPath, data);

	//console.error(`Saved ${outputPath} (${data.length.toLocaleString()} bytes)`);
    console.error(`Saved ${outputPath} (${data.length.toLocaleString()} bytes)`);
    console.log(outputPath);

	return outputPath;
}

export async function download(args: string[] = []): Promise<void> {
	try {
		const options = parseArgs(args);
		if (!options) {
			return;
		}

		const tags = await parseTags(options.tags);

		if (tags.length === 0) {
			throw new Error('No IDCS tags found. Provide tags or a query file.');
		}

		options.tags = tags;

		const server = await discoverServer();

		console.error(`PlantMap download...`);
		if (server) {
			console.error(`PlantMap server: ${server.url}`);
		} else {
			console.error(`Server has no url.`);
		}
		console.error(`Tags: ${options.tags.join(', ')}`);
		console.error(`Formats: ${options.formats.join(', ')}`);
		console.error('');

		const savedFiles: string[] = [];
		const failures: Array<{ format: DownloadFormat; message: string }> = [];

		// Request each format independently. The API currently returns one file per request.
		for (const format of options.formats) {
			try {
				//savedFiles.push(await downloadFormat(server.url, options, format));
				const savedFile = await downloadFormat(server?.url ?? null, options, format);

				if (savedFile) {
					savedFiles.push(savedFile);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				failures.push({ format, message });
				console.error(message);
			}
		}

		if (savedFiles.length > 0) {
			console.error('');
			console.error(`Download complete: ${savedFiles.length} file(s) saved.`);
		}

		if (failures.length > 0) {
			console.error(`${failures.length} format(s) failed.`);
			process.exitCode = 1;
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		console.error('');
		printHelp();
		process.exitCode = 1;
	}
}

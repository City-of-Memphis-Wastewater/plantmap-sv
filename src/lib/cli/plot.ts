
 // src/lib/cli/plot.ts

import { spawn } from 'node:child_process';

function printUsage() {
        console.log(`
Usage:
  plantmap-sv plot <IDCS...> [options]

Options:
  --start, -s <time>                 Start time (requires --end)
  --end, -e <time>                   End time (requires --start)
  --days, -ds <number>               Relative time range (default: 1)
  --datapoint-count, -dp <number>    Desired sample count (default: 400)
  --seconds-between-points, -sec <n> Sample interval in seconds

Examples:
  plantmap-sv plot M100FI --days 1
  plantmap-sv plot M100FI FI8001 --days 7 -dp 400
  plantmap-sv plot M100FI --start "2026-10-21" --end "2026-10-22"
  plantmap-sv plot M100FI --days 7 -sec 900
`);
}

function parsePositiveNumber(value: string, option: string): number {
        const parsed = Number(value);

        if (!Number.isFinite(parsed) || parsed <= 0) {
                throw new Error(`${option} must be a positive number.`);
        }

        return parsed;
}

function openBrowser(url: string) {
        let command: string;
        let args: string[];

        if (process.platform === 'win32') {
                command = 'cmd.exe';
                args = ['/c', 'start', '', url];
        } else if (process.platform === 'darwin') {
                command = 'open';
                args = [url];
        } else {
                command = process.env.TERMUX_VERSION ? 'termux-open-url' : 'xdg-open';
                args = [url];
        }

        const child = spawn(command, args, {
                detached: true,
                stdio: 'ignore'
        });

        child.on('error', () => {
                console.error('Could not open a browser automatically.');
                console.error(`Open this URL manually: ${url}`);
        });

        child.unref();
}

export async function plot(args: string[] = []) {
        const tags: string[] = [];

        let start: string | undefined;
        let end: string | undefined;
        let days: number | undefined;
        let datapointCount: number | undefined;
        let secondsBetweenPoints: number | undefined;
        let daysWasProvided = false;

        try {
                for (let i = 0; i < args.length; i++) {
                        const arg = args[i];

                        const readValue = () => {
                                const value = args[++i];

                                if (!value || value.startsWith('--')) {
                                        throw new Error(`Missing value for ${arg}.`);
                                }

                                return value;
                        };

                        switch (arg) {
                                case '--start':
                                case '-s':
                                        start = readValue();
                                        break;

                                case '--end':
                                case '-e':
                                        end = readValue();
                                        break;

                                case '--days':
                                case '-ds':
                                        days = parsePositiveNumber(readValue(), arg);
                                        daysWasProvided = true;
                                        break;

                                case '--datapoint-count':
                                case '-dp':
                                        datapointCount = parsePositiveNumber(readValue(), arg);

                                        if (!Number.isInteger(datapointCount)) {
                                                throw new Error(`${arg} must be an integer.`);
                                        }
                                        break;

                                case '--seconds-between-points':
                                case '-sec':
                                        secondsBetweenPoints = parsePositiveNumber(readValue(), arg);

                                        if (!Number.isInteger(secondsBetweenPoints)) {
                                                throw new Error(`${arg} must be an integer.`);
                                        }
                                        break;

                                case '--help':
                                case '-h':
                                        printUsage();
                                        return;

                                default:
                                        if (arg.startsWith('-')) {
                                                throw new Error(`Unknown option: ${arg}`);
                                        }

                                        tags.push(
                                                ...arg
                                                        .split(',')
                                                        .map((tag) => tag.trim())
                                                        .filter(Boolean)
                                        );
                        }
                }

                const uniqueTags = [...new Set(tags)];

                if (uniqueTags.length === 0) {
                        throw new Error('Provide at least one IDCS tag.');
                }

                if (uniqueTags.length > 25) {
                        throw new Error('A maximum of 25 tags may be requested.');
                }

                if (Boolean(start) !== Boolean(end)) {
                        throw new Error('--start and --end must be supplied together.');
                }

                if (start && end && daysWasProvided) {
                        throw new Error('Use either --start/--end or --days, not both.');
                }

                if (!start && !end) {
                        days ??= 1;
                }

                let windowSeconds: number;

                if (start && end) {
                        const startMs = Date.parse(start);
                        const endMs = Date.parse(end);

                        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
                                throw new Error(
                                        'Could not parse --start or --end. ISO dates are recommended.'
                                );
                        }

                        if (startMs >= endMs) {
                                throw new Error('--start must be earlier than --end.');
                        }

                        windowSeconds = Math.ceil((endMs - startMs) / 1000);
                } else {
                        windowSeconds = Math.round(days! * 86_400);
                }

                // If both sampling options are supplied, datapoint count takes precedence.
                const count = datapointCount ?? 400;
                const stepSeconds =
                        datapointCount !== undefined || secondsBetweenPoints === undefined
                                ? Math.max(1, Math.ceil(windowSeconds / count))
                                : secondsBetweenPoints;

                if (windowSeconds > 365 * 86_400) {
                        throw new Error('The requested time range cannot exceed 365 days.');
                }

                const port = process.env.PORT ?? '5173';
                const url = new URL('/plot', `http://localhost:${port}`);

                url.searchParams.set('tags', uniqueTags.join(','));
                url.searchParams.set('stepSeconds', String(stepSeconds));

                if (start && end) {
                        url.searchParams.set('start', start);
                        url.searchParams.set('end', end);
                } else {
                        url.searchParams.set('days', String(days));
                }

                console.log(`Opening historical plot: ${url.toString()}`);
                openBrowser(url.toString());
        } catch (error) {
                console.error(error instanceof Error ? error.message : String(error));
                printUsage();
                process.exitCode = 1;
        }
}


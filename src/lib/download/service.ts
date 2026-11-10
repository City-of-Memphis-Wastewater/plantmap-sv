
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { DownloadFormat } from './context.ts';
import type { PlotOptions } from '../plot/types.ts';

import { buildPlotSearchParams } from '../plot/url.ts';
import { discoverServer } from '../status/probe.ts';
import { readErrorMessage } from '../cli/helpers/errors.ts';

export interface DownloadServiceOptions extends PlotOptions {
    formats: DownloadFormat[];
    outputDir: string;
}

function getFilename(
    response: Response,
    format: DownloadFormat,
    tags: string[]
): string {
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

    filename = path.basename(filename).replace(/[\r\n]/g, '');

    if (!filename || filename === '.' || filename === '..') {
        throw new Error('The download server returned an invalid filename.');
    }

    return filename;
}

export async function downloadFiles(
    options: DownloadServiceOptions
): Promise<string[]> {
    const server = await discoverServer();

    if (!server?.url) {
        throw new Error('PlantMap server is unavailable. No files were downloaded.');
    }

    const savedFiles: string[] = [];
    const failures: string[] = [];

    for (const format of options.formats) {
        try {
            const params = buildPlotSearchParams(options);
            params.set('format', format);

            const relativeUrl = `/api/download?${params.toString().replace(/%2C/gi, ',')}`;
            const url = new URL(relativeUrl, server.url);

            const response = await fetch(url);

            if (!response.ok) {
                const message = await readErrorMessage(response);
                throw new Error(`${format.toUpperCase()} download failed (HTTP ${response.status}): ${message}`);
            }

            const filename = getFilename(response, format, options.tags);
            const data = Buffer.from(await response.arrayBuffer());

            if (data.length === 0) {
                throw new Error(`The server returned an empty ${format.toUpperCase()} file.`);
            }

            await mkdir(options.outputDir, { recursive: true });

            const outputPath = path.join(options.outputDir, filename);
            await writeFile(outputPath, data);
            savedFiles.push(outputPath);
        } catch (error) {
            failures.push(
                `${format.toUpperCase()}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    if (failures.length > 0) {
        throw new Error(
            `One or more downloads failed:\n${failures.join('\n')}`
        );
    }

    if (savedFiles.length === 0) {
        throw new Error('No download files were produced.');
    }

    return savedFiles;
}

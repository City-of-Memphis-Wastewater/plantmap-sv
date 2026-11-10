
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { SUPPORTED_DOWNLOAD_FORMATS } from '../download/context.ts';
import type { ReportInputJson } from './types.ts';

const ReportSchema = z.object({
    name: z.string().optional(),
    recipients: z.array(z.string().email()).min(1),
    subject: z.string().optional(),
    body: z.string().optional(),
    outputDir: z.string().optional(),
    downloads: z.array(
        z.object({
            tagsFile: z.string().min(1),
            days: z.number().positive().optional(),
            formats: z.array(z.enum(SUPPORTED_DOWNLOAD_FORMATS)).min(1).optional(),
            secondsBetweenPoints: z.number().int().positive().optional()
        })
    ).min(1)
});

export function resolveReportPath(
    identifier = 'default',
    appDir: string
): string {
    const isAbsolute = path.isAbsolute(identifier);
    const hasJsonExtension = identifier.toLowerCase().endsWith('.json');

    if (isAbsolute) {
        return path.resolve(identifier);
    }

    const filename = hasJsonExtension ? identifier : `${identifier}.json`;

    // Report identifiers are names, not paths. Keep reports inside reports/.
    if (filename.includes('/') || filename.includes('\\') || filename === '.json') {
        throw new Error('Provide a report name or an absolute JSON file path.');
    }

    return path.join(appDir, 'reports', filename);
}

export async function loadReportConfig(
    identifier = 'default',
    appDir: string
): Promise<ReportInputJson> {
    const reportPath = resolveReportPath(identifier, appDir);

    let contents: string;

    try {
        contents = await readFile(reportPath, 'utf8');
    } catch (error) {
        throw new Error(
            `Could not read report configuration: ${reportPath}`,
            { cause: error }
        );
    }

    let json: unknown;

    try {
        json = JSON.parse(contents);
    } catch (error) {
        throw new Error(`Invalid JSON in report configuration: ${reportPath}`, {
            cause: error
        });
    }

    const result = ReportSchema.safeParse(json);

    if (!result.success) {
        throw new Error(
            `Invalid report configuration:\n${z.prettifyError(result.error)}`
        );
    }

    return result.data;
}

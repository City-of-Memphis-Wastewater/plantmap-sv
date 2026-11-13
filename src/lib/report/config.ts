import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
	downloads: z
		.array(
			//z.object({
			//    tagsFile: z.string().min(1),
			//    days: z.number().positive().optional(),
			//    formats: z.array(z.enum(SUPPORTED_DOWNLOAD_FORMATS)).min(1).optional(),
			//    secondsBetweenPoints: z.number().int().positive().optional()
			//})
			z
				.object({
					tags: z.array(z.string().min(1)).min(1).optional(),
					tagsFiles: z.array(z.string().min(1)).min(1).optional(),
					days: z.number().positive().optional(),
					formats: z.array(z.enum(SUPPORTED_DOWNLOAD_FORMATS)).min(1).optional(),
					secondsBetweenPoints: z.number().int().positive().optional()
				})
				.refine(
					(download) => (download.tags?.length ?? 0) > 0 || (download.tagsFiles?.length ?? 0) > 0,
					{
						message: 'Each download requires at least one tag or tag file.'
					}
				)
		)
		.min(1)
});

const DEFAULT_REPORT_CONFIG: ReportInputJson = {
	name: 'Weekly Default Report, Name',

	recipients: ['testA@example.comv', 'testB@example.com'],

	subject: 'Weekly Default Report, Subject',

	body: 'Attached is the weekly data, in 15 minute increments.',

	outputDir: 'export',

	downloads: [
		{
			tagsFiles: ['queries/t-weekly-biorem-tags.txt'],
			days: 7,
			formats: ['csv', 'json', 'svg'],
			secondsBetweenPoints: 900
		},
		{
			tagsFiles: ['queries/t-weekly-scan-tags.txt'],
			days: 7,
			formats: ['csv', 'json', 'svg'],
			secondsBetweenPoints: 900
		}
	]
};

export async function ensureDefaultReportConfig(appDir: string): Promise<boolean> {
	const reportPath = resolveReportPath('default', appDir);

	await mkdir(path.dirname(reportPath), { recursive: true });

	try {
		await writeFile(reportPath, `${JSON.stringify(DEFAULT_REPORT_CONFIG, null, 4)}\n`, {
			encoding: 'utf8',
			flag: 'wx'
		});

		console.log(`Created default report configuration: ${reportPath}`);

		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
			return false;
		}

		throw error;
	}
}

export function resolveReportPath(identifier = 'default', appDir: string): string {
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
		throw new Error(`Could not read report configuration: ${reportPath}`, { cause: error });
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
		throw new Error(`Invalid report configuration:\n${z.prettifyError(result.error)}`);
	}

	return result.data;
}

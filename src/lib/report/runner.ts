import { stat } from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_DOWNLOAD_FORMAT } from '../download/context.ts';
import { downloadFiles } from '../download/service.ts';
import { sendEmailWithAttachments } from '../email/index.ts';
import { getPlantMapAppDir } from '../plantmap-sv/bootstrap.ts';
import { parseTags } from '../cli/helpers/parse-tags.ts';
import { 
    //parseTagsFromString, 
    parseTagsFromFiles 
} from '../server/eds/parsers/tags.ts';

import { ensureDefaultReportConfig, loadReportConfig } from './config.ts';
import type { ReportResult } from './types.ts';

export interface RunReportOptions {
	dryRun?: boolean;
}

export async function runReport(
	identifier = 'default',
	options: RunReportOptions = {}
): Promise<ReportResult> {
	// ---
	const appDir = getPlantMapAppDir();

	if (identifier === 'default' || identifier === 'default.json') {
		await ensureDefaultReportConfig(appDir);
	}

	const config = await loadReportConfig(identifier, appDir);
	// ---
	const reportName = config.name ?? path.basename(identifier, path.extname(identifier));

	const outputDir = path.resolve(appDir, config.outputDir ?? 'export');

	console.log(`Running report: ${reportName}`);
	console.log(`Output directory: ${outputDir}`);

	const attachments: string[] = [];

	for (const [index, download] of config.downloads.entries()) {
		const tagsFromConfig = download.tags ?? [];

        // parseTagsFromString
		const tagsFromFiles = await parseTagsFromFiles(download.tagsFiles ?? [], appDir);

		const tags = [...new Set([...tagsFromConfig, ...tagsFromFiles])];

		//const tagInputs = [
		//	...(download.tags ?? []),
		//	...(download.tagsFiles ?? []).map((file) => path.resolve(appDir, file))
		//];

		//const tags = await parseTags(tagInputs, appDir);

		if (tags.length === 0) {
			throw new Error(`Download ${index + 1} produced no IDCS tags.`);
		}

		//const tagsPath = path.resolve(appDir, download.tagsFile);
		//const tags = await parseTags([tagsPath], appDir);

		//if (tags.length === 0) {
		//    throw new Error(`No IDCS tags found in ${tagsPath}`);
		//}

		console.log(`Download ${index + 1}/${config.downloads.length}: ${tags.join(', ')}`);

		const files = await downloadFiles({
			tags,
			windowDays: download.days,
			formats: download.formats ?? [DEFAULT_DOWNLOAD_FORMAT],
			secondsBetweenPoints: download.secondsBetweenPoints,
			outputDir
		});

		attachments.push(...files);
	}

	if (attachments.length === 0) {
		throw new Error('The report produced no attachments.');
	}

	// Validate every attachment before sending, including during dry runs.
	for (const attachment of attachments) {
		const file = await stat(attachment);

		if (!file.isFile() || file.size === 0) {
			throw new Error(`Invalid report attachment: ${attachment}`);
		}
	}

	console.log(`Prepared ${attachments.length} attachment(s).`);

	if (options.dryRun) {
		console.log('Dry run: email not sent.');
		return { name: reportName, attachments };
	}

	const email = await sendEmailWithAttachments({
		recipient: config.recipients.join(', '),
		attachments,
		subject: config.subject ?? reportName,
		body: config.body
	});

	console.log(`Email sent. Message ID: ${email.messageId}`);

	if (email.rejected.length > 0) {
		console.error(`Rejected recipients: ${email.rejected.join(', ')}`);
	}

	return { name: reportName, attachments, email };
}

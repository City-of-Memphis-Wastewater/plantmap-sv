import { sendEmailWithAttachments } from '../email/index.ts';

import type { SendEmailOptions } from '../email/types.ts';

function printHelp(): void {
	console.log(`
Usage:
  plantmap-sv email --to <address> --attachment <file> [options]

Required:
  --to <address>              Recipient email address
  --attachment, -a <file>     File to attach; repeat for multiple files

Optional:
  --subject, -s <text>        Email subject (default: Automated report)
  --body, -b <text>           Email body

Examples:
  plantmap-sv email --to recipient@example.com --attachment report.csv

  plantmap-sv email --to recipient@example.com \\
      --subject "PlantMap Report" \\
      --body "Attached is the latest report." \\
      --attachment report.csv

  plantmap-sv email --to recipient@example.com \\
      --attachment report.csv \\
      --attachment another-report.csv
`);
}

function parseArgs(args: string[]): SendEmailOptions | null {
	let recipient = '';
	let subject: string | undefined;
	let body: string | undefined;
	const attachments: string[] = [];

	const valueOptions = new Set(['--to', '--subject', '-s', '--body', '-b', '--attachment', '-a']);

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--help' || arg === '-h') {
			printHelp();
			return null;
		}

		if (!valueOptions.has(arg)) {
			throw new Error(`Unknown option: ${arg}`);
		}

		const value = args[++i];

		if (value === undefined) {
			throw new Error(`Option ${arg} requires a value.`);
		}

		switch (arg) {
			case '--to':
				recipient = value;
				break;

			case '--subject':
			case '-s':
				subject = value;
				break;

			case '--body':
			case '-b':
				body = value;
				break;

			case '--attachment':
			case '-a':
				attachments.push(value);
				break;
		}
	}

	if (!recipient.trim()) {
		throw new Error('Missing required option: --to');
	}

	if (attachments.length === 0) {
		throw new Error('At least one --attachment is required.');
	}

	return {
		recipient,
		attachments,
		subject,
		body
	};
}

export async function email(args: string[] = []): Promise<void> {
	try {
		const options = parseArgs(args);

		if (!options) return;

		console.log('Sending email...');
		console.log(`To: ${options.recipient}`);
		console.log(`Subject: ${options.subject ?? 'Automated report'}`);
		console.log(`Attachments: ${options.attachments.length}`);
		console.log('');

		const result = await sendEmailWithAttachments(options);

		console.log('Email sent successfully.');
		console.log(`Message ID: ${result.messageId}`);

		if (result.rejected.length > 0) {
			console.error(`Rejected recipients: ${result.rejected.join(', ')}`);
			process.exitCode = 1;
		}
	} catch (error) {
		console.error(`Email failed: ${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	}
}

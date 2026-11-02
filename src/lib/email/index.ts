import nodemailer from 'nodemailer';

import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { getEmailCreds, getEmailConfigs } from './settings.ts';

import type { SendEmailOptions, SendEmailResult } from './types.ts';

async function resolveAttachments(paths: string[]): Promise<string[]> {
	if (paths.length === 0) {
		throw new Error('At least one attachment is required.');
	}

	const resolved: string[] = [];

	for (const rawPath of paths) {
		const path = resolve(rawPath);

		let file;

		try {
			file = await stat(path);
		} catch {
			throw new Error(`Attachment not found: ${path}`);
		}

		if (!file.isFile()) {
			throw new Error(`Attachment is not a file: ${path}`);
		}

		if (file.size === 0) {
			throw new Error(`Attachment is empty: ${path}`);
		}

		resolved.push(path);
	}

	return resolved;
}

export async function sendEmailWithAttachments(
	options: SendEmailOptions
): Promise<SendEmailResult> {
	const { sender_email_address, password } = getEmailCreds();
	const { smtp_host, smtp_port, smtp_security } = getEmailConfigs();

	if (!sender_email_address || !password) {
		throw new Error('Email credentials are missing. Run plantmap-sv setup.');
	}

	if (!options.recipient.trim()) {
		throw new Error('An email recipient is required.');
	}

	const attachments = await resolveAttachments(options.attachments);

	const security = smtp_security.toLowerCase();

	const transporter = nodemailer.createTransport({
		host: smtp_host,
		port: smtp_port,
		secure: security === 'ssl' || security === 'implicit',
		requireTLS: security === 'starttls',
		auth: {
			user: sender_email_address,
			pass: password
		},
		connectionTimeout: 30000,
		greetingTimeout: 30000,
		socketTimeout: 30000
	});

	try {
		const info = await transporter.sendMail({
			from: sender_email_address,
			to: options.recipient,
			subject: options.subject ?? 'Automated report',
			text: options.body ?? 'Please find the requested reports attached.',
			attachments: attachments.map((path) => ({ path }))
		});

		return {
			messageId: info.messageId,
			accepted: info.accepted.map(String),
			rejected: info.rejected.map(String)
		};
	} finally {
		transporter.close();
	}
}

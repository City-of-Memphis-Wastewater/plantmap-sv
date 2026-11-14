import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

/**
 * Parse tag values from a string.
 *
 * Supports whitespace/comma-separated values, full-line comments,
 * and inline comments.
 */
export function parseTagsFromString(content: string): string[] {
	const tags: string[] = [];

	for (const line of content.split(/\r?\n/)) {
		let cleaned = line.trim();

		if (!cleaned || cleaned.startsWith('#')) {
			continue;
		}

		const commentIndex = cleaned.indexOf('#');

		if (commentIndex !== -1) {
			cleaned = cleaned.slice(0, commentIndex).trim();
		}

		for (const token of cleaned.replace(/,/g, ' ').split(/\s+/)) {
			const tag = token.trim().toUpperCase();

			if (tag) tags.push(tag);
		}
	}

	return [...new Set(tags)];
}

/**
 * Parse tags from one file.
 */
export async function parseTagsFromFile(
	file: string,
	cwd: string = process.cwd()
): Promise<string[]> {
	const filePath = path.resolve(cwd, file);
	const content = await readFile(filePath, 'utf8');

	return parseTagsFromString(content);
}

/**
 * Parse and combine tags from multiple files.
 */
export async function parseTagsFromFiles(
	files: string[],
	cwd: string = process.cwd()
): Promise<string[]> {
	const results = await Promise.all(files.map((file) => parseTagsFromFile(file, cwd)));

	return [...new Set(results.flat())];
}

/**
 * Parse mixed CLI inputs.
 *
 * Readable file paths are parsed as files.
 * Other inputs are interpreted as tag strings.
 */
export async function parseTagsFromFilesOrAndStrings(
	inputs: string[] | undefined,
	cwd: string = process.cwd()
): Promise<string[]> {
	if (!inputs?.length) return [];

	const results: string[] = [];

	for (const input of inputs) {
		const candidate = path.resolve(cwd, input);

		let isFile = false;

		try {
			await access(candidate, constants.R_OK);
			isFile = true;
		} catch {
			// Not a readable file; interpret as literal tag input.
		}

		if (isFile) {
			results.push(...(await parseTagsFromFile(candidate)));
		} else {
			results.push(...parseTagsFromString(input));
		}
	}

	return [...new Set(results)];
}

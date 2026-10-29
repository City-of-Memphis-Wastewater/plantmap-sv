
import { readFile } from 'node:fs/promises';
import { access, constants } from 'node:fs/promises';
import path from 'node:path';

/**
 * Parse IDCS tags from CLI arguments or a query file.
 *
 * Supports whitespace- and comma-separated tags, comments, and mixed
 * file/tag arguments. File paths are resolved relative to the CLI's
 * current working directory.
 */
export async function parseTags(
  inputs: string[] | undefined,
  cwd: string = process.cwd()
): Promise<string[]> {
  if (!inputs?.length) {
    return [];
  }

  const lines: string[] = [];

  for (const input of inputs) {
    const candidate = path.resolve(cwd, input);

    let isFile = false;

    try {
      await access(candidate, constants.R_OK);
      isFile = true;
    } catch {
      // Not a readable path: interpret the argument as tag input.
    }

    if (isFile) {
      const content = await readFile(candidate, 'utf8');
      lines.push(...content.split(/\r?\n/));
    } else {
      lines.push(input);
    }
  }

  const tags: string[] = [];

  for (const line of lines) {
    let cleaned = line.trim();

    if (!cleaned || cleaned.startsWith('#')) {
      continue;
    }

    // Remove inline comments.
    const commentIndex = cleaned.indexOf('#');

    if (commentIndex !== -1) {
      cleaned = cleaned.slice(0, commentIndex).trim();
    }

    for (const token of cleaned.replace(/,/g, ' ').split(/\s+/)) {
      const tag = token.trim().toUpperCase();

      if (tag) {
        tags.push(tag);
      }
    }
  }

  return [...new Set(tags)];
}

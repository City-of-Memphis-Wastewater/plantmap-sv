#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(SCRIPT_DIRECTORY);

const SOURCE = path.join(ROOT, 'node_modules', 'cesium', 'Build', 'Cesium');

const STATIC_DESTINATION = path.join(ROOT, 'static', 'cesium');

const BUILD_DESTINATION = path.join(ROOT, '.svelte-kit', 'output', 'client', 'cesium');

async function exists(target) {
	try {
		await fs.access(target);
		return true;
	} catch {
		return false;
	}
}

async function isDirectory(target) {
	try {
		return (await fs.stat(target)).isDirectory();
	} catch {
		return false;
	}
}

/**
 * Determine whether the destination already matches the source.
 * Compare directory contents and file sizes/modified times are not
 * sufficient, so compare file contents to avoid stale assets.
 */
async function directoriesMatch(source, destination) {
	if (!(await isDirectory(destination))) {
		return false;
	}

	const sourceEntries = await fs.readdir(source, {
		withFileTypes: true
	});

	const destinationEntries = await fs.readdir(destination, {
		withFileTypes: true
	});

	if (sourceEntries.length !== destinationEntries.length) {
		return false;
	}

	const destinationNames = new Set(destinationEntries.map((entry) => entry.name));

	for (const entry of sourceEntries) {
		if (!destinationNames.has(entry.name)) {
			return false;
		}

		const sourcePath = path.join(source, entry.name);
		const destinationPath = path.join(destination, entry.name);

		if (entry.isDirectory()) {
			if (!(await directoriesMatch(sourcePath, destinationPath))) {
				return false;
			}
		} else if (entry.isFile()) {
			const [sourceContents, destinationContents] = await Promise.all([
				fs.readFile(sourcePath),
				fs.readFile(destinationPath)
			]);

			if (!sourceContents.equals(destinationContents)) {
				return false;
			}
		} else {
			// Handle unexpected file types conservatively.
			return false;
		}
	}

	return true;
}

async function main() {
	// Validate the installed Cesium distribution.
	for (const directory of ['Workers', 'Assets', 'ThirdParty', 'Widgets']) {
		if (!(await isDirectory(path.join(SOURCE, directory)))) {
			throw new Error(
				`Cesium directory not found:\n  ${path.join(SOURCE, directory)}\n` +
					'Install dependencies before copying Cesium assets.'
			);
		}
	}

	// Avoid copying when the destination already matches the source.
	if (await directoriesMatch(SOURCE, STATIC_DESTINATION)) {
		console.log('[copy-cesium.mjs] Assets are current; copy skipped.');
	} else {
		await fs.mkdir(path.dirname(STATIC_DESTINATION), {
			recursive: true
		});

		// Copy to a temporary directory before replacing the destination.
		const temporaryDestination = `${STATIC_DESTINATION}.tmp`;

		await fs.rm(temporaryDestination, {
			recursive: true,
			force: true
		});

		await fs.cp(SOURCE, temporaryDestination, {
			recursive: true,
			force: true
		});

		// Replace the previous copy so removed Cesium files don't linger.
		await fs.rm(STATIC_DESTINATION, {
			recursive: true,
			force: true
		});

		await fs.rename(temporaryDestination, STATIC_DESTINATION);

		console.log('[copy-cesium.mjs] Assets copied successfully.');
	}

	console.log(`  Source:      ${SOURCE}`);
	console.log(`  Destination: ${STATIC_DESTINATION}`);

	// SvelteKit populates this directory during production builds.
	console.log(`  Build output: ${BUILD_DESTINATION}`);
}

main().catch((error) => {
	console.error('[copy-cesium.mjs] Copy failed:', error.message);
	process.exitCode = 1;
});

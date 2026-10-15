
#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(SCRIPT_DIRECTORY);

const SOURCE = path.join(ROOT, 'node_modules', 'cesium', 'Build', 'Cesium');

const STATIC_DIRECTORY = path.join(ROOT, 'static');
const STATIC_DESTINATION = path.join(STATIC_DIRECTORY, 'cesium');
const TEMPORARY_DESTINATION = `${STATIC_DESTINATION}.tmp`;
const BACKUP_DESTINATION = `${STATIC_DESTINATION}.backup`;

const BUILD_DESTINATION = path.join(ROOT, '.svelte-kit', 'output', 'client', 'cesium');

async function exists(target) {
    try {
        await fs.lstat(target);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        }

        throw error;
    }
}

async function isDirectory(target) {
    try {
        return (await fs.stat(target)).isDirectory();
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        }

        throw error;
    }
}

/**
 * Compare directory contents recursively.
 * File contents are compared to detect stale assets.
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
            // Unexpected file types are treated as a mismatch.
            return false;
        }
    }

    return true;
}

/**
 * Recover from a previous interrupted replacement.
 *
 * If the destination exists, it takes precedence over a stale backup.
 * If the destination is missing, restore the backup when possible.
 */
async function recoverPreviousCopy() {
    const destinationExists = await exists(STATIC_DESTINATION);
    const backupExists = await exists(BACKUP_DESTINATION);

    if (destinationExists && backupExists) {
        await fs.rm(BACKUP_DESTINATION, {
            recursive: true,
            force: true
        });
    } else if (!destinationExists && backupExists) {
        await fs.rename(BACKUP_DESTINATION, STATIC_DESTINATION);
        console.log('[copy-cesium.mjs] Restored previous Cesium assets.');
    }

    // A temporary directory is never a completed destination.
    await fs.rm(TEMPORARY_DESTINATION, {
        recursive: true,
        force: true
    });
}

/**
 * Copy to a temporary directory, then replace the destination.
 *
 * The previous destination is renamed to a backup first. If installing
 * the new copy fails, attempt to restore the previous destination.
 */
async function copyAssets() {
    let previousDestinationMoved = false;

    try {
        await fs.cp(SOURCE, TEMPORARY_DESTINATION, {
            recursive: true,
            force: true
        });

        if (await exists(STATIC_DESTINATION)) {
            // Remove any stale backup before creating a new one.
            await fs.rm(BACKUP_DESTINATION, {
                recursive: true,
                force: true
            });

            await fs.rename(STATIC_DESTINATION, BACKUP_DESTINATION);
            previousDestinationMoved = true;
        }

        await fs.rename(TEMPORARY_DESTINATION, STATIC_DESTINATION);

        console.log('[copy-cesium.mjs] Assets copied successfully.');
    } catch (error) {
        console.error('[copy-cesium.mjs] Replacement failed:', error.message);

        // Restore the old destination if the new one wasn't installed.
        if (
            previousDestinationMoved &&
            !(await exists(STATIC_DESTINATION)) &&
            (await exists(BACKUP_DESTINATION))
        ) {
            try {
                await fs.rename(BACKUP_DESTINATION, STATIC_DESTINATION);
                console.log('[copy-cesium.mjs] Previous assets restored.');
            } catch (restoreError) {
                console.error(
                    '[copy-cesium.mjs] Could not restore backup:',
                    restoreError.message
                );
                console.error(
                    `[copy-cesium.mjs] Backup preserved at: ${BACKUP_DESTINATION}`
                );
            }
        }

        // Clean up the incomplete copy without masking the original error.
        try {
            await fs.rm(TEMPORARY_DESTINATION, {
                recursive: true,
                force: true
            });
        } catch (cleanupError) {
            console.error(
                '[copy-cesium.mjs] Could not remove temporary directory:',
                cleanupError.message
            );
        }

        throw error;
    }

    // The new destination is installed. Backup cleanup is best-effort.
    try {
        await fs.rm(BACKUP_DESTINATION, {
            recursive: true,
            force: true
        });
    } catch (error) {
        console.warn(
            '[copy-cesium.mjs] Could not remove old backup:',
            error.message
        );
    }
}

async function main() {
    // Validate the installed Cesium distribution.
    for (const directory of ['Workers', 'Assets', 'ThirdParty', 'Widgets']) {
        const target = path.join(SOURCE, directory);

        if (!(await isDirectory(target))) {
            throw new Error(
                `Cesium directory not found:\n  ${target}\n` +
                    'Install dependencies before copying Cesium assets.'
            );
        }
    }

    await fs.mkdir(STATIC_DIRECTORY, {
        recursive: true
    });

    await recoverPreviousCopy();

    if (await directoriesMatch(SOURCE, STATIC_DESTINATION)) {
        console.log('[copy-cesium.mjs] Assets are current; copy skipped.');
    } else {
        await copyAssets();
    }

    console.log(`  Source:      ${SOURCE}`);
    console.log(`  Destination: ${STATIC_DESTINATION}`);
    console.log(`  Build output: ${BUILD_DESTINATION}`);
}

main().catch((error) => {
    console.error('[copy-cesium.mjs] Copy failed:', error.message);
    process.exitCode = 1;
});

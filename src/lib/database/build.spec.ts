
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  checkStatusLocalDatabase,
  buildLocalDatabase,
} from './build.ts';

describe('local database initialization', () => {
  let tempDirectory: string;
  let databasePath: string;

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'plantmap-build-test-'));
    databasePath = join(tempDirectory, 'local.sqlite');
  });

  afterEach(() => {
    rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('reports a missing database as not ready', () => {
    const status = checkStatusLocalDatabase(databasePath);

    expect(status.ready).toBe(false);
    expect(status.path).toBe(databasePath);
    expect(status.error).toBe('Database does not exist.');
  });

  it('recognizes an existing usable database', () => {
    buildLocalDatabase(databasePath);

    const status = checkStatusLocalDatabase(databasePath);

    expect(status.ready).toBe(true);
    expect(status.path).toBe(databasePath);
  });

  it('does not overwrite an existing unusable file', () => {
    const originalContents = 'This is not a SQLite database.';
    writeFileSync(databasePath, originalContents, 'utf8');

    const status = checkStatusLocalDatabase(databasePath);

    expect(status.ready).toBe(false);
    expect(status.path).toBe(databasePath);
    expect(status.error).toBeTruthy();
    expect(readFileSync(databasePath, 'utf8')).toBe(originalContents);
  });
});


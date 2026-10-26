
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  cacheToLocalDatabase,
  readCachedSensorReadings,
  readLatestCachedSensorReadings
} from './crud.ts';
import type { DatabasePayload } from './types.ts';

describe('local database CRUD', () => {
  let tempDirectory: string;
  let databasePath: string;

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'plantmap-db-test-'));
    databasePath = join(tempDirectory, 'local.sqlite');
  });

  afterEach(() => {
    rmSync(tempDirectory, { recursive: true, force: true });
  });

  function reading(
    sensorId: string,
    sampledAt: number,
    value: number | null,
    quality = 'GOOD'
  ): DatabasePayload {
    return {
      sensorId,
      sampledAt,
      sourceTimestamp: new Date(sampledAt * 1000).toISOString(),
      value,
      quality
    };
  }

  it('writes and reads a sensor reading', () => {
    const payload = [reading('M100FI', 1000, 12.5)];

    const result = cacheToLocalDatabase(payload, databasePath);

    expect(result).toEqual({ written: 1, sampledAt: 1000 });
    expect(readCachedSensorReadings('M100FI', 1000, 1000, databasePath))
      .toEqual([
        {
          sensorId: 'M100FI',
          sampledAt: 1000,
          sourceTimestamp: new Date(1000 * 1000).toISOString(),
          value: 12.5,
          quality: 'GOOD'
        }
      ]);
  });

  it('includes both endpoints in a time-range query', () => {
    cacheToLocalDatabase(
      [
        reading('M100FI', 1000, 10),
        reading('M100FI', 2000, 20),
        reading('M100FI', 3000, 30),
        reading('OTHER', 2000, 999)
      ],
      databasePath
    );

    const result = readCachedSensorReadings(
      'M100FI',
      1000,
      2000,
      databasePath
    );

    expect(result.map((item) => item.sampledAt)).toEqual([1000, 2000]);
  });

  it('updates an existing reading with the same sensor and timestamp', () => {
    cacheToLocalDatabase(
      [reading('M100FI', 1000, 12.5, 'GOOD')],
      databasePath
    );

    const result = cacheToLocalDatabase(
      [reading('M100FI', 1000, 15.25, 'UNCERTAIN')],
      databasePath
    );

    expect(result.written).toBe(1);

    const rows = readCachedSensorReadings(
      'M100FI',
      1000,
      1000,
      databasePath
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(15.25);
    expect(rows[0].quality).toBe('UNCERTAIN');
  });

  it('rejects batches containing different sample timestamps', () => {
    expect(() =>
      cacheToLocalDatabase(
        [
          reading('M100FI', 1000, 12.5),
          reading('FI8001', 2000, 25)
        ],
        databasePath
      )
    ).toThrow(
      'All readings in a database batch must share the same sampledAt timestamp.'
    );
  });

  it('returns the latest readings in chronological order', () => {
    cacheToLocalDatabase(
      [
        reading('M100FI', 1000, 10),
        reading('M100FI', 2000, 20),
        reading('M100FI', 3000, 30),
        reading('M100FI', 4000, 40)
      ],
      databasePath
    );

    const result = readLatestCachedSensorReadings(
      'M100FI',
      2,
      databasePath
    );

    expect(result.map((item) => item.sampledAt)).toEqual([3000, 4000]);
    expect(result.map((item) => item.value)).toEqual([30, 40]);
  });

  it('rolls back the entire batch if one insert fails', () => {
    const invalidReading = {
      ...reading('INVALID', 1000, 10),
      sensorId: null
    } as unknown as DatabasePayload;

    expect(() =>
      cacheToLocalDatabase(
        [
          reading('M100FI', 1000, 12.5),
          invalidReading
        ],
        databasePath
      )
    ).toThrow();

    expect(
      readCachedSensorReadings('M100FI', 1000, 1000, databasePath)
    ).toEqual([]);
  });

  it('rejects an inverted time range', () => {
    expect(() =>
      readCachedSensorReadings('M100FI', 2000, 1000, databasePath)
    ).toThrow('"from" must be less than or equal to "to".');
  });

  it('rejects a non-positive latest-reading limit', () => {
    expect(() =>
      readLatestCachedSensorReadings('M100FI', 0, databasePath)
    ).toThrow('"limit" must be a positive integer.');
  });

  it('handles an empty batch without writing rows', () => {
    const result = cacheToLocalDatabase([], databasePath);

    expect(result.written).toBe(0);
    expect(Number.isInteger(result.sampledAt)).toBe(true);
  });
});


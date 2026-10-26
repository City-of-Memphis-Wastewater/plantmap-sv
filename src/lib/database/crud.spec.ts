import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	writeSensorReadings,
	readCachedSensorReadings,
	readLatestCachedSensorReadings
} from './crud.ts';
import type { DatabasePayload } from './types.ts';

describe('database CRUD', () => {
	let tempDir: string;
	let databasePath: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'plantmap-db-'));
		databasePath = join(tempDir, 'test.sqlite');
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	function reading(
		sensorId: string,
		sampledAt: number,
		databaseTimestamp: number,
		value: number | null,
		quality: string | null = 'GOOD'
	): DatabasePayload {
		return {
			sensorId,
			sampledAt,
			sourceTimestamp: new Date(sampledAt * 1000).toISOString(),
			databaseTimestamp,
			value,
			quality
		};
	}

	it('writes a reading and returns its database timestamp', () => {
		const payload = [reading('M100FI', 1234, 1000, 12.5)];

		const result = writeSensorReadings(payload, databasePath);

		expect(result).toEqual({
			written: 1,
			databaseTimestamp: 1000
		});

		expect(readCachedSensorReadings('M100FI', 1000, 1000, databasePath)).toEqual([
			{
				sensorId: 'M100FI',
				sampledAt: 1234,
				databaseTimestamp: 1000,
				sourceTimestamp: new Date(1234 * 1000).toISOString(),
				value: 12.5,
				quality: 'GOOD'
			}
		]);
	});

	it('returns zero written for an empty batch', () => {
		const result = writeSensorReadings([], databasePath);

		expect(result.written).toBe(0);
		expect(Number.isInteger(result.databaseTimestamp)).toBe(true);
	});

	it('reads cached readings within an inclusive database timestamp range', () => {
		writeSensorReadings(
			[
				reading('M100FI', 1111, 1000, 10),
				reading('M100FI', 2222, 2000, 20),
				reading('M100FI', 3333, 3000, 30),
				reading('OTHER', 2222, 2000, 99)
			],
			databasePath
		);

		const result = readCachedSensorReadings('M100FI', 1000, 2000, databasePath);

		expect(result.map((item) => item.databaseTimestamp)).toEqual([1000, 2000]);
		expect(result.map((item) => item.value)).toEqual([10, 20]);
	});

	it('rejects a reversed database timestamp range', () => {
		expect(() => readCachedSensorReadings('M100FI', 2000, 1000, databasePath)).toThrow(
			'"from" must be less than or equal to "to".'
		);
	});

	it('reads the latest readings in chronological order', () => {
		writeSensorReadings(
			[
				reading('M100FI', 1001, 1000, 10),
				reading('M100FI', 2002, 2000, 20),
				reading('M100FI', 3003, 3000, 30),
				reading('M100FI', 4004, 4000, 40)
			],
			databasePath
		);

		const result = readLatestCachedSensorReadings('M100FI', 2, databasePath);

		expect(result.map((item) => item.databaseTimestamp)).toEqual([3000, 4000]);
		expect(result.map((item) => item.value)).toEqual([30, 40]);
	});

	it('rejects a non-positive latest-reading limit', () => {
		expect(() => readLatestCachedSensorReadings('M100FI', 0, databasePath)).toThrow(
			'"limit" must be a positive integer.'
		);
	});

	it('does not replace an existing reading for the same database timestamp', () => {
		writeSensorReadings([reading('M100FI', 1111, 1000, 10)], databasePath);

		const result = writeSensorReadings(
			[reading('M100FI', 2222, 1000, 15.25, 'UNCERTAIN')],
			databasePath
		);

		expect(result.written).toBe(0);
		expect(result.databaseTimestamp).toBe(1000);

		expect(readCachedSensorReadings('M100FI', 1000, 1000, databasePath)).toEqual([
			{
				sensorId: 'M100FI',
				sampledAt: 1111,
				databaseTimestamp: 1000,
				sourceTimestamp: new Date(1111 * 1000).toISOString(),
				value: 10,
				quality: 'GOOD'
			}
		]);
	});

	it('allows different sampledAt values in the same database window', () => {
		const payload = [reading('M100FI', 1111, 1000, 10), reading('M310LI', 2222, 1000, 20)];

		const result = writeSensorReadings(payload, databasePath);

		expect(result.written).toBe(2);
		expect(result.databaseTimestamp).toBe(1000);
	});

	it('rolls back the entire batch when an insert fails', () => {
		const payload = [
			reading('M100FI', 1111, 1000, 10),
			{
				...reading('M310LI', 2222, 1000, 20),
				sensorId: null as unknown as string
			}
		];

		expect(() => writeSensorReadings(payload, databasePath)).toThrow();

		expect(readCachedSensorReadings('M100FI', 1000, 1000, databasePath)).toEqual([]);
	});
});

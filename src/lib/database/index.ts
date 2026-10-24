// src/lib/database/index.ts

export {
	DATABASE_PATH,
	buildLocalDatabase,
	createLocalDatabase,
	checkStatusLocalDatabase,
	ensureLocalDatabase
} from './build.ts';

export {
	cacheToLocalDatabase,
	readCachedSensorReadings,
	readLatestCachedSensorReadings
} from './crud.ts';

export const VALID_MINUTE_INT_LIST = [0, 15, 30, 45] as const;

export type {
	CachedSensorReading,
	DatabasePayload,
	DatabaseStatus,
	WriteConfirmation
} from './types.ts';

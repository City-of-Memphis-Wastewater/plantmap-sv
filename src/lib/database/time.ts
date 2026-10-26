import { VALID_MINUTE_INT_LIST } from './context.ts';

/**
 * Return the Unix timestamp for the start of the current
 * database persistence interval.
 *
 * The interval boundaries are defined by VALID_MINUTE_INT_LIST.
 * This is independent of any sensor's sampledAt timestamp.
 */
export function getDatabaseTimestamp(now: Date = new Date()): number {
	const year = now.getFullYear();
	const month = now.getMonth();
	const day = now.getDate();
	const hour = now.getHours();
	const minute = now.getMinutes();

	const boundary = [...VALID_MINUTE_INT_LIST]
		.filter((candidate) => candidate <= minute)
		.sort((a, b) => b - a)[0];

	const boundaryMinute = boundary ?? VALID_MINUTE_INT_LIST[VALID_MINUTE_INT_LIST.length - 1];

	const boundaryDate = new Date(
		year,
		month,
		day,
		boundary === undefined ? hour - 1 : hour,
		boundaryMinute,
		0,
		0
	);

	return Math.floor(boundaryDate.getTime() / 1000);
}

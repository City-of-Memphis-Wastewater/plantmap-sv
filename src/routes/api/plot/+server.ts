// src/routes/api/plot/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEdsClient } from '$lib/server/eds/factory';

const DEFAULT_DAYS = 2;
const DEFAULT_STEP_SECONDS = 60;

const MAX_DAYS = 365;
const MAX_TAGS = 25;
const MAX_STEP_SECONDS = 86_400;
const SECONDS_PER_DAY = 86_400;

function positiveNumber(value: string | null, fallback: number, maximum: number): number | null {
	if (value === null) return fallback;

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maximum) {
		return null;
	}

	return parsed;
}

export const GET: RequestHandler = async ({ url }) => {
	const tags = [
		...new Set(
			url.searchParams
				.getAll('tags')
				.flatMap((value) => value.split(','))
				.map((tag) => tag.trim())
				.filter(Boolean)
		)
	];

	if (tags.length === 0) {
		return json(
			{
				error: 'Missing required query parameter: tags',
				example: '/api/plot?tags=M100FI&days=1&stepSeconds=60'
			},
			{ status: 400 }
		);
	}

	if (tags.length > MAX_TAGS) {
		return json({ error: `A maximum of ${MAX_TAGS} tags may be requested.` }, { status: 400 });
	}

	const startRaw = url.searchParams.get('start');
	const endRaw = url.searchParams.get('end');
	const daysRaw = url.searchParams.get('days');

	// Explicit start and end take precedence over days.
	const bothBoundsProvided = Boolean(startRaw && endRaw);

	let days: number | null = null;

	if (!bothBoundsProvided) {
		days = positiveNumber(daysRaw, DEFAULT_DAYS, MAX_DAYS);

		if (days === null) {
			return json(
				{ error: `days must be greater than 0 and at most ${MAX_DAYS}.` },
				{ status: 400 }
			);
		}
	}

	const now = Math.floor(Date.now() / 1000);

	const parsedStart = startRaw ? Date.parse(startRaw) : NaN;
	const parsedEnd = endRaw ? Date.parse(endRaw) : NaN;

	if (startRaw && !Number.isFinite(parsedStart)) {
		return json({ error: 'Invalid start time.' }, { status: 400 });
	}

	if (endRaw && !Number.isFinite(parsedEnd)) {
		return json({ error: 'Invalid end time.' }, { status: 400 });
	}

	const explicitStart = startRaw ? Math.floor(parsedStart / 1000) : null;

	const explicitEnd = endRaw ? Math.floor(parsedEnd / 1000) : null;

	let startSeconds: number;
	let endSeconds: number;

	if (explicitStart !== null && explicitEnd !== null) {
		// Both supplied: use both; ignore days.
		startSeconds = explicitStart;
		endSeconds = explicitEnd;
	} else if (explicitStart !== null) {
		// Start alone: extend by explicit days, or end at now.
		startSeconds = explicitStart;
		endSeconds = daysRaw !== null ? explicitStart + Math.round(days! * SECONDS_PER_DAY) : now;
	} else if (explicitEnd !== null) {
		// End alone: use explicit days, or the default duration.
		endSeconds = explicitEnd;
		startSeconds = endSeconds - Math.round(days! * SECONDS_PER_DAY);
	} else {
		// Neither bound: end now and look back by days/default days.
		endSeconds = now;
		startSeconds = endSeconds - Math.round(days! * SECONDS_PER_DAY);
	}

	if (startSeconds >= endSeconds) {
		return json({ error: 'Start time must be earlier than end time.' }, { status: 400 });
	}

	const windowSeconds = endSeconds - startSeconds;

	if (windowSeconds > MAX_DAYS * SECONDS_PER_DAY) {
		return json({ error: `The time range cannot exceed ${MAX_DAYS} days.` }, { status: 400 });
	}

	const stepSeconds = positiveNumber(
		url.searchParams.get('stepSeconds'),
		DEFAULT_STEP_SECONDS,
		MAX_STEP_SECONDS
	);

	if (stepSeconds === null || !Number.isInteger(stepSeconds)) {
		return json(
			{
				error: `stepSeconds must be a positive integer no greater than ${MAX_STEP_SECONDS}.`
			},
			{ status: 400 }
		);
	}

	const functionType = (url.searchParams.get('function') ?? 'AVG').trim().toUpperCase();

	if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(functionType)) {
		return json({ error: 'Invalid function parameter.' }, { status: 400 });
	}

	try {
		const eds = getEdsClient();
        // mustupdate
		const values = await eds.tabular.fetch(tags, startSeconds, endSeconds, stepSeconds, functionType);

		return json(
			{
				request: {
					tags,
					start: new Date(startSeconds * 1000).toISOString(),
					end: new Date(endSeconds * 1000).toISOString(),
					days: windowSeconds / SECONDS_PER_DAY,
					windowSeconds,
					stepSeconds,
					function: functionType
				},
				values
			},
			{ headers: { 'Cache-Control': 'no-store' } }
		);
	} catch (error) {
		console.error('[API /api/plot] EDS tabular request failed:', error);

		return json(
			{
				error: 'The EDS tabular request failed.',
				detail: error instanceof Error ? error.message : String(error)
			},
			{ status: 502 }
		);
	}
};

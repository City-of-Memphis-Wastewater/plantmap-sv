
 // src/routes/api/plot/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getEdsClient } from '$lib/server/eds/factory';

const DEFAULT_DAYS = 1;
const DEFAULT_STEP_SECONDS = 60;

const MAX_DAYS = 365;
const MAX_TAGS = 25;
const MAX_STEP_SECONDS = 86_400;

function positiveNumber(
	value: string | null,
	fallback: number,
	maximum: number
): number | null {
	if (value === null) {
		return fallback;
	}

	const parsed = Number(value);

	if (
		!Number.isFinite(parsed) ||
		parsed <= 0 ||
		parsed > maximum
	) {
		return null;
	}

	return parsed;
}

export const GET: RequestHandler = async ({ url }) => {
	const rawTags = url.searchParams.getAll('tags').join(',');

	const tags = [
		...new Set(
			rawTags
				.split(',')
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
		return json(
			{ error: `A maximum of ${MAX_TAGS} tags may be requested.` },
			{ status: 400 }
		);
	}

	const days = positiveNumber(
		url.searchParams.get('days'),
		DEFAULT_DAYS,
		MAX_DAYS
	);

	const stepSeconds = positiveNumber(
		url.searchParams.get('stepSeconds'),
		DEFAULT_STEP_SECONDS,
		MAX_STEP_SECONDS
	);

	if (days === null) {
		return json(
			{ error: `days must be greater than 0 and at most ${MAX_DAYS}.` },
			{ status: 400 }
		);
	}

	if (stepSeconds === null || !Number.isInteger(stepSeconds)) {
		return json(
			{
				error: `stepSeconds must be a positive integer no greater than ${MAX_STEP_SECONDS}.`
			},
			{ status: 400 }
		);
	}

	const functionType = (
		url.searchParams.get('function') ?? 'AVG'
	).trim().toUpperCase();

	// Restrict this parameter to the characters expected in an EDS
	// aggregation/function name. Confirm supported values against EDS.
	if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(functionType)) {
		return json(
			{ error: 'Invalid function parameter.' },
			{ status: 400 }
		);
	}

	const windowSeconds = Math.round(days * 86_400);

	try {
		const eds = getEdsClient();

		const values = await eds.tabular.fetch(
			tags,
			windowSeconds,
			stepSeconds,
			functionType
		);

		return json(
			{
				request: {
					tags,
					days,
					windowSeconds,
					stepSeconds,
					function: functionType
				},
				values
			},
			{
				headers: {
					'Cache-Control': 'no-store'
				}
			}
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


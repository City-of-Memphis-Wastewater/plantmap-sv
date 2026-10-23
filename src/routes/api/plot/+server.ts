// src/routes/api/plot/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getEdsClient } from '$lib/server/eds/factory';
import { parsePlotUrl } from '$lib/plot/url';
import { assessTimeRange } from '$lib/plot/time-range';
import { resolveSamplingInterval } from '$lib/plot/sampling';
import { DEFAULT_FUNCTION_TYPE } from '$lib/plot/context';

export const GET: RequestHandler = async ({ url }) => {
	// Preserve compatibility with callers using the previous parameter name.
	const params = new URLSearchParams(url.searchParams);

	if (!params.has('secondsBetweenPoints') && params.has('stepSeconds')) {
		params.set('secondsBetweenPoints', params.get('stepSeconds')!);
	}

	// Parse and validate the URL using the shared plot contract.
	let options;

	try {
		options = parsePlotUrl(params);
	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 400 }
		);
	}

	// Resolve the effective time range in one place.
	let timeRange;

	try {
		timeRange = assessTimeRange({
			start: options.start,
			end: options.end,
			days: options.days
		});
	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 400 }
		);
	}

	const { startSeconds, endSeconds } = timeRange;
	const windowSeconds = endSeconds - startSeconds;

	// Resolve the effective sampling interval.
	// datapointCount takes precedence over secondsBetweenPoints.
	let stepSeconds: number;

	try {
		stepSeconds = resolveSamplingInterval(
			windowSeconds,
			options.datapointCount,
			options.secondsBetweenPoints
		);
	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 400 }
		);
	}

	const functionType = options.functionType ?? DEFAULT_FUNCTION_TYPE;

	// Request the historical data from EDS.
	try {
		const eds = getEdsClient();

		const values = await eds.tabular.fetch(
			options.tags,
			startSeconds,
			endSeconds,
			stepSeconds,
			functionType
		);

		return json(
			{
				request: {
					tags: options.tags,
					start: new Date(startSeconds * 1000).toISOString(),
					end: new Date(endSeconds * 1000).toISOString(),
					days: windowSeconds / 86_400,
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

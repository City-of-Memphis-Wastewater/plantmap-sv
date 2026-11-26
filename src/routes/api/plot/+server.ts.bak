// src/routes/api/plot/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getEdsClient } from '#lib/server/eds/factory.js';
import { parsePlotUrl } from '#lib/plot/url.js';
import { resolveTimeAspects } from '#lib/plot/resolve-time.js';
import { DEFAULT_FUNCTION_TYPE, SECONDS_PER_DAY } from '#lib/plot/context.js';
import { assessPlotUnits } from '#lib/plot/units.js';

export const GET: RequestHandler = async ({ url }) => {
	// Preserve compatibility with callers using the previous parameter name.
	const params = new URLSearchParams(url.searchParams);

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

	let timeAspects;

	try {
		timeAspects = resolveTimeAspects({
			start: options.start,
			end: options.end,
			windowDays: options.windowDays,
			datapointCount: options.datapointCount,
			secondsBetweenPoints: options.secondsBetweenPoints
		});
	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 400 }
		);
	}

	const functionType = options.functionType ?? DEFAULT_FUNCTION_TYPE;

	// Request historical data and point metadata from EDS.
	try {
		const eds = getEdsClient();

		const metadata = await eds.getRegex(options.tags);
		const units = assessPlotUnits(options.tags, metadata);

		const values = await eds.tabular.fetch(
			options.tags,
			timeAspects.startSeconds,
			timeAspects.endSeconds,
			timeAspects.secondsBetweenPoints,
			functionType
		);

		return json(
			{
				request: {
					tags: options.tags,
					start: new Date(timeAspects.startSeconds * 1000).toISOString(),
					end: new Date(timeAspects.endSeconds * 1000).toISOString(),
					windowDays: timeAspects.windowSeconds / SECONDS_PER_DAY,
					secondsBetweenPoints: timeAspects.secondsBetweenPoints,
					function: functionType
				},
				values,
				units
			},
			{
				headers: {
					'Cache-Control': 'no-store'
				}
			}
		);
	} catch (error) {
		console.error('[API /api/plot] EDS plot request failed:', error);

		return json(
			{
				error: 'The EDS plot request failed.',
				detail: error instanceof Error ? error.message : String(error)
			},
			{ status: 502 }
		);
	}
};

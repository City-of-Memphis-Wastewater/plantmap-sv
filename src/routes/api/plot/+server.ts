// src/routes/api/plot/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AllTimeInputs, ResolvedTimeAspects } from '$lib/plot/types';

import { getEdsClient } from '$lib/server/eds/factory';
import { parsePlotUrl } from '$lib/plot/url';
import { resolveTimeAspects } from '$lib/plot/resolve-time';
import { 
    DEFAULT_FUNCTION_TYPE,
    SECONDS_PER_DAY
 } from '$lib/plot/context';

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

	// Request the historical data from EDS.
	try {
		const eds = getEdsClient();

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
					secondsBetweenPoints:timeAspects.secondsBetweenPoints,
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

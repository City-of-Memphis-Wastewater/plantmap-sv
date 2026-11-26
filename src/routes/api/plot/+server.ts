import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { parsePlotUrl } from '#lib/plot/url.js';
import { resolveTimeAspects } from '#lib/plot/resolve-time.js';
import { DEFAULT_FUNCTION_TYPE } from '#lib/plot/context.js';

import { preparePlot } from '#lib/plot/prepare.js';

export const GET: RequestHandler = async ({ url }) => {
	const params = new URLSearchParams(url.searchParams);

	let options;
	let timeAspects;

	try {
		options = parsePlotUrl(params);

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

	try {
		const plot = await preparePlot(options, timeAspects, functionType);

		return json(
			{
				request: plot.request,
				values: plot.values,
				units: plot.units,
				diagnostic: plot.diagnostic
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

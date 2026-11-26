import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { DEFAULT_FUNCTION_TYPE, SECONDS_PER_DAY } from '#lib/plot/context.js';

import { SUPPORTED_DOWNLOAD_FORMATS, DEFAULT_DOWNLOAD_FORMAT } from '#lib/download/context.js';

import type { DownloadFormat } from '#lib/download/context.js';

import { parsePlotUrl } from '#lib/plot/url.js';
import { resolveTimeAspects } from '#lib/plot/resolve-time.js';
import { getEdsClient } from '#lib/server/eds/factory.js';

import { serializeTelemetryCsv } from '#lib/download/csv.js';
import { serializeTelemetryJson } from '#lib/download/json.js';

import { renderChartSvg } from '#lib/download/svg.js';
//import type { EDSTelemetrySeries } from '#lib/server/eds/types.js';
//import { buildTelemetryChartSeries } from '#lib/plot/series.js';
//import { buildTimeSeriesChartOptions } from '#lib/plot/chart-options.js'; // unused anyhere?
import { preparePlot } from '#lib/plot/prepare.js';

function parseFormats(params: URLSearchParams): DownloadFormat[] {
	const supplied = params.getAll('format');

	const formats = [
		...new Set(
			(supplied.length > 0 ? supplied : [DEFAULT_DOWNLOAD_FORMAT]) // If a download format is not provided, use the default
				.flatMap((value) => value.split(','))
				.map((value) => value.trim().toLowerCase())
				.filter(Boolean)
		)
	];
	console.log(`${Object.keys(formats)}`);

	for (const format of formats) {
		if (!SUPPORTED_DOWNLOAD_FORMATS.includes(format as DownloadFormat)) {
			throw new Error(
				`Unsupported download format "${format}". Supported formats: ${SUPPORTED_DOWNLOAD_FORMATS.join(', ')}.`
			);
		}
	}

	return formats as DownloadFormat[];
}

function buildFilename(
	tags: string[],
	startSeconds: number,
	endSeconds: number,
	extension: string
): string {
	const safeTags = tags
		.map((tag) => tag.replace(/[^a-zA-Z0-9_-]/g, '_'))
		.join('-')
		.slice(0, 100);

	const start = new Date(startSeconds * 1000)
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}Z$/, 'Z');

	const end = new Date(endSeconds * 1000)
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}Z$/, 'Z');

	return `plantmap-${safeTags}-${start}-${end}.${extension}`;
}

export const GET: RequestHandler = async ({ url }) => {
	let formats: DownloadFormat[];
	let options;
	let timeAspects;
    try {
        formats = parseFormats(url.searchParams);

        const params = new URLSearchParams(url.searchParams);
        params.delete('format');

        options = parsePlotUrl(params);

        timeAspects = resolveTimeAspects({
                start: options.start,
                end: options.end,
                windowDays: options.windowDays,
                datapointCount: options.datapointCount,
                secondsBetweenPoints: options.secondsBetweenPoints
        });;
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
		// ---
		if (formats.length > 1) {
			return json(
				{
					error: 'Multiple formats are not implemented yet.',
					requestedFormats: formats,
					supportedSingleFormatRequest: true
				},
				{ status: 501 }
			);
		}

		const format = formats[0];
		// SVG uses the same complete plot preparation as /api/plot.
		if (format === 'svg') {
			const plot = await preparePlot(options, timeAspects, functionType);
			const svg = renderChartSvg(plot.chartOptions);

			const filename = buildFilename(
				options.tags,
				timeAspects.startSeconds,
				timeAspects.endSeconds,
				'svg'
			);

			// CLI requests both files from this single plot preparation.
			if (includeDiagnostic) {
				return json(
					{
						svg,
						filename,
						diagnostic: plot.diagnostic,
						diagnosticFilename: filename.replace(/\.svg$/i, '-diagnostic.json')
					},
					{
						headers: {
							'Cache-Control': 'no-store'
						}
					}
				);
			}

			// Ordinary browser SVG download remains a plain SVG response.
			return new Response(svg, {
				headers: {
					'Content-Type': 'image/svg+xml; charset=utf-8',
					'Content-Disposition': `attachment; filename="${filename}"`,
					'Cache-Control': 'no-store'
				}
			});
		}

		// CSV and JSON retain their existing lightweight data-only path.
		const eds = getEdsClient();

		const values = await eds.tabular.fetch(
			options.tags,
			timeAspects.startSeconds,
			timeAspects.endSeconds,
			timeAspects.secondsBetweenPoints,
			functionType
		);

		const body = format === 'csv' ? serializeTelemetryCsv(values) : serializeTelemetryJson(values);

		const filename = buildFilename(
			options.tags,
			timeAspects.startSeconds,
			timeAspects.endSeconds,
			format
		);

		return new Response(body, {
			status: 200,
			headers: {
				'Content-Type':
					format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-store',
				'X-PlantMap-Window-Days': String(timeAspects.windowSeconds / SECONDS_PER_DAY),
				'X-PlantMap-Sampling-Seconds': String(timeAspects.secondsBetweenPoints),
				'X-PlantMap-Function': functionType
			}
		});
	} catch (error) {
		console.error('[API /api/download] EDS tabular request failed:', error);

		return json(
			{
				error: 'The EDS tabular request failed.',
				detail: error instanceof Error ? error.message : String(error)
			},
			{ status: 502 }
		);
	}
};

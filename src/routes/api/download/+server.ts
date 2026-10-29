import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import {
	DEFAULT_FUNCTION_TYPE,
	SECONDS_PER_DAY,
	SUPPORTED_DOWNLOAD_FORMATS,
	type DownloadFormat
} from '$lib/plot/context';

import { parsePlotUrl } from '$lib/plot/url';
import { resolveTimeAspects } from '$lib/plot/resolve-time';
import { getEdsClient } from '$lib/server/eds/factory';

import { serializeTelemetryCsv } from '$lib/download/csv';
import { serializeTelemetryJson } from '$lib/download/json';

import { renderChartSvg } from '$lib/download/svg';
import type { EDSTelemetrySeries } from '$lib/server/eds/types';
import { buildTelemetryChartSeries } from '$lib/plot/series';
import { buildTimeSeriesChartOptions } from '$lib/plot/chart-options';

function parseFormats(params: URLSearchParams): DownloadFormat[] {
	const supplied = params.getAll('format');

	if (supplied.length === 0) {
		throw new Error('Provide a download format: csv, json, or svg.');
	}

	const formats = [
		...new Set(
			supplied
				.flatMap((value) => value.split(','))
				.map((value) => value.trim().toLowerCase())
				.filter(Boolean)
		)
	];

	if (formats.length === 0) {
		throw new Error('Provide a download format: csv, json, or svg.');
	}

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
		const eds = getEdsClient();

		const values = await eds.tabular.fetch(
			options.tags,
			timeAspects.startSeconds,
			timeAspects.endSeconds,
			timeAspects.secondsBetweenPoints,
			functionType
		);

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

		//if (format === 'png') {
		//	return json(
		//		{
		//			error: 'PNG export is not implemented yet.'
		//		},
		//		{ status: 501 }
		//	);
		//}

		// Inside GET, after the existing EDS fetch:
		if (format === 'svg') {
			const chartSeries = buildTelemetryChartSeries(values as EDSTelemetrySeries);

			const svg = renderChartSvg({
				animation: false,
				backgroundColor: '#ffffff',
				legend: {
					type: 'scroll',
					top: 8
				},
				grid: {
					left: 72,
					right: 28,
					top: 58,
					bottom: 88
				},
				xAxis: {
					type: 'time',
					name: 'Time',
					nameLocation: 'middle',
					nameGap: 35
				},
				yAxis: {
					type: 'value',
					scale: true,
					name: 'Value'
				},
				dataZoom: [
					{ type: 'inside', xAxisIndex: 0 },
					{ type: 'slider', xAxisIndex: 0, bottom: 18 }
				],
				series: chartSeries
			});

			const filename = buildFilename(
				options.tags,
				timeAspects.startSeconds,
				timeAspects.endSeconds,
				'svg'
			);

			return new Response(svg, {
				headers: {
					'Content-Type': 'image/svg+xml; charset=utf-8',
					'Content-Disposition': `attachment; filename="${filename}"`,
					'Cache-Control': 'no-store'
				}
			});
		}

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

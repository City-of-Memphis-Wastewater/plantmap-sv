// src/lib/plot/url.ts

import { MAX_DAYS, MAX_DATAPOINT_COUNT, MAX_SECONDS_BETWEEN_POINTS, MAX_TAGS } from './context.ts';
import type { PlotOptions } from './types.ts';

function parsePositiveNumber(
	value: string | null,
	name: string,
	maximum: number,
	integer = false
): number | undefined {
	if (value === null || value.trim() === '') {
		return undefined;
	}

	const parsed = Number(value);

	if (
		!Number.isFinite(parsed) ||
		parsed <= 0 ||
		parsed > maximum ||
		(integer && !Number.isInteger(parsed))
	) {
		throw new Error(
			`${name} must be a positive ${integer ? 'integer' : 'number'} no greater than ${maximum}.`
		);
	}

	return parsed;
}

function parseTags(params: URLSearchParams): string[] {
	// Accept repeated tags and comma-separated values.
	const tags = params
		.getAll('tags')
		.flatMap((value) => value.split(','))
		.map((tag) => tag.trim())
		.filter(Boolean);

	const uniqueTags = [...new Set(tags)];

	if (uniqueTags.length === 0) {
		throw new Error('Provide at least one IDCS tag.');
	}

	if (uniqueTags.length > MAX_TAGS) {
		throw new Error(`A maximum of ${MAX_TAGS} tags is allowed.`);
	}

	return uniqueTags;
}

function parseFunctionType(params: URLSearchParams): string | undefined {
	const value = params.get('function');

	if (value === null || value.trim() === '') {
		return undefined;
	}

	const functionType = value.trim();

	if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(functionType)) {
		throw new Error('Invalid aggregation function.');
	}

	return functionType;
}

/**
 * Parse and validate plot options from URL query parameters.
 *
 * Unspecified options remain undefined so downstream request resolution
 * can apply defaults and sampling precedence consistently.
 */
export function parsePlotUrl(params: URLSearchParams): PlotOptions {
	const tags = parseTags(params);

	const start = params.get('start') ?? undefined;
	const end = params.get('end') ?? undefined;

	// Validate supplied dates here, while retaining their original
	// representation for round-tripping and display.
	if (start !== undefined && !Number.isFinite(Date.parse(start))) {
		throw new Error(`Invalid start time: ${start}`);
	}

	if (end !== undefined && !Number.isFinite(Date.parse(end))) {
		throw new Error(`Invalid end time: ${end}`);
	}

	const windowDays = parsePositiveNumber(params.get('days'), 'windowDays', MAX_DAYS);

	const datapointCount = parsePositiveNumber(
		params.get('datapointCount'),
		'datapointCount',
		MAX_DATAPOINT_COUNT,
		true
	);

	const secondsBetweenPoints = parsePositiveNumber(
		params.get('secondsBetweenPoints'),
		'secondsBetweenPoints',
		MAX_SECONDS_BETWEEN_POINTS,
		true
	);

	const functionType = parseFunctionType(params);

	return {
		tags,
		start,
		end,
		windowDays: windowDays,
		datapointCount,
		secondsBetweenPoints,
		functionType
	};
}

/**
 * Build canonical query parameters for a plot.
 *
 * Undefined options are omitted. Tags are emitted as repeated parameters.
 */
export function buildPlotSearchParams(options: PlotOptions): URLSearchParams {
	const params = new URLSearchParams();

	//for (const tag of [...new Set(options.tags.map((tag) => tag.trim()).filter(Boolean))]) {
	//	params.append('tags', tag);
	//}

	if (options.tags !== undefined) {
		params.set(
			'tags',
			[...new Set(options.tags.map((tag) => tag.trim()).filter(Boolean))].join(',')
		);
	}

	if (options.start !== undefined) {
		params.set('start', options.start);
	}

	if (options.end !== undefined) {
		params.set('end', options.end);
	}

	if (options.windowDays !== undefined && !(options.start && options.end)) {
		params.set('days', String(options.windowDays));
	}

	if (options.datapointCount !== undefined) {
		params.set('datapointCount', String(options.datapointCount));
	}

	if (options.secondsBetweenPoints !== undefined) {
		params.set('secondsBetweenPoints', String(options.secondsBetweenPoints));
	}

	if (options.functionType !== undefined) {
		params.set('function', options.functionType);
	}

	return params;
	//return params.toString().replace(/%2C/gi, ',');
}

/**
 * Build a plot URL against an absolute base URL.
 * Useful for the CLI; browser code can use buildPlotSearchParams directly.
 */
export function buildPlotUrl(baseUrl: string, options: PlotOptions): URL {
	let url: URL;

	try {
		url = new URL('/plot', baseUrl);
	} catch {
		throw new Error(`Invalid PlantMap base URL: ${baseUrl}`);
	}

	url.search = buildPlotSearchParams(options).toString();

	return url;
}

// parsers/points.ts
import {
	getXmlBlocks,
	getXmlText,
	parseNumericValue,
	parseBooleanValue,
	parseXmlQuality,
	parseXmlTimestamp
} from './common';
import type { EdsPointTelemetry } from '../types';

/**
 * Parse individual point records from an Ovation EDS getPoints response.
 * Values and quality are independent: a bad-quality reading is retained
 * whenever a numeric value is available.
 * Missing numeric values and timestamps remain null.
 */

export function parseGetPointsResponse(xml: string): Record<string, EdsPointTelemetry> {
	const results: Record<string, EdsPointTelemetry> = {};

	for (const block of getXmlBlocks(xml, 'points')) {
		const sid = getXmlText(block, 'sid') ?? '';
		const iess = getXmlText(block, 'iess') ?? '';
		const idcs = getXmlText(block, 'idcs') ?? '';
		const description = getXmlText(block, 'desc') ?? '';
		const units = getXmlText(block, 'un') ?? '';

		if (!iess) {
			continue;
		}

		const rawValue = getXmlText(block, 'av') ?? getXmlText(block, 'dv');
		const booleanValue = getXmlText(block, 'bv');
		const value = parseNumericValue(rawValue) ?? parseBooleanValue(booleanValue);

		const point: EdsPointTelemetry = {
			sid,
			iess,
			idcs,
			description,
			units,
			value,
			quality: parseXmlQuality(block),
			timestamp: parseXmlTimestamp(block)
		};

		results[iess] = point;
	}

	return results;
}

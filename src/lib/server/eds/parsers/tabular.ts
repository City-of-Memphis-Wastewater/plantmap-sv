// src/lib/server/eds/parsers/tabular.ts
// valid boolean is being converted to null
import {
	getXmlBlocks,
	getXmlText,
	parseNumericValue,
	parseXmlQuality,
	parseXmlTimestamp,
    parseBooleanValue
} from './common';
import type { EDSTelemetrySeries } from '../types';

/**
 * Parse an Ovation EDS getTabular response into historical series.
 *
 * Each tag maps to an array of samples in the order returned by EDS.
 * Missing or invalid values remain null. Quality does not determine
 * whether a sample is retained.
 */
export function parseTabularResponse(xml: string, requestedTags: string[]): EDSTelemetrySeries {
	const results: EDSTelemetrySeries = {};

	// Extract point IDs in the order returned by EDS.
	const pointTags = getXmlBlocks(xml, 'pointsIds')
		.map((block) => getXmlText(block, 'iess') ?? getXmlText(block, 'idcs'))
		.filter((tag): tag is string => tag !== null && tag !== '')
		.map((tag) => tag.trim().toUpperCase());

	const activeTags = pointTags.length > 0 ? pointTags : requestedTags;

	// Create an array for every requested/returned tag, including tags
	// for which EDS supplies no samples.
	for (const tag of activeTags) {
		results[tag] ??= [];
	}

	// Support both known row element names.
	const rows = [...getXmlBlocks(xml, 'rows'), ...getXmlBlocks(xml, 'TabularRow')];

	for (const row of rows) {
		const timestamp = parseXmlTimestamp(row);

		// Each row contains a value block for each requested point,
		// in the same order as the point IDs.
		const valueBlocks = [...getXmlBlocks(row, 'values'), ...getXmlBlocks(row, 'TabularValue')];

		valueBlocks.forEach((valueBlock, index) => {
			if (index >= activeTags.length) {
				return;
			}

			const tag = activeTags[index];

			const value =
				parseNumericValue(getXmlText(valueBlock, 'dav')) ??
				parseNumericValue(getXmlText(valueBlock, 'value')) ??
				parseNumericValue(getXmlText(valueBlock, 'av')) ??
				parseNumericValue(getXmlText(valueBlock, 'dv')) ??
                parseBooleanValue(getXmlText(valueBlock, 'bv'));
                
			results[tag].push({
				iessTag: tag,
				value,
				quality: parseXmlQuality(valueBlock),
				timestamp
			});
		});
	}

	return results;
}

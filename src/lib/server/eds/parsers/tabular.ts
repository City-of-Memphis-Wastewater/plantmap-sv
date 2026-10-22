// parsers/tabular.ts

import {
getXmlBlocks,
getXmlText,
parseNumericValue,
parseXmlQuality,
parseXmlTimestamp
} from './common';
import type { EDSTelemetryValue } from '../types';

/**
* Parse an Ovation EDS getTabular response.
* The latest row is used, matching the behavior of the original parser.
* Values are never replaced with zero, and quality does not determine
* whether a reading is retained.
*/
  
  export function parseTabularResponse(
  xml: string,
  requestedTags: string[]
  ): Record<string, EDSTelemetryValue> {
  const results: Record<string, EDSTelemetryValue> = {};
  
  // Extract point IDs in the order returned by EDS.
  const pointTags = getXmlBlocks(xml, 'pointsIds')
  .map((block) => getXmlText(block, 'iess') ?? getXmlText(block, 'idcs'))
  .filter((tag): tag is string => tag !== null && tag !== '')
  .map((tag) => tag.trim().toUpperCase());
  
  const activeTags = pointTags.length > 0 ? pointTags : requestedTags;
  
  // Support both known row element names.
  const rows = [
  ...getXmlBlocks(xml, 'rows'),
  ...getXmlBlocks(xml, 'TabularRow')
  ];
  
  if (rows.length === 0) {
  return results;
  }
  
  const lastRow = rows[rows.length - 1];
  const timestamp = parseXmlTimestamp(lastRow);
  
  // Support both known value container element names.
  const valueBlocks = [
  ...getXmlBlocks(lastRow, 'values'),
  ...getXmlBlocks(lastRow, 'TabularValue')
  ];
  
  valueBlocks.forEach((valueBlock, index) => {
  if (index >= activeTags.length) {
  return;
  }
  
   const tag = activeTags[index];

 const value =
 	parseNumericValue(getXmlText(valueBlock, 'value')) ??
 	parseNumericValue(getXmlText(valueBlock, 'av')) ??
 	parseNumericValue(getXmlText(valueBlock, 'dv'));

 results[tag] = {
 	iessTag: tag,
 	value,
 	quality: parseXmlQuality(valueBlock),
 	timestamp
 };
  
  });
  
  return results;
  }
  

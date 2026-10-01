// parsers/tabular.ts

import type { EDSTelemetryValue } from '../types';

export function parseTabularResponse(
    xml: string,
    requestedTags: string[]
): Record<string, EDSTelemetryValue> {
    const results: Record<string, EDSTelemetryValue> = {};

    const pointsMatch =
        xml.match(
            /<pointsIds[^>]*>([\s\S]*?)<\/pointsIds>/gi
        ) || [];

    const pointTags: string[] = [];

    for (const pBlock of pointsMatch) {
        const tagMatch =
            pBlock.match(
                /<iess[^>]*>([^<]+)<\/iess>/i
            ) ||
            pBlock.match(
                /<idcs[^>]*>([^<]+)<\/idcs>/i
            );

        if (tagMatch) {
            pointTags.push(
                tagMatch[1].trim().toUpperCase()
            );
        }
    }

    const activeTags =
        pointTags.length > 0
            ? pointTags
            : requestedTags;

    const rowBlocks =
        xml.match(
            /<rows[^>]*>([\s\S]*?)<\/rows>/gi
        ) ||
        xml.match(
            /<TabularRow[^>]*>([\s\S]*?)<\/TabularRow>/gi
        ) ||
        [];

    if (rowBlocks.length > 0) {
        const lastRow =
            rowBlocks[rowBlocks.length - 1];

        const tsMatch =
            lastRow.match(
                /<second[^>]*>([^<]+)<\/second>/i
            );

        const timestamp = tsMatch
            ? new Date(
                    parseInt(tsMatch[1], 10) * 1000
                ).toISOString()
            : new Date().toISOString();

        const valueBlocks =
            lastRow.match(
                /<values[^>]*>([\s\S]*?)<\/values>/gi
            ) ||
            lastRow.match(
                /<TabularValue[^>]*>([\s\S]*?)<\/TabularValue>/gi
            ) ||
            [];

        valueBlocks.forEach(
            (valBlock, idx) => {
                if (idx < activeTags.length) {
                    const tag = activeTags[idx];

                    const valMatch =
                        valBlock.match(
                            /<value[^>]*>([^<]+)<\/value>/i
                        );

                    const qualMatch =
                        valBlock.match(
                            /<quality[^>]*>([^<]+)<\/quality>/i
                        );

                    const rawVal = valMatch
                        ? parseFloat(valMatch[1])
                        : 0;

                    const qualityStr = qualMatch
                        ? qualMatch[1].toUpperCase()
                        : 'GOOD';

                    results[tag] = {
                        iessTag: tag,
                        value: Number.isNaN(rawVal)
                            ? 0
                            : rawVal,
                        quality:
                            qualityStr.includes('NONE') ||
                            qualityStr.includes('BAD')
                                ? 'BAD'
                                : 'GOOD',
                        timestamp
                    };
                }
            }
        );
    }

    return results;
}
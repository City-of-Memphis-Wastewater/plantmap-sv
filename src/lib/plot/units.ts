// src/lib/plot/units.ts

import type { EdsPointTelemetry } from '#lib/server/eds/types.js';

/**
 * A single unique engineering-unit axis.
 */
export interface PlotUnitAxis {
	index: number;
	units: string;
	tags: string[];
}

/**
 * Results of analyzing the units associated with selected plot tags.
 */
export interface PlotUnitAssessment {
	axes: PlotUnitAxis[];
	tagToAxisIndex: Record<string, number>;
	tagUnits: Record<string, string>;
}

/**
 * Normalize a unit string for grouping purposes.
 *
 * We deliberately do not convert units or assume equivalence
 * between different engineering units.
 */
function normalizeUnits(units: string | undefined): string {
	const normalized = units?.trim().replace(/\s+/g, ' ');

	return normalized || 'Unknown';
}

/**
 * Produce a stable comparison key for grouping units.
 *
 * This allows " GPM " and "GPM" to share an axis, while
 * preserving the original display label.
 */
function unitsKey(units: string): string {
	return units.toLowerCase();
}

/**
 * Resolve metadata for a selected tag.
 *
 * EDS metadata may be indexed by IESS tag while plot tags
 * may be supplied using their IDCS identifiers.
 */
function resolveMetadata(
	tag: string,
	metadata: Record<string, EdsPointTelemetry>
): EdsPointTelemetry | undefined {
	// Direct key match.
	if (metadata[tag]) {
		return metadata[tag];
	}

	// Match the IDCS field.
	const byIdcs = Object.values(metadata).find((point) => point.idcs === tag);

	if (byIdcs) {
		return byIdcs;
	}

	// Match the IESS field.
	return Object.values(metadata).find((point) => point.iess === tag);
}

/**
 * Analyze selected plot tags and group them by engineering units.
 *
 * Tags sharing the same normalized units receive the same Y-axis.
 * Axis indexes are deterministic based on alphabetical unit order.
 *
 * No unit conversions are performed.
 */
export function assessPlotUnits(
	tags: string[],
	metadata: Record<string, EdsPointTelemetry>
): PlotUnitAssessment {
	const grouped = new Map<string, PlotUnitAxis>();
	const tagToAxisIndex: Record<string, number> = {};
	const tagUnits: Record<string, string> = {};

	// Collect unique units and their associated tags.
	for (const tag of tags) {
		const point = resolveMetadata(tag, metadata);
		const units = normalizeUnits(point?.units);
		const key = unitsKey(units);

		tagUnits[tag] = units;

		if (!grouped.has(key)) {
			grouped.set(key, {
				index: -1,
				units,
				tags: []
			});
		}

		grouped.get(key)!.tags.push(tag);
	}

	// Sort axes deterministically by normalized unit label.
	const axes = [...grouped.entries()]
		.sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
		.map(([, axis], index) => ({
			...axis,
			index
		}));

    // Build tag-to-axis lookup.
    for (const axis of axes) {
            for (const tag of axis.tags) {
                    tagToAxisIndex[tag] = axis.index;

                    // Also map the fully qualified EDS/IESS tag.
                    const point = resolveMetadata(tag, metadata);

                    if (point?.iess) {
                            tagToAxisIndex[point.iess] = axis.index;
                    }
            }
    }
        
	return {
		axes,
		tagToAxisIndex,
		tagUnits
	};
}

import { getEdsClient } from '#lib/server/eds/factory.js';
import type { EDSTelemetrySeries } from '#lib/server/eds/types.js';

import { SECONDS_PER_DAY } from '#lib/plot/context.js';
import type { PlotOptions, ResolvedTimeAspects } from '#lib/plot/types.js';

import { assessPlotUnits } from '#lib/plot/units.js';
import { buildTelemetryChartSeries } from '#lib/plot/series.js';
import { buildTimeSeriesChartOptions } from '#lib/plot/chart-options.js';
import {
    buildPlotDiagnosticReport,
    type PlotDiagnosticRequest
} from '#lib/plot/diagnostic.js';

/**
 * Fetch and prepare a complete historical plot.
 *
 * Shared by the interactive plot endpoint and SVG download endpoint.
 */
export async function preparePlot(
    options: PlotOptions,
    timeAspects: ResolvedTimeAspects,
    functionType: string
) {
    const eds = getEdsClient();

    // Retrieve metadata and telemetry using the resolved request.
    const metadata = await eds.getRegex(options.tags);
    const units = assessPlotUnits(options.tags, metadata);

    const values = (await eds.tabular.fetch(
        options.tags,
        timeAspects.startSeconds,
        timeAspects.endSeconds,
        timeAspects.secondsBetweenPoints,
        functionType
    )) as EDSTelemetrySeries;

    // Assign each series to its shared engineering-unit axis.
    const series = buildTelemetryChartSeries(values).map((item) => {
        const tag = String(item.name ?? '');
        const axisIndex = units.tagToAxisIndex[tag];

        if (axisIndex === undefined) {
            throw new Error(
                `No engineering-unit axis mapping found for ${tag}.`
            );
        }

        return {
            ...item,
            yAxisIndex: axisIndex
        };
    });

    // Build the one authoritative chart configuration.
    const chartOptions = buildTimeSeriesChartOptions({
        series,
        units
    });

    // Preserve the resolved time and sampling values.
    const request: PlotDiagnosticRequest = {
        tags: options.tags,
        start: new Date(timeAspects.startSeconds * 1000).toISOString(),
        end: new Date(timeAspects.endSeconds * 1000).toISOString(),
        windowDays: timeAspects.windowSeconds / SECONDS_PER_DAY,
        windowSeconds: timeAspects.windowSeconds,
        stepSeconds: timeAspects.secondsBetweenPoints,
        function: functionType
    };

    const diagnostic = buildPlotDiagnosticReport({
        request,
        values,
        units,
        chartOptions
    });

    return {
        request,
        values,
        units,
        series,
        chartOptions,
        diagnostic
    };
}

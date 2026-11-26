import type { EChartsOption } from 'echarts';
import type { EDSTelemetrySeries } from '#lib/server/eds/types.js';
import type { PlotUnitAssessment } from './units.js';
export interface PlotDiagnosticReport {
    reportVersion: number;
    generatedAt: string;
    request: PlotDiagnosticRequest;
    units: PlotUnitAssessment;
    seriesStats: Record<string, PlotSeriesStats>;
    axisStats: PlotAxisStats[];
    chartConfig: PlotChartConfig;
    diagnostics: PlotDiagnosticMessage[];
}

export interface PlotDiagnosticRequest {
    tags: string[];
    start: string;
    end: string;
    windowDays: number;
    windowSeconds: number;
    stepSeconds: number;
    function: string;
}

export interface PlotSeriesStats {
    units: string;
    axisIndex: number;
    min: number | null;
    max: number | null;
    range: number | null;
    validSamples: number;
    nullSamples: number;
}

export interface PlotAxisStats {
    index: number;
    units: string;
    position: 'left' | 'right';
    offset: number;
    scale: boolean;
    rawMin: number | null;
    rawMax: number | null;
    configuredMin: number | null;
    configuredMax: number | null;
}

export interface PlotChartConfig {
    xAxis: unknown;
    yAxis: unknown[];
    seriesMapping: Record<string, number>;
    grid: unknown;
    dataZoom: unknown[];
}

export interface PlotDiagnosticMessage {
    level: 'info' | 'warning' | 'error';
    code: string;
    message: string;
}

export interface BuildPlotDiagnosticReportInput {
    request: PlotDiagnosticRequest;
    values: EDSTelemetrySeries;
    units: PlotUnitAssessment;
    chartOptions: EChartsOption;
}

function finiteValues(
    samples: EDSTelemetrySeries[string]
): number[] {
    return samples
        .map((sample) => sample.value)
        .filter(
            (value): value is number =>
                typeof value === 'number' && Number.isFinite(value)
        );
}

function getRange(values: number[]) {
    if (values.length === 0) {
        return {
            min: null,
            max: null,
            range: null
        };
    }

    let min = values[0];
    let max = values[0];

    for (const value of values) {
        min = Math.min(min, value);
        max = Math.max(max, value);
    }

    return {
        min,
        max,
        range: max - min
    };
}

function asArray(value: unknown): unknown[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}

function asObject(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null) {
        return value as Record<string, unknown>;
    }

    return {};
}

function numericOption(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : null;
}

export function buildPlotDiagnosticReport({
    request,
    values,
    units,
    chartOptions
}: BuildPlotDiagnosticReportInput): PlotDiagnosticReport {
    const diagnostics: PlotDiagnosticMessage[] = [];

    const seriesStats: Record<string, PlotSeriesStats> = {};

    // Collect numeric samples by their assigned unit axis.
    const valuesByAxis: Record<number, number[]> = {};

    for (const [tag, samples] of Object.entries(values)) {
        const numericValues = finiteValues(samples);
        const range = getRange(numericValues);

        const axisIndex = units.tagToAxisIndex[tag] ?? -1;
        const tagUnits = units.tagUnits[tag] ?? 'Unknown';

        seriesStats[tag] = {
            units: tagUnits,
            axisIndex,
            ...range,
            validSamples: numericValues.length,
            nullSamples: samples.length - numericValues.length
        };

        if (axisIndex < 0) {
            diagnostics.push({
                level: 'error',
                code: 'MISSING_AXIS_MAPPING',
                message: `No engineering-unit axis mapping exists for ${tag}.`
            });
        } else {
            valuesByAxis[axisIndex] ??= [];
            valuesByAxis[axisIndex].push(...numericValues);
        }

        if (numericValues.length === 0) {
            diagnostics.push({
                level: 'warning',
                code: 'NO_VALID_SAMPLES',
                message: `${tag} contains no valid numeric samples.`
            });
        }

        if (tagUnits === 'Unknown') {
            diagnostics.push({
                level: 'warning',
                code: 'UNKNOWN_UNITS',
                message: `${tag} has no resolved engineering units.`
            });
        }
    }

    // Read the actual configured ECharts axes.
    const yAxisOptions = asArray(chartOptions.yAxis);

    const axisStats: PlotAxisStats[] = units.axes.map((axis) => {
        const axisOption = asObject(yAxisOptions[axis.index]);
        const range = getRange(valuesByAxis[axis.index] ?? []);

        return {
            index: axis.index,
            units: axis.units,
            position:
                axisOption.position === 'right' ? 'right' : 'left',
            offset: numericOption(axisOption.offset) ?? 0,
            scale: axisOption.scale === true,
            rawMin: range.min,
            rawMax: range.max,
            configuredMin: numericOption(axisOption.min),
            configuredMax: numericOption(axisOption.max)
        };
    });

    // Record which series use which Y-axis.
    const seriesMapping: Record<string, number> = {};

    for (const item of asArray(chartOptions.series)) {
        const series = asObject(item);
        const name = series.name;

        if (typeof name !== 'string') continue;

        const configuredIndex = numericOption(series.yAxisIndex);

        seriesMapping[name] =
            configuredIndex ?? units.tagToAxisIndex[name] ?? -1;
    }

    const chartConfig: PlotChartConfig = {
        xAxis: chartOptions.xAxis ?? {},
        yAxis: yAxisOptions,
        seriesMapping,
        grid: chartOptions.grid ?? {},
        dataZoom: asArray(chartOptions.dataZoom)
    };

    return {
        reportVersion: 1,
        generatedAt: new Date().toISOString(),
        request,
        units,
        seriesStats,
        axisStats,
        chartConfig,
        diagnostics
    };
}


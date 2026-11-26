import type { EDSTelemetrySeries } from '#lib/server/eds/types.js';
//import type { EChartsOption } from 'echarts';
import type { LineSeriesOption } from 'echarts/charts';

/**
 * Convert historical EDS samples into the series format ECharts expects.
 * Invalid timestamps are skipped; null values remain null to preserve gaps.
 */

export function buildTelemetryChartSeries(
    seriesData: EDSTelemetrySeries
): LineSeriesOption[] {
//): NonNullable<EChartsOption['series']> {
	return Object.entries(seriesData).map(([tag, samples]) => ({
		name: tag,
		type: 'line',
		showSymbol: false,
		connectNulls: false,
		data: samples
			.filter(
				(sample) => sample.timestamp !== null && Number.isFinite(Date.parse(sample.timestamp))
			)
			.map((sample) => [Date.parse(sample.timestamp!), sample.value] as [number, number | null])
	}));
}

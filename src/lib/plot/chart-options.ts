import type { EChartsOption } from 'echarts';

export interface TimeSeriesChartOptions {
	series: NonNullable<EChartsOption['series']>;
	title?: string;
}

/**
 * Shared ECharts configuration for interactive plots and file exports.
 *
 * The series are built by buildTelemetryChartSeries() in series.ts.
 * Missing values should remain null so the chart shows gaps.
 */
export function buildTimeSeriesChartOptions({
	series,
	title
}: TimeSeriesChartOptions): EChartsOption {
	return {
		animation: false,
		backgroundColor: '#ffffff',

		...(title
			? {
					title: {
						text: title,
						left: 'center',
						top: 12
					}
				}
			: {}),

		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'cross'
			}
		},

		legend: {
			type: 'scroll',
			top: title ? 44 : 12,
			left: 12,
			right: 12
		},

		grid: {
			left: 64,
			right: 28,
			top: title ? 88 : 58,
			bottom: 64,
			containLabel: true
		},

		xAxis: {
			type: 'time',
			axisLabel: {
				hideOverlap: true
			}
		},

		yAxis: {
			type: 'value',
			scale: true,
			splitLine: {
				show: true,
				lineStyle: {
					type: 'dashed'
				}
			}
		},

		dataZoom: [
			{
				type: 'inside',
				xAxisIndex: 0
			},
			{
				type: 'slider',
				xAxisIndex: 0,
				bottom: 8,
				height: 18
			}
		],

		series
	};
}

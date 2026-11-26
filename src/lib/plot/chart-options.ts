
import type { EChartsOption } from 'echarts';
import type { PlotUnitAssessment } from './units.js';

export interface TimeSeriesChartOptions {
    series: NonNullable<EChartsOption['series']>;
    units: PlotUnitAssessment;
    title?: string;
}

/**
 * Shared ECharts configuration for interactive plots and SVG exports.
 *
 * Every unique engineering unit gets one independent Y-axis.
 * Tags sharing those units share the same axis.
 */
export function buildTimeSeriesChartOptions({
    series,
    units,
    title
}: TimeSeriesChartOptions): EChartsOption {
    const leftAxisCount = units.axes.filter((axis) => axis.index % 2 === 0).length;
    const rightAxisCount = units.axes.filter((axis) => axis.index % 2 !== 0).length;

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
            },
            valueFormatter: (value) => {
                if (value == null) return 'No reading';
                return typeof value === 'number'
                    ? value.toLocaleString()
                    : String(value);
            }
        },

        legend: {
            type: 'scroll',
            top: title ? 44 : 8,
            left: 12,
            right: 12
        },

        grid: {
            left: 72 + Math.max(0, leftAxisCount - 1) * 50,
            right: 72 + Math.max(0, rightAxisCount - 1) * 50,
            top: title ? 88 : 58,
            bottom: 88,
            containLabel: true
        },

        xAxis: {
            type: 'time',
            name: 'Time',
            nameLocation: 'middle',
            nameGap: 35,
            axisLabel: {
                hideOverlap: true
            }
        },

        yAxis: units.axes.map((axis) => ({
            type: 'value' as const,
            scale: true,
            name: axis.units,
            position: axis.index % 2 === 0 ? ('left' as const) : ('right' as const),
            offset: Math.floor(axis.index / 2) * 50,
            axisLine: {
                show: true
            },
            axisLabel: {
                show: true
            },
            splitLine: {
                show: axis.index === 0,
                lineStyle: {
                    type: 'dashed' as const
                }
            }
        })),

        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: 0
            },
            {
                type: 'slider',
                xAxisIndex: 0,
                bottom: 18,
                height: 18
            }
        ],

        series
    };
}

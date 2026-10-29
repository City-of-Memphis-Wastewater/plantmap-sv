
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

export interface SvgRenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 1400;
const DEFAULT_HEIGHT = 800;

export function renderChartSvg(
  chartOptions: EChartsOption,
  {
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT
  }: SvgRenderOptions = {}
): string {
  if (!Number.isInteger(width) || width < 320 || width > 10000) {
    throw new RangeError('SVG width must be an integer between 320 and 10000.');
  }

  if (!Number.isInteger(height) || height < 240 || height > 10000) {
    throw new RangeError('SVG height must be an integer between 240 and 10000.');
  }

  const chart = echarts.init(null, undefined, {
    renderer: 'svg',
    ssr: true,
    width,
    height
  });

  try {
    chart.setOption(chartOptions);

    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}

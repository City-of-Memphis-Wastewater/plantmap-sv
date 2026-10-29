<script lang="ts">
	import './plot.css';
	import { onMount } from 'svelte';
	import type { ECharts, EChartsOption } from 'echarts';
	import type { EDSTelemetryValue } from '$lib/server/eds/types';

	import { buildPlotSearchParams, parsePlotUrl } from '$lib/plot/url';
	import { buildTelemetryChartSeries } from '$lib/plot/series';

	import {
		DEFAULT_TAGS,
		DEFAULT_DAYS,
		DEFAULT_DATAPOINT_COUNT,
		DEFAULT_FUNCTION_TYPE,
		MAX_TAGS,
		MAX_DAYS,
		MAX_DATAPOINT_COUNT,
		MAX_SECONDS_BETWEEN_POINTS,
		SUPPORTED_FUNCTION_TYPES,
		PLOT_API_PATH,
		PLOT_PAGE_PATH
	} from '$lib/plot/context';

	type PlotResponse = {
		request?: {
			tags: string[];
			start: string;
			end: string;
			windowDays: number;
			windowSeconds: number;
			stepSeconds: number;
			function: string;
		};
		values?: Record<string, EDSTelemetryValue[]>;
		error?: string;
		detail?: string;
	};

	let chartElement: HTMLDivElement;
	let chart: ECharts | undefined;

	// Form state
	let tagsInput = $state(DEFAULT_TAGS.join(','));
	let startTime = $state('');
	let endTime = $state('');
	let windowDays = $state<string | number>('');
	let datapointCount = $state<string | number>(String(DEFAULT_DATAPOINT_COUNT));
	let secondsBetweenPoints = $state<string | number>('');
	let functionType = $state(DEFAULT_FUNCTION_TYPE);

	// Request state
	let loading = $state(false);
	let errorMessage = $state('');
	let statusMessage = $state('Enter one or more IDCS tags to plot historical data.');
	let sampleCount = $state(0);

	/**
	 * Convert a date-time input value into an ISO timestamp.
	 *
	 * datetime-local inputs contain local wall-clock time without a
	 * timezone. Date interprets that value in the browser's local timezone.
	 */
	function toIsoTimestamp(value: string): string | undefined {
		if (!value.trim()) {
			return undefined;
		}

		const milliseconds = new Date(value).getTime();

		if (!Number.isFinite(milliseconds)) {
			throw new Error(`Invalid date and time: ${value}`);
		}

		return new Date(milliseconds).toISOString();
	}

	/**
	 * Convert a timestamp from a URL into the value expected by a
	 * datetime-local input.
	 */
	function toLocalDateTimeInput(value: string | undefined): string {
		if (!value) {
			return '';
		}

		const date = new Date(value);

		if (!Number.isFinite(date.getTime())) {
			return '';
		}

		const pad = (part: number) => String(part).padStart(2, '0');

		return (
			`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
			`T${pad(date.getHours())}:${pad(date.getMinutes())}`
		);
	}

	/**
	 * Build the canonical plot query from the form.
	 *
	 * URL parsing and validation are shared with the API contract.
	 * Time-range and sampling resolution remain the API's responsibility.
	 */
	function buildRequestParams(): URLSearchParams {
		const tags = [
			...new Set(
				tagsInput
					.split(',')
					.map((tag) => tag.trim())
					.filter(Boolean)
			)
		];

		if (tags.length === 0) {
			throw new Error('Enter at least one IDCS tag.');
		}

		if (tags.length > MAX_TAGS) {
			throw new Error(`A maximum of ${MAX_TAGS} tags may be requested.`);
		}

		const start = toIsoTimestamp(startTime);
		const end = toIsoTimestamp(endTime);

		const daysText = String(windowDays ?? '').trim();
		const datapointCountText = String(datapointCount ?? '').trim();
		const secondsBetweenPointsText = String(secondsBetweenPoints ?? '').trim();

		const parsedDays = daysText === '' ? undefined : Number(daysText);

		const parsedDatapointCount = datapointCountText === '' ? undefined : Number(datapointCountText);

		const parsedSecondsBetweenPoints =
			secondsBetweenPointsText === '' ? undefined : Number(secondsBetweenPointsText);

		if (
			parsedDays !== undefined &&
			(!Number.isFinite(parsedDays) || parsedDays <= 0 || parsedDays > MAX_DAYS)
		) {
			throw new Error(`Days must be greater than 0 and no greater than ${MAX_DAYS}.`);
		}

		if (
			parsedDatapointCount !== undefined &&
			(!Number.isInteger(parsedDatapointCount) ||
				parsedDatapointCount <= 0 ||
				parsedDatapointCount > MAX_DATAPOINT_COUNT)
		) {
			throw new Error(`Datapoint count must be an integer between 1 and ${MAX_DATAPOINT_COUNT}.`);
		}

		if (
			parsedSecondsBetweenPoints !== undefined &&
			(!Number.isInteger(parsedSecondsBetweenPoints) ||
				parsedSecondsBetweenPoints <= 0 ||
				parsedSecondsBetweenPoints > MAX_SECONDS_BETWEEN_POINTS)
		) {
			throw new Error(
				`Sampling interval must be an integer between 1 and ${MAX_SECONDS_BETWEEN_POINTS} seconds.`
			);
		}

		const params = buildPlotSearchParams({
			tags,
			start,
			end,
			windowDays: parsedDays,
			datapointCount: parsedDatapointCount,
			secondsBetweenPoints: parsedSecondsBetweenPoints,
			functionType
		});

		// Run the same URL validation used by the API.
		parsePlotUrl(params);

		return params;
	}

	function downloadData(format: 'csv' | 'json' | 'svg'): void {
		try {
			const params = buildRequestParams();

			params.set('format', format);

			window.location.href = `/api/download?${params.toString()}`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	}
	/**
	 * Fetch historical telemetry and update the chart.
	 */
	async function loadTrend(autoLoad = false): Promise<void> {
		if (loading) {
			return;
		}

		loading = true;
		errorMessage = '';
		statusMessage = autoLoad
			? 'Loading the requested historical plot from EDS...'
			: 'Requesting historical data from EDS...';

		try {
			const params = buildRequestParams();
			const query = params.toString();

			// Keep the browser URL shareable and reloadable.
			window.history.replaceState(window.history.state, '', `${PLOT_PAGE_PATH}?${query}`);

			const response = await fetch(`${PLOT_API_PATH}?${query}`);
			const result = (await response.json()) as PlotResponse;

			if (!response.ok) {
				throw new Error(
					[result.error, result.detail].filter(Boolean).join(' ') ||
						`Historical request failed with HTTP ${response.status}.`
				);
			}

			const seriesData = result.values ?? {};

			const series = buildTelemetryChartSeries(seriesData);

			sampleCount = Object.values(seriesData).reduce((total, samples) => total + samples.length, 0);

			if (!chart) {
				throw new Error('The chart has not finished initializing.');
			}

			const option: EChartsOption = {
				animation: false,
				tooltip: {
					trigger: 'axis',
					valueFormatter: (value) => {
						if (value == null) {
							return 'No reading';
						}

						return typeof value === 'number' ? value.toLocaleString() : String(value);
					}
				},
				legend: {
					type: 'scroll',
					top: 8
				},
				grid: {
					left: 72,
					right: 28,
					top: 58,
					bottom: 88
				},
				xAxis: {
					type: 'time',
					name: 'Time',
					nameLocation: 'middle',
					nameGap: 35
				},
				yAxis: {
					type: 'value',
					scale: true,
					name: 'Value'
				},
				dataZoom: [
					{
						type: 'inside',
						xAxisIndex: 0
					},
					{
						type: 'slider',
						xAxisIndex: 0,
						bottom: 18
					}
				],
				series
			};

			chart.setOption(option, true);

			const returnedTags = Object.keys(seriesData);
			const request = result.request;

			statusMessage =
				`${sampleCount.toLocaleString()} samples returned across ` +
				`${returnedTags.length} tag(s).` +
				(request
					? ` Range: ${request.start} to ${request.end}. ` +
						`Sampling interval: ${request.stepSeconds}s.`
					: '');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);

			statusMessage = 'Unable to load the historical trend.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		let disposed = false;
		let shouldAutoLoad = false;

		const resizeChart = () => chart?.resize();

		// Initialize the form from a shared URL, if one was supplied.
		const params = new URLSearchParams(window.location.search);

		if (params.size > 0) {
			try {
				const options = parsePlotUrl(params);

				tagsInput = options.tags.join(',');
				startTime = toLocalDateTimeInput(options.start);
				endTime = toLocalDateTimeInput(options.end);
				windowDays = options.windowDays === undefined ? '' : String(options.windowDays);

				datapointCount =
					options.datapointCount !== undefined
						? String(options.datapointCount)
						: options.secondsBetweenPoints === undefined
							? String(DEFAULT_DATAPOINT_COUNT)
							: '';

				secondsBetweenPoints =
					options.secondsBetweenPoints === undefined ? '' : String(options.secondsBetweenPoints);

				functionType = options.functionType ?? DEFAULT_FUNCTION_TYPE;

				shouldAutoLoad = true;
			} catch (error) {
				errorMessage = error instanceof Error ? error.message : String(error);

				statusMessage = 'The plot URL contains invalid parameters.';
			}
		}

		void import('echarts')
			.then((echarts) => {
				if (disposed || !chartElement) {
					return;
				}

				chart = echarts.init(chartElement);
				window.addEventListener('resize', resizeChart);

				if (shouldAutoLoad) {
					void loadTrend(true);
				}
			})
			.catch((error: unknown) => {
				if (disposed) {
					return;
				}

				errorMessage = `Could not initialize ECharts: ${
					error instanceof Error ? error.message : String(error)
				}`;
			});

		return () => {
			disposed = true;
			window.removeEventListener('resize', resizeChart);
			chart?.dispose();
			chart = undefined;
		};
	});
</script>

<svelte:head>
	<title>Historical Telemetry Plot</title>
	<meta name="description" content="Plot historical Ovation EDS telemetry readings over time." />
</svelte:head>

<main class="plot-page">
	<header class="page-header">
		<a href="/" class="map-button" aria-label="Return to main map"> 🗺️ Map </a>
		<h1>Historical Telemetry</h1>
		<p>Retrieve and plot time-series data from Ovation EDS.</p>
	</header>
	<form
		onsubmit={(event) => {
			event.preventDefault();
			void loadTrend();
		}}
	>
		<div class="field tags-field">
			<label for="tags">IDCS tags</label>
			<input
				id="tags"
				bind:value={tagsInput}
				placeholder="M100FI, FI8001"
				autocomplete="off"
				spellcheck="false"
				required
			/>
			<small>
				Enter comma-separated IDs without the IESS suffix. Up to {MAX_TAGS} tags per request.
			</small>
		</div>

		<fieldset>
			<legend>Time range</legend>

			<div class="settings">
				<div class="field">
					<label for="start">Start time</label>
					<input id="start" type="datetime-local" bind:value={startTime} />
				</div>

				<div class="field">
					<label for="end">End time</label>
					<input id="end" type="datetime-local" bind:value={endTime} />
				</div>

				<div class="field">
					<label for="windowDays">Days</label>
					<input
						id="windoDays"
						type="number"
						min="0.001"
						max={MAX_DAYS}
						step="any"
						bind:value={windowDays}
					/>
				</div>
			</div>

			<small>
				Leave both dates blank to plot the most recent {DEFAULT_DAYS}
				days. With an end time only, Days defaults to {DEFAULT_DAYS}. With a start time only, leave
				Days blank to end at the current time. When both dates are supplied, they take precedence
				over Days.
			</small>
		</fieldset>

		<fieldset>
			<legend>Sampling</legend>

			<div class="settings">
				<div class="field">
					<label for="datapointCount">Target datapoints</label>
					<input
						id="datapointCount"
						type="number"
						min="1"
						max={MAX_DATAPOINT_COUNT}
						step="1"
						bind:value={datapointCount}
						oninput={() => {
							if (String(datapointCount ?? '').trim() !== '') {
								secondsBetweenPoints = '';
							}
						}}
					/>
				</div>

				<div class="field">
					<label for="secondsBetweenPoints"> Seconds between points </label>
					<input
						id="secondsBetweenPoints"
						type="number"
						min="1"
						max={MAX_SECONDS_BETWEEN_POINTS}
						step="1"
						bind:value={secondsBetweenPoints}
						oninput={() => {
							if (String(secondsBetweenPoints ?? '').trim() !== '') {
								datapointCount = '';
							}
						}}
					/>
				</div>

				<div class="field">
					<label for="function">Aggregation</label>
					<select id="function" bind:value={functionType}>
						{#each SUPPORTED_FUNCTION_TYPES as supportedFunction}
							<option value={supportedFunction}>
								{supportedFunction === 'VALUE' ? 'Value' : supportedFunction}
							</option>
						{/each}
					</select>
				</div>

				<button type="submit" disabled={loading}>
					{loading ? 'Loading…' : 'Plot trend'}
				</button>

				<button type="button" disabled={loading} onclick={() => downloadData('csv')}>
					Download CSV
				</button>

				<button type="button" disabled={loading} onclick={() => downloadData('json')}>
					Download JSON
				</button>

				<button type="button" disabled={loading} onclick={() => downloadData('svg')}>
					Download SVG
				</button>
			</div>

			<small>
				Enter either a target datapoint count or a sampling interval. If both are blank, the default
				target of
				{DEFAULT_DATAPOINT_COUNT} datapoints is used. The target is approximate; the API selects a supported
				sampling interval.
			</small>
		</fieldset>
	</form>

	{#if errorMessage}
		<p class="error" role="alert">{errorMessage}</p>
	{/if}

	<p class="status" aria-live="polite">{statusMessage}</p>

	<section class="chart-panel" aria-label="Historical telemetry chart">
		<div bind:this={chartElement} class="chart"></div>
	</section>
</main>

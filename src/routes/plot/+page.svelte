<script lang="ts">
	import { onMount } from 'svelte';
	import type { ECharts, EChartsOption } from 'echarts';
	import type { EDSTelemetryValue } from '$lib/server/eds/types';

	import { buildPlotSearchParams, parsePlotUrl } from '$lib/plot/url';

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
	let windowDays = $state('');

	let datapointCount = $state(String(DEFAULT_DATAPOINT_COUNT));
	let secondsBetweenPoints = $state('');
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

		const parsedDays = windowDays.trim() === '' ? undefined : Number(windowDays);

		const parsedDatapointCount = datapointCount.trim() === '' ? undefined : Number(datapointCount);

		const parsedSecondsBetweenPoints =
			secondsBetweenPoints.trim() === '' ? undefined : Number(secondsBetweenPoints);

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

			const series: NonNullable<EChartsOption['series']> = Object.entries(seriesData).map(
				([tag, samples]) => ({
					name: tag,
					type: 'line',
					showSymbol: false,
					connectNulls: false,
					data: samples
						.filter(
							(sample) => sample.timestamp !== null && Number.isFinite(Date.parse(sample.timestamp))
						)
						.map(
							(sample) => [Date.parse(sample.timestamp!), sample.value] as [number, number | null]
						)
				})
			);

			sampleCount = Object.values(seriesData).reduce((total, samples) => total + samples.length, 0);

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

			chart?.setOption(option, true);

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

<main>
	<header>
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
							if (datapointCount !== '') {
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
							if (secondsBetweenPoints !== '') {
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

<style>
	main {
		width: min(1200px, 100%);
		margin: 0 auto;
		padding: 1.25rem;
		box-sizing: border-box;
	}

	header {
		margin-bottom: 1.25rem;
	}

	h1 {
		margin: 0 0 0.4rem;
		font-size: 1.6rem;
	}

	header p,
	.status {
		color: var(--text-secondary, #666);
	}

	form {
		display: grid;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid var(--border-color, #ccc);
		border-radius: 0.6rem;
	}

	fieldset {
		display: grid;
		gap: 0.85rem;
		min-width: 0;
		margin: 0;
		padding: 0.85rem;
		border: 1px solid var(--border-color, #ccc);
		border-radius: 0.45rem;
	}

	legend {
		padding: 0 0.35rem;
		font-weight: 600;
	}

	.settings {
		display: flex;
		align-items: end;
		gap: 0.85rem;
		flex-wrap: wrap;
	}

	.field {
		display: grid;
		gap: 0.35rem;
		min-width: 125px;
		flex: 1 1 150px;
	}

	.tags-field {
		width: 100%;
	}

	label {
		font-weight: 600;
	}

	input,
	select,
	button {
		min-width: 0;
		box-sizing: border-box;
		font: inherit;
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--border-color, #aaa);
		border-radius: 0.35rem;
	}

	input,
	select {
		background: var(--input-background, transparent);
		color: inherit;
	}

	.tags-field input {
		width: 100%;
	}

	small {
		color: var(--text-secondary, #666);
		line-height: 1.5;
	}

	button {
		cursor: pointer;
		background: var(--button-background, #245a85);
		color: var(--button-color, white);
		border-color: transparent;
		flex: 0 0 auto;
	}

	button:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.status {
		min-height: 1.25rem;
		overflow-wrap: anywhere;
	}

	.error {
		color: var(--error-color, #b42318);
		overflow-wrap: anywhere;
	}

	.chart-panel {
		border: 1px solid var(--border-color, #ccc);
		border-radius: 0.6rem;
		overflow: hidden;
	}

	.chart {
		width: 100%;
		height: min(65vh, 600px);
		min-height: 340px;
	}

	@media (max-width: 600px) {
		main {
			padding: 0.75rem;
		}

		.settings {
			align-items: stretch;
			flex-direction: column;
		}

		.field {
			width: 100%;
			flex-basis: auto;
		}

		button {
			width: 100%;
		}

		.chart {
			height: 430px;
			min-height: 300px;
		}
	}
</style>

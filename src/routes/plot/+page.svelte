<script lang="ts">
	import { onMount } from 'svelte';
	import type { ECharts, EChartsOption } from 'echarts';
	import type { EDSTelemetryValue } from '$lib/server/eds/types';

	type PlotResponse = {
		request?: {
			tags: string[];
			days: number;
			stepSeconds: number;
			function: string;
		};
		values?: Record<string, EDSTelemetryValue[]>;
		error?: string;
		detail?: string;
	};
	let chartElement: HTMLDivElement;
	let chart: ECharts | undefined;

	let tagsInput = $state('M100FI');
	let days = $state('1');
	let stepSeconds = $state('900');
	let functionType = $state('AVG');

	let loading = $state(false);
	let errorMessage = $state('');
	let statusMessage = $state('Enter one or more IDCS tags to plot historical data.');
	let sampleCount = $state(0);

	async function loadTrend() {
		const tags = [
			...new Set(
				tagsInput
					.split(',')
					.map((tag) => tag.trim())
					.filter(Boolean)
			)
		];

		if (tags.length === 0) {
			errorMessage = 'Enter at least one IDCS tag.';
			return;
		}

		const parsedDays = Number(days);
		const parsedStep = Number(stepSeconds);

		if (!Number.isFinite(parsedDays) || parsedDays <= 0 || parsedDays > 365) {
			errorMessage = 'Days must be greater than 0 and no more than 365.';
			return;
		}

		if (!Number.isInteger(parsedStep) || parsedStep <= 0 || parsedStep > 86400) {
			errorMessage = 'Step seconds must be a positive integer no greater than 86400.';
			return;
		}

		if (tags.length > 25) {
			errorMessage = 'A maximum of 25 tags may be requested at once.';
			return;
		}

		loading = true;
		errorMessage = '';
		statusMessage = 'Requesting historical data from EDS...';

		try {
			const params = new URLSearchParams({
				tags: tags.join(','),
				days: String(parsedDays),
				stepSeconds: String(parsedStep),
				function: functionType
			});

			const response = await fetch(`/api/plot?${params.toString()}`);
			const result = (await response.json()) as PlotResponse;

			if (!response.ok) {
				throw new Error(
					[result.error, result.detail].filter(Boolean).join(' ') ||
						`Historical request failed with HTTP ${response.status}.`
				);
			}

			const seriesData = result.values ?? {};

			const series = Object.entries(seriesData).map(([tag, samples]) => {
				const data = samples
					.filter(
						(sample) => sample.timestamp !== null && Number.isFinite(Date.parse(sample.timestamp))
					)
					.map(
						(sample) => [Date.parse(sample.timestamp!), sample.value] as [number, number | null]
					);

				return {
					name: tag,
					type: 'line' as const,
					showSymbol: false,
					connectNulls: false,
					data
				};
			});

			sampleCount = Object.values(seriesData).reduce((total, samples) => total + samples.length, 0);

			const option: EChartsOption = {
				animation: false,
				tooltip: {
					trigger: 'axis',
					valueFormatter: (value) =>
						value == null
							? 'No reading'
							: typeof value === 'number'
								? value.toLocaleString()
								: String(value)
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
					{ type: 'inside', xAxisIndex: 0 },
					{ type: 'slider', xAxisIndex: 0, bottom: 18 }
				],
				series
			};

			chart?.setOption(option, true);

			const returnedTags = Object.keys(seriesData);
			statusMessage =
				`${sampleCount.toLocaleString()} samples returned across ` +
				`${returnedTags.length} tag(s).`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
			statusMessage = 'Unable to load the historical trend.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		let disposed = false;

		const resizeChart = () => chart?.resize();

		void import('echarts')
			.then((echarts) => {
				if (disposed || !chartElement) return;

				chart = echarts.init(chartElement);
				window.addEventListener('resize', resizeChart);
			})
			.catch((error: unknown) => {
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

// src/routes/plot/+page.svelte

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
			/>
			<small>Enter comma-separated IDs without the IESS suffix.</small>
		</div>

		<div class="settings">
			<div class="field">
				<label for="days">Days</label>
				<input id="days" type="number" min="0.001" max="365" step="any" bind:value={days} />
			</div>

			<div class="field">
				<label for="step">Step (seconds)</label>
				<input id="step" type="number" min="1" max="86400" step="1" bind:value={stepSeconds} />
			</div>

			<div class="field">
				<label for="function">Aggregation</label>
				<select id="function" bind:value={functionType}>
					<option value="AVG">Average</option>
					<option value="VALUE">Value</option>
				</select>
			</div>

			<button type="submit" disabled={loading}>
				{loading ? 'Loading…' : 'Plot trend'}
			</button>
		</div>
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
		font: inherit;
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--border-color, #aaa);
		border-radius: 0.35rem;
	}

	input,
	select {
		min-width: 0;
		background: var(--input-background, transparent);
		color: inherit;
	}

	.tags-field input {
		width: 100%;
		box-sizing: border-box;
	}

	small {
		color: var(--text-secondary, #666);
	}

	button {
		cursor: pointer;
		background: var(--button-background, #245a85);
		color: var(--button-color, white);
		border-color: transparent;
	}

	button:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.status {
		min-height: 1.25rem;
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
		}

		.chart {
			height: 430px;
			min-height: 300px;
		}
	}
</style>

<!-- src/lib/components/PlotHUD.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { EDSTelemetrySeries, EDSTelemetryValue } from '$lib/server/eds/types';
	import { PLOT_API_PATH, DEFAULT_FUNCTION_TYPE } from '$lib/plot/context';

	let {
		tag,
		name = tag,
		x,
		y,
        currentValue
	}: {
		tag: string;
		name?: string;
		x: number;
		y: number;
        currentValue: string;
	} = $props();
    
    type PlotResponse = {
        sensorId?: string;
        readings?: {
            sampledAt: number;
            databaseTimestamp: number | null;
            value: number | null;
            quality: string | null;
        }[];
        error?: string;
        detail?: string;
    };

	type PlotResponseDefunct = {
		request?: {
			start: string;
			end: string;
			secondsBetweenPoints: number;
			function: string;
		};
		values?: EDSTelemetrySeries;
		error?: string;
		detail?: string;
	};

	type Point = {
		time: number;
		value: number;
	};

	let points = $state<Point[]>([]);
	let unit = $state('');
	let loading = $state(false);
	let error = $state('');
	let updatedAt = $state(0);

	const WINDOW_DAYS = 2;
	const STEP_SECONDS = 60;
	const CHART_WIDTH = 280;
	const CHART_HEIGHT = 100;
	const PADDING = 5;

	let requestController: AbortController | undefined;

	const chartPoints = $derived.by(() => {
		if (points.length === 0) return '';

		const values = points.map((point) => point.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;

		return points
			.map((point, index) => {
				const px = PADDING + (index / Math.max(points.length - 1, 1)) * (CHART_WIDTH - PADDING * 2);

				const py =
					CHART_HEIGHT - PADDING - ((point.value - min) / range) * (CHART_HEIGHT - PADDING * 2);

				return `${px.toFixed(2)},${py.toFixed(2)}`;
			})
			.join(' ');
	});

	const latestValue = $derived(points.at(-1)?.value);
	const minValue = $derived(
		points.length ? Math.min(...points.map((point) => point.value)) : undefined
	);
	const maxValue = $derived(
		points.length ? Math.max(...points.map((point) => point.value)) : undefined
	);

	const timeFormatter = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});

	async function loadHistory(sensorTag: string) {
		requestController?.abort();

		const controller = new AbortController();
		requestController = controller;

		loading = true;
		error = '';
		points = [];
		unit = '';
        
        const params = new URLSearchParams({
            sensorId: sensorTag
        });

        try {
            const response = await fetch(`/api/telemetry-history?${params}`, {
                signal: controller.signal
            });

            const result: PlotResponse = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.detail ?? result.error ?? `History request failed (${response.status})`
                );
            }

            if (controller.signal.aborted) return;

            points = (result.readings ?? [])
                .map((reading) => ({
                    time: reading.sampledAt * 1000,
                    value: reading.value
                }))
                .filter(
                    (point): point is Point =>
                        Number.isFinite(point.time) &&
                        typeof point.value === 'number' &&
                        Number.isFinite(point.value)
                )
                .sort((a, b) => a.time - b.time);

            updatedAt = Date.now();

            if (points.length === 0) {
                error = 'No cached readings in the last 48 hours.';
            }
        } catch (cause) {
            if (cause instanceof Error && cause.name === 'AbortError') return;

            error = cause instanceof Error ? cause.message : String(cause);
        } finally {
            if (!controller.signal.aborted) {
                loading = false;
            }
        }
		
	}

	onMount(() => {
		void loadHistory(tag);

		return () => requestController?.abort();
	});

	$effect(() => {
		const currentTag = tag;
		void currentTag;
		void loadHistory(tag);
	});
</script>

<div
	class="pointer-events-none absolute z-40 w-[312px] rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur-md"
	style="left: {x + 14}px; top: {y + 14}px;"
>
	<div class="mb-2 flex items-start justify-between gap-3">
		<div class="min-w-0">
			<div class="truncate font-semibold text-emerald-400">{name}</div>
			<div class="mt-0.5 truncate text-[10px] text-slate-500">{tag}</div>
		</div>

		<div class="shrink-0 text-right">
			{#if loading}
				<span class="text-slate-400">Loading…</span>
			{:else if latestValue !== undefined}
				<div class="font-mono text-sm font-semibold text-emerald-300">
					{latestValue.toLocaleString(undefined, { maximumFractionDigits: 3 })}
					<span class="text-[10px] font-normal text-emerald-500">{unit}</span>
				</div>
				<div class="text-[10px] text-slate-500">Latest</div>
			{/if}
		</div>
	</div>

	<div class="mb-1 flex items-center justify-between text-[10px] text-slate-500">
		<span>HISTORY · 48 HOURS</span>
		<span>{points.length} samples</span>
	</div>

	<div class="overflow-hidden rounded border border-slate-800 bg-slate-900/70 p-1">
		{#if points.length > 1}
			<svg
				viewBox="0 0 {CHART_WIDTH} {CHART_HEIGHT}"
				class="block h-[100px] w-full"
				role="img"
				aria-label="Historical telemetry plot for {name}"
			>
				<line
					x1="0"
					y1={CHART_HEIGHT / 2}
					x2={CHART_WIDTH}
					y2={CHART_HEIGHT / 2}
					stroke="#334155"
					stroke-dasharray="3 4"
					stroke-width="0.7"
				/>

				<polyline
					points={chartPoints}
					fill="none"
					stroke="#34d399"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					vector-effect="non-scaling-stroke"
				/>
			</svg>
		{:else if loading}
			<div class="flex h-[100px] items-center justify-center text-slate-500">
				Loading historical readings…
			</div>
		{:else if error}
			<div class="flex h-[100px] items-center justify-center px-2 text-center text-amber-400">
				{error}
			</div>
		{:else}
			<div class="flex h-[100px] items-center justify-center text-slate-500">
				Waiting for readings…
			</div>
		{/if}
	</div>

	{#if points.length > 0}
		<div class="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-400">
			<span>
				Min: {minValue?.toLocaleString(undefined, { maximumFractionDigits: 3 })}
			</span>
			<span>
				Max: {maxValue?.toLocaleString(undefined, { maximumFractionDigits: 3 })}
			</span>
		</div>

		<div class="mt-1 flex justify-between text-[10px] text-slate-500">
			<span>{new Date(points[0].time).toLocaleDateString()}</span>
			<span>{timeFormatter.format(points[0].time)}</span>
			<span>{timeFormatter.format(points.at(-1)!.time)}</span>
		</div>
	{/if}
</div>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import CesiumViewport from '$lib/components/CesiumViewport.svelte';
	import { telemetryStore } from '$lib/stores/telemetry.svelte';

	onMount(() => {
		telemetryStore.startPolling(10000);
	});

	onDestroy(() => {
		telemetryStore.stopPolling();
	});

	// Mock generator for offline fallback simulation
	$effect(() => {
		const interval = setInterval(() => {
			if (telemetryStore.isDegraded || !telemetryStore.isLoaded) {
				const randomH2S = Math.floor(400 + Math.random() * 50);
				telemetryStore.updateSensor('SWG-100', randomH2S);
			}
		}, 2000);

		return () => clearInterval(interval);
	});
</script>

<main class="relative h-screen w-screen overflow-hidden bg-slate-950">
	<CesiumViewport />

	<!-- Floating Telemetry HUD Overlay -->
	<div class="pointer-events-none absolute top-4 left-4 z-20 flex flex-col gap-2">
		<div class="pointer-events-auto select-text rounded-lg border border-slate-700/60 bg-slate-900/85 p-4 text-xs text-slate-100 shadow-2xl backdrop-blur-md">
			<div class="mb-2 flex items-center justify-between gap-4">
				<h2 class="font-bold uppercase tracking-wider text-slate-400">Live Plant Telemetry</h2>
				{#if telemetryStore.isDegraded}
					<span class="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">
						DEGRADED / FALLBACK
					</span>
				{:else}
					<span class="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
						ONLINE
					</span>
				{/if}
			</div>

			{#if telemetryStore.error}
				<div class="mb-2 text-[11px] text-amber-300/90 italic">
					⚠️ {telemetryStore.error}
				</div>
			{/if}
			{#each Object.values(telemetryStore.sensors || {}) as sensor (sensor.id)}
            	<div class="flex items-center justify-between gap-6 py-1 font-mono">
            		<span class="text-slate-300">{sensor.name || sensor.id}:</span>
            		<span class="font-bold text-emerald-400">{sensor.value ?? '--'} {sensor.unit}</span>
            	</div>
            {:else}
				<div class="py-2 text-slate-500">Loading sensor matrix...</div>
            {/each}
		</div>
	</div>
</main>

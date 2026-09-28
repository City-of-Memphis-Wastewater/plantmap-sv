<script lang="ts">
	import CesiumViewport from '$lib/components/CesiumViewport.svelte';
	import { telemetry } from '$lib/stores/telemetry.svelte';

	$effect(() => {
		const interval = setInterval(() => {
			const randomH2S = Math.floor(400 + Math.random() * 50);
			telemetry.updateSensor('SWG-100', randomH2S);
		}, 2000);

		return () => clearInterval(interval);
	});
</script>

<main class="relative h-screen w-screen overflow-hidden bg-slate-950">
	<!-- Fullscreen 3D Spatial Canvas -->
	<CesiumViewport />

	<!-- Floating Telemetry HUD Overlay -->
	<div class="pointer-events-none absolute top-4 left-4 z-20 flex flex-col gap-2">
		<div class="pointer-events-auto select-text rounded-lg border border-slate-700/60 bg-slate-900/85 p-4 text-xs text-slate-100 shadow-2xl backdrop-blur-md">
			<h2 class="mb-2 font-bold uppercase tracking-wider text-slate-400">Live Plant Telemetry</h2>
			{#each Object.values(telemetry.sensors) as sensor (sensor.id)}
				<div class="flex items-center justify-between gap-6 py-1 font-mono">
					<span class="text-slate-300">{sensor.name}:</span>
					<span class="font-bold text-emerald-400">{sensor.value} {sensor.unit}</span>
				</div>
			{/each}
		</div>
	</div>
</main>

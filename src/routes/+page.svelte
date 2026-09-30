<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import CesiumViewport from '$lib/components/CesiumViewport.svelte';
	import TelemetryHUD from '$lib/components/TelemetryHUD.svelte';
	import { telemetryStore } from '$lib/stores/telemetry.svelte';

	onMount(() => {
		telemetryStore.startPolling(10000);
	});

	onDestroy(() => {
		telemetryStore.stopPolling();
	});

	// Mock generator for offline fallback simulation.
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

	<!-- Overlay Controls -->
	<TelemetryHUD />
</main>
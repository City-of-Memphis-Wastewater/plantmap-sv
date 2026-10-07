<!-- src/routes/+page.svelte -->
<script lang="ts">
	console.log('[PAGE] module loaded');

	import { onMount } from 'svelte';
	import CesiumViewport from '$lib/components/CesiumViewport.svelte';
	import TelemetryHUD from '$lib/components/TelemetryHUD.svelte';
	import { telemetryStore } from '$lib/stores/telemetry-client.svelte';

	onMount(() => {
		console.log('[PAGE] onMount');
		telemetryStore.start();

		return () => {
			console.log('[PAGE] onMount cleanup');
			telemetryStore.stop();
		};
	});
</script>

<main class="relative h-screen w-screen overflow-hidden bg-slate-950">
	<CesiumViewport />
	<TelemetryHUD />
</main>


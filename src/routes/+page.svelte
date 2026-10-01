<!-- src/routes/+page.svelte -->
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

</script>

<main class="relative h-screen w-screen overflow-hidden bg-slate-950">
	<CesiumViewport />

	<!-- Overlay Controls -->
	<TelemetryHUD />
</main>
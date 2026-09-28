<script lang="ts">
	import { onMount } from 'svelte';

	// Svelte 5 state rune for live telemetry points
	let { sensorData = $bindable([]) } =$props<{ sensorData?: Array<{ id: string; x: number; y: number; val: number }> }>();
	let container: HTMLDivElement;

	onMount(() => {
		// Initialize WebGL context / Three.js / Cesium instance here
		// Attach canvas to `container`
		
		return () => {
			// Clean up WebGL context / web workers on unmount
		};
	});
</script>

<div class="viewport-container" bind:this={container}>
	<!-- UI Overlays / HUD rendering on top of 3D canvas -->
	<div class="hud-overlay">
		{#each sensorData as sensor (sensor.id)}
			<div class="sensor-badge">
				<span>{sensor.id}: {sensor.val}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.viewport-container {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}
	.hud-overlay {
		position: absolute;
		top: 1rem;
		left: 1rem;
		pointer-events: none;
	}
</style>

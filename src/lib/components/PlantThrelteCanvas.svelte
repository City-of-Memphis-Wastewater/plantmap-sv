<!-- src/lib/components/PlantThrelteCanvas.svelte -->
<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { OrbitControls, HTML } from '@threlte/extras';
	import { telemetry } from '$lib/stores/telemetry.svelte';
	import { gpsToLocalCoords } from '$lib/utils/geo';
</script>

<div class="h-screen w-screen bg-slate-900">
	<Canvas>
		<T.PerspectiveCamera makeDefault position={[0, 50, 100]} fov={50}>
			<OrbitControls target={[0, 0, 0]} />
		</T.PerspectiveCamera>

		<T.AmbientLight intensity={0.7} />
		<T.DirectionalLight position={[50, 100, 50]} intensity={1.2} />
		<T.GridHelper args={[300, 30]} />

		{#each Object.values(telemetry.sensors) as sensor (sensor.id)}
			{@const pos = gpsToLocalCoords(sensor.lat, sensor.lon)}
			<T.Group position={[pos.x, 2, pos.y]}>
				<!-- 3D Sensor Node Marker -->
				<T.Mesh>
					<T.CylinderGeometry args={[1, 1, 4, 16]} />
					<T.MeshStandardMaterial color={sensor.status === 'alarm' ? '#ef4444' : '#22c55e'} />
				</T.Mesh>

				<!-- 2D HTML/CSS Badge projected into 3D Space -->
				<HTML position={[0, 4, 0]} center transform>
					<div class="rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur">
						<div class="font-semibold text-slate-300">{sensor.name}</div>
						<div class="text-sm font-mono text-emerald-400">{sensor.value} <span class="text-slate-400">{sensor.unit}</span></div>
					</div>
				</HTML>
			</T.Group>
		{/each}
	</Canvas>
</div>

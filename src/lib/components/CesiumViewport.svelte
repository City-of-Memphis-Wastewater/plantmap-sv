<!-- src/lib/components/CesiumViewport.svelte -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import 'cesium/Build/Cesium/Widgets/widgets.css';

	import { telemetryStore } from '$lib/stores/telemetry.svelte';
	import { applyBasemap } from '$lib/cesium/layers';
	import { resetCamera, toggleViewMode } from '$lib/cesium/navigation';
	import { syncSensorEntities } from '$lib/cesium/syncSensors';

	import NavigationHUD from './NavigationHUD.svelte';
	import ViewportDebugger from './ViewportDebugger.svelte';
	import HoverTooltip from './HoverTooltip.svelte';

	let container: HTMLDivElement;
	let viewer: any = $state(undefined);
	let CesiumModule: any = $state(undefined);

	let geojsonDataSource: any = $state(null);
	let showGeoJson = $state(true);

	let statusMsg = $state('Initializing WebGL context...');
	let webGlSupported = $state(true);
	let errorLog = $state<string | undefined>(undefined);

	let hoverInfo = $state<{
		name: string;
		value: string;
		x: number;
		y: number;
	} | null>(null);

	let cameraPos = $state({
		lat: 0,
		lon: 0,
		alt: 0
	});

	let currentBasemap = $state<'satellite' | 'streets'>('satellite');
	let viewMode = $state<'2D' | '3D'>('2D');

	// UI state
	let showNavigation = $state(false);
	let showDebugger = $state(false);
	let showHoverInfo = $state(true);
	let showSensorLabels = $state(true);

	// Sync telemetry store to Cesium entities
	$effect(() => {
		syncSensorEntities(
			viewer,
			CesiumModule,
			telemetryStore.sensors,
			showSensorLabels
		);
	});

	function handleSwitchBasemap(type: 'satellite' | 'streets') {
		currentBasemap = type;
		applyBasemap(viewer, CesiumModule, type);
	}

	function handleToggleViewMode(targetMode: '2D' | '3D') {
		viewMode = targetMode;
		toggleViewMode(viewer, CesiumModule, targetMode);
	}

	function zoomIn() {
		viewer?.camera.zoomIn(300);
	}

	function zoomOut() {
		viewer?.camera.zoomOut(300);
	}

	function toggleGeoJson() {
		if (!geojsonDataSource) {
			console.warn('GeoJSON DataSource not loaded yet.');
			return;
		}
		geojsonDataSource.show = !geojsonDataSource.show;
		showGeoJson = geojsonDataSource.show;
		console.debug(`[Cesium] GeoJSON visibility: ${showGeoJson}`);
	}

	function toggleSensorLabels() {
		showSensorLabels = !showSensorLabels;
		if (!viewer) return;

		Object.values(viewer.entities.values).forEach((entity: any) => {
			if (entity.id?.startsWith('sensor-') && entity.label) {
				entity.label.show = showSensorLabels;
			}
		});
	}

	function handleResetCamera() {
		handleToggleViewMode('2D');
		resetCamera(viewer, CesiumModule);
	}

	onMount(() => {
		let isMounted = true;

		(async () => {
			try {
				await telemetryStore.init();

				const canvasTest = document.createElement('canvas');
				const gl =
					canvasTest.getContext('webgl2') ||
					canvasTest.getContext('webgl');

				if (!gl) {
					webGlSupported = false;
					statusMsg = 'WebGL context unavailable on this device.';
					return;
				}

				statusMsg = 'Setting asset base route...';
				(window as any).CESIUM_BASE_URL = '/cesium/';

				statusMsg = 'Importing Cesium bundle...';
				const Cesium = await import('cesium');
				CesiumModule = Cesium;

				await tick();

				if (!container) {
					errorLog = 'Viewport container missing from DOM.';
					return;
				}

				statusMsg = 'Initializing 3D Globe Viewer...';
				viewer = new Cesium.Viewer(container, {
					baseLayerPicker: false,
					animation: false,
					timeline: false,
					infoBox: false,
					geocoder: false,
					homeButton: false,
					sceneModePicker: false,
					navigationHelpButton: false,
					selectionIndicator: false
				});

				viewer.scene.globe.enableLighting = false;
				viewer.scene.globe.depthTestAgainstTerrain = false;

				viewer.scene.screenSpaceCameraController.enableRotate = true;
				viewer.scene.screenSpaceCameraController.enableTranslate = true;
				viewer.scene.screenSpaceCameraController.enableZoom = true;
				viewer.scene.screenSpaceCameraController.enableTilt = true;
				viewer.scene.screenSpaceCameraController.enableLook = true;

				applyBasemap(viewer, CesiumModule, currentBasemap);

				statusMsg = 'Loading GeoJSON layer...';
				const geojson = await Cesium.GeoJsonDataSource.load('/geojson/plant.geojson', {
					stroke: Cesium.Color.GREEN,
					fill: Cesium.Color.BLUE.withAlpha(0.15),
					strokeWidth: 3
				});

				geojsonDataSource = geojson;
				await viewer.dataSources.add(geojson);
				geojson.show = showGeoJson;

				if (!isMounted) return;

				viewer.resize();
				resetCamera(viewer, CesiumModule);

				// Mouse move listener for entity hover and camera position telemetry
				const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

				handler.setInputAction((movement: any) => {
					if (showHoverInfo) {
						const pickedObject = viewer.scene.pick(movement.endPosition);

						if (Cesium.defined(pickedObject) && pickedObject.id) {
							const sensor = pickedObject.id.properties?.sensorData?.getValue();
							hoverInfo = {
								name: pickedObject.id.name || pickedObject.id.id,
								value: sensor
									? `${sensor.value} ${sensor.unit}`
									: 'Entity Selected',
								x: movement.endPosition.x,
								y: movement.endPosition.y
							};
						} else {
							hoverInfo = null;
						}
					} else {
						hoverInfo = null;
					}

					const cartesian = viewer.camera.position;
					const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
					cameraPos = {
						lon: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)),
						lat: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)),
						alt: Math.round(cartographic.height)
					};
				}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

				// Camera position listener on view changes
				viewer.camera.changed.addEventListener(() => {
					const cartesian = viewer.camera.position;
					const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
					cameraPos = {
						lon: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)),
						lat: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)),
						alt: Math.round(cartographic.height)
					};
				});

				statusMsg = '3D Scene Operational';
			} catch (err: any) {
				console.error('Cesium execution error:', err);
				errorLog = err?.stack || err?.message || String(err);
			}
		})();

		return () => {
			isMounted = false;
			viewer?.destroy();
		};
	});
</script>

<div class="relative h-screen w-screen overflow-hidden bg-slate-950">
	<!-- Cesium viewport container -->
	<div class="absolute inset-0 h-full w-full" bind:this={container}></div>

	<!-- Navigation Controls HUD -->
	<NavigationHUD
		bind:showNavigation
		bind:showDebugger
		{viewMode}
		{currentBasemap}
		geojsonLoaded={!!geojsonDataSource}
		{showGeoJson}
		{showSensorLabels}
		{showHoverInfo}
		onToggleViewMode={handleToggleViewMode}
		onSwitchBasemap={handleSwitchBasemap}
		onResetCamera={handleResetCamera}
		onZoomIn={zoomIn}
		onZoomOut={zoomOut}
		onToggleGeoJson={toggleGeoJson}
		onToggleSensorLabels={toggleSensorLabels}
		onToggleHoverInfo={() => {
			showHoverInfo = !showHoverInfo;
			if (!showHoverInfo) hoverInfo = null;
		}}
	/>

	<!-- Hover Sensor Card -->
	{#if showHoverInfo && hoverInfo}
		<HoverTooltip {hoverInfo} />
	{/if}

	<!-- Debug Overlay -->
	{#if showDebugger}
		<ViewportDebugger
			{webGlSupported}
			{viewMode}
			{statusMsg}
			{cameraPos}
			{errorLog}
		/>
	{/if}
</div>
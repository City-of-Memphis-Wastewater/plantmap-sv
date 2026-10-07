<!-- src/lib/components/CesiumViewport.svelte -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import 'cesium/Build/Cesium/Widgets/widgets.css';

	import type { Viewer, GeoJsonDataSource, ScreenSpaceEventHandler } from 'cesium';
	type CesiumModule = typeof import('cesium');

	import { telemetryStore } from '$lib/stores/telemetry-client.svelte';
	import { applyBasemap } from '$lib/cesium/layers';
	import { resetCamera, toggleViewMode } from '$lib/cesium/navigation';
	import { syncSensorEntities } from '$lib/cesium/syncSensors';

	import NavigationHUD from './NavigationHUD.svelte';
	import ViewportDebugger from './ViewportDebugger.svelte';
	import HoverTooltip from './HoverTooltip.svelte';

	let container: HTMLDivElement;
	let viewer: Viewer | undefined = $state(undefined);
	let CesiumModule: CesiumModule | undefined = $state(undefined);

	let geojsonDataSource: GeoJsonDataSource | null = $state(null);
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
	let showSensorValues = $state(true);

	// Sync telemetry store to Cesium entities
	$effect(() => {
		if (!viewer || !CesiumModule) {
			return;
		}

		syncSensorEntities(
			viewer,
			CesiumModule,
			telemetryStore.sensors,
			showSensorLabels,
			showSensorValues
		);
	});

	function handleSwitchBasemap(type: 'satellite' | 'streets') {
		currentBasemap = type;

		if (!viewer || !CesiumModule) {
			return;
		}

		applyBasemap(viewer, CesiumModule, type);
	}

	function handleToggleViewMode(targetMode: '2D' | '3D') {
		viewMode = targetMode;

		if (!viewer || !CesiumModule) {
			return;
		}

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
	}

	function toggleSensorValues() {
		showSensorValues = !showSensorValues;
	}

	function handleResetCamera() {
		handleToggleViewMode('2D');

		if (!viewer || !CesiumModule) {
			return;
		}

		resetCamera(viewer, CesiumModule);
	}

	onMount(() => {
		let isMounted = true;

		(async () => {
			try {
				const canvasTest = document.createElement('canvas');
				const gl = canvasTest.getContext('webgl2') || canvasTest.getContext('webgl');

				if (!gl) {
					webGlSupported = false;
					statusMsg = 'WebGL context unavailable on this device.';
					return;
				}

				statusMsg = 'Setting asset base route...';
				window.CESIUM_BASE_URL = '/cesium/';

				statusMsg = 'Importing Cesium bundle...';
				const Cesium = await import('cesium');
				CesiumModule = Cesium;

				await tick();

				if (!container) {
					errorLog = 'Viewport container missing from DOM.';
					return;
				}

				statusMsg = 'Initializing 3D Globe Viewer...';
				console.log('[Cesium] container before Viewer', {
					clientWidth: container.clientWidth,
					clientHeight: container.clientHeight,
					rect: container.getBoundingClientRect()
				});
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
				const currentViewer = viewer;
				console.log('[Cesium] container after Viewer', {
					clientWidth: container.clientWidth,
					clientHeight: container.clientHeight,
					canvas: {
						width: currentViewer.scene.canvas.width,
						height: currentViewer.scene.canvas.height
					}
				});
				currentViewer.scene.globe.enableLighting = false;
				currentViewer.scene.globe.depthTestAgainstTerrain = false;

				currentViewer.scene.screenSpaceCameraController.enableRotate = true;
				currentViewer.scene.screenSpaceCameraController.enableTranslate = true;
				currentViewer.scene.screenSpaceCameraController.enableZoom = true;
				currentViewer.scene.screenSpaceCameraController.enableTilt = true;
				currentViewer.scene.screenSpaceCameraController.enableLook = true;

				applyBasemap(currentViewer, CesiumModule, currentBasemap);

				statusMsg = 'Loading GeoJSON layer...';
				const geojson = await Cesium.GeoJsonDataSource.load('/geojson/plant.geojson', {
					stroke: Cesium.Color.GREEN,
					fill: Cesium.Color.BLUE.withAlpha(0.15),
					strokeWidth: 3
				});

				geojsonDataSource = geojson;
				await currentViewer.dataSources.add(geojson);
				geojson.show = showGeoJson;

				if (!isMounted) return;

				console.log('[Cesium] container before resize', {
					clientWidth: container.clientWidth,
					clientHeight: container.clientHeight,
					rect: container.getBoundingClientRect()
				});

				currentViewer.resize();

				console.log('[Cesium] canvas after resize', {
					width: currentViewer.scene.canvas.width,
					height: currentViewer.scene.canvas.height
				});
				resetCamera(currentViewer, CesiumModule);

				// Mouse move listener for entity hover and camera position telemetry
				const handler = new Cesium.ScreenSpaceEventHandler(currentViewer.scene.canvas);

				handler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
					if (showHoverInfo) {
						const pickedObject = currentViewer.scene.pick(movement.endPosition);

						if (Cesium.defined(pickedObject) && pickedObject.id) {
							const sensor = pickedObject.id.properties?.sensorData?.getValue();
							hoverInfo = {
								name: pickedObject.id.name || pickedObject.id.id,
								value: sensor ? `${sensor.value} ${sensor.unit}` : 'Entity Selected',
								x: movement.endPosition.x,
								y: movement.endPosition.y
							};
						} else {
							hoverInfo = null;
						}
					} else {
						hoverInfo = null;
					}

					const cartesian = currentViewer.camera.position;
					const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
					cameraPos = {
						lon: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)),
						lat: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)),
						alt: Math.round(cartographic.height)
					};
				}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

				// Camera position listener on view changes
				currentViewer.camera.changed.addEventListener(() => {
					const cartesian = currentViewer.camera.position;
					const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
					cameraPos = {
						lon: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)),
						lat: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)),
						alt: Math.round(cartographic.height)
					};
				});

				statusMsg = '3D Scene Operational';
			} catch (err: unknown) {
				console.error('Cesium execution error:', err);
				if (err instanceof Error) {
					errorLog = err.stack || err.message;
				} else {
					errorLog = String(err);
				}
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
		{showSensorValues}
		{showHoverInfo}
		onToggleViewMode={handleToggleViewMode}
		onSwitchBasemap={handleSwitchBasemap}
		onResetCamera={handleResetCamera}
		onZoomIn={zoomIn}
		onZoomOut={zoomOut}
		onToggleGeoJson={toggleGeoJson}
		onToggleSensorLabels={toggleSensorLabels}
		onToggleSensorValues={toggleSensorValues}
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
		<ViewportDebugger {webGlSupported} {viewMode} {statusMsg} {cameraPos} {errorLog} />
	{/if}
</div>

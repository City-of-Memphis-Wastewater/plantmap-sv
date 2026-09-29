<script lang="ts">
	import { onMount, tick } from 'svelte';
	import 'cesium/Build/Cesium/Widgets/widgets.css';

	import { telemetryStore } from '$lib/stores/telemetry.svelte';
	import { applyBasemap } from '$lib/cesium/layers';
	import { resetCamera, toggleViewMode } from '$lib/cesium/navigation';

	import NavigationHUD from './NavigationHUD.svelte';
	import ViewportDebugger from './ViewportDebugger.svelte';

	let container: HTMLDivElement;
	let viewer: any = $state(undefined);
	let CesiumModule: any = $state(undefined);

	let geojsonDataSource: any = $state(null);
	let showGeoJson = $state(true);

	let statusMsg = $state('Initializing WebGL context...');
	let webGlSupported = $state(true);
	let errorLog = $state<string | null>(null);

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

	$effect(() => {
		if (!viewer || !CesiumModule) return;

		Object.values(telemetryStore.sensors).forEach((sensor) => {
			const entityId = `sensor-${sensor.id}`;

			let entity = viewer.entities.getById(entityId);

			const pos = CesiumModule.Cartesian3.fromDegrees(
				sensor.lon,
				sensor.lat,
				sensor.altitude ?? 15
			);

			if (!entity) {
				entity = viewer.entities.add({
					id: entityId,
					name: sensor.name,
					properties: {
						sensorData: sensor
					},
					position: pos,

					point: {
						pixelSize: 18,
						color:
							sensor.status === 'alarm'
								? CesiumModule.Color.RED
								: CesiumModule.Color.LIME,
						outlineColor: CesiumModule.Color.BLACK,
						outlineWidth: 2
					},

					label: {
						text: `${sensor.name}\n${sensor.value} ${sensor.unit}`,
						font: '13px monospace',
						style: CesiumModule.LabelStyle.FILL_AND_OUTLINE,
						outlineWidth: 3,
						verticalOrigin:
							CesiumModule.VerticalOrigin.BOTTOM,
						pixelOffset: new CesiumModule.Cartesian2(0, -22),
						show: showSensorLabels
					}
				});
			} else {
				if (entity.label) {
					entity.label.text = `${sensor.name}\n${sensor.value} ${sensor.unit}` as any;
					entity.point.color = (sensor.status === 'alarm' ? CesiumModule.Color.RED : CesiumModule.Color.LIME) as any;
					entity.label.show = showSensorLabels;
					
				}

				if (entity.point) {
					entity.point.color =
						sensor.status === 'alarm'
							? CesiumModule.Color.RED
							: CesiumModule.Color.LIME;
				}
			}
		});
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

				applyBasemap(
					viewer,
					CesiumModule,
					currentBasemap
				);

                const geojson = await Cesium.GeoJsonDataSource.load('/geojson/plant.geojson', {
                	stroke: Cesium.Color.GREEN,
                	fill: Cesium.Color.BLUE.withAlpha(0.15),
                	strokeWidth: 3
                });

                geojsonDataSource = geojson;
                await viewer.dataSources.add(geojson);
                geojson.show = showGeoJson;

				statusMsg = 'Loading GeoJSON layer...';

				if (!isMounted) return;

				viewer.resize();

				resetCamera(viewer, CesiumModule);

				const handler =
					new Cesium.ScreenSpaceEventHandler(
						viewer.scene.canvas
					);

				handler.setInputAction(
					(movement: any) => {
						if (showHoverInfo) {
							const pickedObject = viewer.scene.pick(
								movement.endPosition
							);

							if (
								Cesium.defined(pickedObject) &&
								pickedObject.id
							) {
								const sensor =
									pickedObject.id.properties?.sensorData?.getValue();

								hoverInfo = {
									name:
										pickedObject.id.name ||
										pickedObject.id.id,
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

						const cartographic =
							Cesium.Cartographic.fromCartesian(cartesian);

						cameraPos = {
							lon: Number(
								Cesium.Math.toDegrees(
									cartographic.longitude
								).toFixed(4)
							),
							lat: Number(
								Cesium.Math.toDegrees(
									cartographic.latitude
								).toFixed(4)
							),
							alt: Math.round(cartographic.height)
						};
					},
					Cesium.ScreenSpaceEventType.MOUSE_MOVE);

				// Camera Position Telemetry Listener
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

				errorLog =
					err?.stack ||
					err?.message ||
					String(err);
			}
		})();

		return () => {
			isMounted = false;
			viewer?.destroy();
		};
	});
</script>

<div class="relative h-screen w-screen overflow-hidden bg-slate-950">
	<!-- Cesium viewport -->
	<div
		class="absolute inset-0 h-full w-full"
		bind:this={container}
	></div>

	<!-- Navigation / Map Controls -->
	<NavigationHUD
		bind:showNavigation
		bind:showDebugger
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

	<!-- Hover Sensor Readout -->
	{#if showHoverInfo && hoverInfo}
		<div
			class="pointer-events-none absolute z-40 rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md"
			style={`left: ${hoverInfo.x + 12}px; top: ${hoverInfo.y + 12}px;`}
		>
			<div class="font-bold text-emerald-400">
				{hoverInfo.name}
			</div>

			<div class="text-slate-300">
				{hoverInfo.value}
			</div>
		</div>
	{/if}

	<!-- Debugger -->
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

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import 'cesium/Build/Cesium/Widgets/widgets.css';

	import { telemetryStore } from '$lib/stores/telemetry.svelte';
	import { applyBasemap } from '$lib/cesium/layers';
	import { resetCamera, toggleViewMode } from '$lib/cesium/navigation';

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

	//const SITE_LON = -90.155655;
	//const SITE_LAT = 35.071202;

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
					entity.label.text =
						`${sensor.name}\n${sensor.value} ${sensor.unit}`;
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
                	stroke: Cesium.Color.YELLOW,
                	fill: Cesium.Color.YELLOW.withAlpha(0.15),
                	strokeWidth: 3
                });

                geojsonDataSource = geojson;
                viewer.dataSources.add(geojson);
                geojson.show = showGeoJson;

				statusMsg = 'Loading GeoJSON layer...';

				const loadedDs =
					await CesiumModule.GeoJsonDataSource.load(
						'/geojson/plant.geojson',
						{
							stroke: CesiumModule.Color.YELLOW,
							fill: CesiumModule.Color.YELLOW.withAlpha(0.3),
							strokeWidth: 3
						}
					);

				if (!isMounted) return;

				await viewer.dataSources.add(loadedDs);

				geojsonDataSource = loadedDs;

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
					Cesium.ScreenSpaceEventType.MOUSE_MOVE
				);

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
	<div class="absolute bottom-6 right-6 z-30">
		<div
			class="rounded-lg border border-slate-700 bg-slate-900/90 p-1 shadow-xl backdrop-blur-sm"
		>
			<!-- Navigation Header -->
			<div class="flex items-center justify-between gap-4 px-2 py-1">
				<span
					class="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400"
				>
					Navigation
				</span>

				<button
					type="button"
					onclick={() => (showNavigation = !showNavigation)}
					title={
						showNavigation
							? 'Collapse navigation'
							: 'Expand navigation'
					}
					class="rounded border border-slate-700 px-2 py-1 font-mono text-xs text-slate-300 hover:bg-slate-800"
				>
					{showNavigation ? '−' : '+'}
				</button>
			</div>

			{#if showNavigation}
				<div class="flex flex-col gap-2 pt-2">
					<!-- View Mode -->
					<div
						class="flex rounded-lg border border-slate-700 bg-slate-900/90 p-1"
					>
						<button
							type="button"
							onclick={() => handleToggleViewMode('2D')}
							class="rounded px-3 py-2 font-mono text-xs text-white hover:bg-slate-800"
						>
							2D Top-Down
						</button>

						<button
							type="button"
							onclick={() => handleToggleViewMode('3D')}
							class="rounded px-3 py-2 font-mono text-xs text-white hover:bg-slate-800"
						>
							3D Perspective
						</button>
					</div>

					<!-- Basemap -->
					<div
						class="flex rounded-lg border border-slate-700 bg-slate-900/90 p-1"
					>
						<button
							type="button"
							onclick={() =>
								handleSwitchBasemap('satellite')
							}
							class="rounded px-3 py-2 font-mono text-xs text-white hover:bg-slate-800"
						>
							Satellite
						</button>

						<button
							type="button"
							onclick={() =>
								handleSwitchBasemap('streets')
							}
							class="rounded px-3 py-2 font-mono text-xs text-white hover:bg-slate-800"
						>
							Streets
						</button>
					</div>

					<!-- Camera -->
					<button
						type="button"
						onclick={handleResetCamera}
						class="rounded-lg border border-slate-700 bg-slate-900/90 p-2 font-mono text-xs text-white hover:bg-slate-800"
					>
						Reset View
					</button>

					<div class="flex gap-2">
						<button
							type="button"
							onclick={zoomIn}
							class="flex-1 rounded-lg border border-slate-700 bg-slate-900/90 p-2 font-mono text-lg text-white hover:bg-slate-800"
						>
							+
						</button>

						<button
							type="button"
							onclick={zoomOut}
							class="flex-1 rounded-lg border border-slate-700 bg-slate-900/90 p-2 font-mono text-lg text-white hover:bg-slate-800"
						>
							−
						</button>
					</div>

					<!-- Display Controls -->
					<div class="border-t border-slate-800 pt-2">
						<div
							class="mb-1 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500"
						>
							Display
						</div>

						<button
							type="button"
							onclick={toggleGeoJson}
							disabled={!geojsonDataSource}
							class="w-full rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-left font-mono text-xs text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{showGeoJson
								? 'Hide Plant Boundary'
								: 'Show Plant Boundary'}
						</button>

						<button
							type="button"
							onclick={toggleSensorLabels}
							class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-left font-mono text-xs text-white hover:bg-slate-800"
						>
							{showSensorLabels
								? 'Hide Sensor Labels'
								: 'Show Sensor Labels'}
						</button>

						<button
							type="button"
							onclick={() => {
								showHoverInfo = !showHoverInfo;

								if (!showHoverInfo) {
									hoverInfo = null;
								}
							}}
							class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-left font-mono text-xs text-white hover:bg-slate-800"
						>
							{showHoverInfo
								? 'Hide Sensor Readouts'
								: 'Show Sensor Readouts'}
						</button>
					</div>

					<!-- Diagnostics -->
					<div class="border-t border-slate-800 pt-2">
						<div
							class="mb-1 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500"
						>
							Diagnostics
						</div>

						<button
							type="button"
							onclick={() =>
								(showDebugger = !showDebugger)
							}
							class="w-full rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-left font-mono text-xs text-white hover:bg-slate-800"
						>
							{showDebugger
								? 'Hide Debugger'
								: 'Show Debugger'}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

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
		<div
			class="pointer-events-none absolute top-4 right-4 z-30 flex max-w-md flex-col gap-2"
		>
			<div
				class="pointer-events-auto rounded-lg border border-slate-800 bg-slate-900/90 p-3 font-mono text-xs text-slate-300 shadow-2xl backdrop-blur-md"
			>
				<div
					class="mb-1 flex items-center justify-between border-b border-slate-800 pb-1"
				>
					<span class="font-bold uppercase text-slate-400">
						3D Viewport Debugger
					</span>

					<div class="flex items-center gap-2">
						<span
							class={
								webGlSupported
									? 'text-emerald-400'
									: 'text-rose-400'
							}
						>
							{webGlSupported
								? 'WebGL OK'
								: 'WebGL FAIL'}
						</span>
					</div>
				</div>

				<div class="py-1">
					<span class="text-slate-500">Mode:</span>
					<span class="text-emerald-300">{viewMode}</span>

					<span class="ml-2 text-slate-500">
						Status:
					</span>

					<span class="text-amber-300">
						{statusMsg}
					</span>
				</div>

				<div
					class="mt-1 border-t border-slate-800/80 pt-1 text-[11px] text-slate-400"
				>
					Cam: {cameraPos.lat}°N,
					{cameraPos.lon}°W |
					Alt: {cameraPos.alt}m
				</div>

				{#if errorLog}
					<div
						class="mt-2 overflow-x-auto rounded border border-rose-900/50 bg-rose-950/30 p-2"
					>
						<div class="font-bold text-rose-400">
							Initialization Exception:
						</div>

						<pre
							class="mt-1 whitespace-pre-wrap text-[10px] text-rose-300"
						>{errorLog}</pre>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

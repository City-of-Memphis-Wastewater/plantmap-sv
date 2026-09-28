<script lang="ts">
	import { onMount, tick } from 'svelte';
	import 'cesium/Build/Cesium/Widgets/widgets.css';
	import { telemetryStore } from '$lib/stores/telemetry.svelte';
	import { applyBasemap, loadKmlOverlay } from '$lib/cesium/layers';
	//import { toggleViewMode } from '$lib/cesium/navigation';
    import { resetCamera, toggleViewMode } from '$lib/cesium/navigation';
    
	let container: HTMLDivElement;
	let viewer: any = $state(undefined);
	let CesiumModule: any = $state(undefined);

	let statusMsg = $state('Initializing WebGL context...');
	let webGlSupported = $state(true);
	let errorLog = $state<string | null>(null);

	// Tooltip hover state & basemap toggle
	let hoverInfo = $state<{ name: string; value: string; x: number; y: number } | null>(null);
	let cameraPos = $state({ lat: 0, lon: 0, alt: 0 });
	let currentBasemap = $state<'satellite' | 'streets'>('satellite');
    let viewMode = $state<'2D' | '3D'>('2D');
    
    const SITE_LON = -90.155655;
	const SITE_LAT = 35.071202;
    
	// Telemetry updates
	$effect(() => {
		if (!viewer || !CesiumModule) return;

		Object.values(telemetryStore.sensors).forEach((sensor) => {
			const entityId = `sensor-${sensor.id}`;
			let entity = viewer.entities.getById(entityId);
			const pos = CesiumModule.Cartesian3.fromDegrees(sensor.lon, sensor.lat, sensor.altitude ?? 15);

			if (!entity) {
				viewer.entities.add({
					id: entityId,
					name: sensor.name,
					properties: {
						sensorData: sensor
					},
					position: pos,
					point: {
						pixelSize: 18,
						color: sensor.status === 'alarm' ? CesiumModule.Color.RED : CesiumModule.Color.LIME,
						outlineColor: CesiumModule.Color.BLACK,
						outlineWidth: 2
					},
					label: {
						text: `${sensor.name}\n${sensor.value} ${sensor.unit}`,
						font: '13px monospace',
						style: CesiumModule.LabelStyle.FILL_AND_OUTLINE,
						outlineWidth: 3,
						verticalOrigin: CesiumModule.VerticalOrigin.BOTTOM,
						pixelOffset: new CesiumModule.Cartesian2(0, -22)
					}
				});
			} else if (entity.label) {
				//entity.label.text = new CesiumModule.ConstantProperty(`${sensor.name}\n${sensor.value} ${sensor.unit}`);
				entity.label.text = `${sensor.name}\n${sensor.value} ${sensor.unit}`;
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

	onMount(async () => {
		try {
		    // Fetch initial sensor locations/metadata
    		await telemetryStore.init();

    		// Optional: Connect live telemetry WebSocket feed after store is populated
    		// initTelemetryWebSocket();
			const canvasTest = document.createElement('canvas');
			const gl = canvasTest.getContext('webgl2') || canvasTest.getContext('webgl');
			if (!gl) {
				webGlSupported = false;
				statusMsg = 'WebGL context unhandled by hardware driver.';
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

			// Apply initial basemap
			applyBasemap(viewer, CesiumModule, currentBasemap);

			// Asynchronously load KML layer overlay once during initialization
			await loadKmlOverlay(viewer, CesiumModule, '/kml/maxson.kml');

			viewer.resize();
			resetCamera(viewer, CesiumModule);
            
			// Entity Inspection & Hover Tooltip handler
			const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
			handler.setInputAction((movement: any) => {
				const pickedObject = viewer.scene.pick(movement.endPosition);
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

				const cartesian = viewer.camera.position;
				const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
				cameraPos = {
					lon: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)),
					lat: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)),
					alt: Math.round(cartographic.height)
				};
			}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

			statusMsg = '3D Scene Operational';
		} catch (err: any) {
			console.error('Cesium execution error:', err);
			errorLog = err?.stack || err?.message || String(err);
		}

		return () => {
			viewer?.destroy();
		};
	});
	function handleResetCamera() {
		resetCamera(viewer, CesiumModule);
	}

</script>

<div class="relative h-screen w-screen overflow-hidden bg-slate-950">
	<!-- Canvas Container -->
	<div class="absolute inset-0 h-full w-full" bind:this={container}></div>

	<!-- Interactive Map Controls & Layer Switcher (Bottom Right) -->
	<div class="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
        <!-- 2D / 3D Mode Switcher -->
		<div class="flex rounded-lg border border-slate-700 bg-slate-900/90 p-1 shadow-xl">
			<button
				onclick={() => handleToggleViewMode('2D')}
				class="flex-1 rounded px-3 py-1 font-mono text-xs transition-colors {viewMode === '2D' ? 'bg-emerald-600 font-bold text-white' : 'text-slate-400 hover:text-white'}"
			>
				2D Top-Down
			</button>
			<button
				onclick={() => handleToggleViewMode('3D')}
				class="flex-1 rounded px-3 py-1 font-mono text-xs transition-colors {viewMode === '3D' ? 'bg-emerald-600 font-bold text-white' : 'text-slate-400 hover:text-white'}"
			>
				3D Perspective
			</button>
		</div>
		
		<!-- Basemap Switcher -->
		<div class="flex rounded-lg border border-slate-700 bg-slate-900/90 p-1 shadow-xl">
			<button
				onclick={() => handleSwitchBasemap('satellite')}
				class="rounded px-2.5 py-1 font-mono text-xs transition-colors {currentBasemap === 'satellite' ? 'bg-emerald-600 font-bold text-white' : 'text-slate-400 hover:text-white'}"
			>
				Satellite
			</button>
			<button
				onclick={() => handleSwitchBasemap('streets')}
				class="rounded px-2.5 py-1 font-mono text-xs transition-colors {currentBasemap === 'streets' ? 'bg-emerald-600 font-bold text-white' : 'text-slate-400 hover:text-white'}"
			>
				Streets
			</button>
		</div>

		<button
			onclick={handleResetCamera}
			class="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-xs font-semibold text-slate-200 shadow-xl transition-all hover:bg-slate-800 hover:text-white"
		>
			Reset View
		</button>
		<div class="flex gap-2">
			<button
				onclick={zoomIn}
				class="flex-1 rounded-lg border border-slate-700 bg-slate-900/90 py-2 font-mono text-sm font-bold text-slate-200 shadow-xl hover:bg-slate-800 hover:text-white"
			>
				+
			</button>
			<button
				onclick={zoomOut}
				class="flex-1 rounded-lg border border-slate-700 bg-slate-900/90 py-2 font-mono text-sm font-bold text-slate-200 shadow-xl hover:bg-slate-800 hover:text-white"
			>
				-
			</button>
		</div>
	</div>

	<!-- Hover Element Inspection Tooltip -->
	{#if hoverInfo}
		<div
			class="pointer-events-none absolute z-40 rounded-md border border-slate-600 bg-slate-900/95 px-3 py-1.5 font-mono text-xs shadow-2xl backdrop-blur-md"
			style="left: {hoverInfo.x + 14}px; top: {hoverInfo.y + 14}px;"
		>
			<div class="font-bold text-emerald-400">{hoverInfo.name}</div>
			<div class="text-slate-300">{hoverInfo.value}</div>
		</div>
	{/if}

	<!-- Debug HUD (Top Right) -->
	<div class="pointer-events-none absolute top-4 right-4 z-30 flex max-w-md flex-col gap-2">
		<div class="pointer-events-auto rounded-lg border border-slate-800 bg-slate-900/90 p-3 font-mono text-xs text-slate-300 shadow-2xl backdrop-blur-md">
			<div class="mb-1 flex items-center justify-between border-b border-slate-800 pb-1">
				<span class="font-bold uppercase text-slate-400">3D Viewport Debugger</span>
				<span class={webGlSupported ? 'text-emerald-400' : 'text-rose-400'}>
					{webGlSupported ? 'WebGL OK' : 'WebGL FAIL'}
				</span>
			</div>

			<div class="py-1">
			    <span class="text-slate-500">Mode:</span>
				<span class="text-emerald-300">{viewMode}</span>
				<span class="text-slate-500">Status:</span>
				<span class="text-amber-300">{statusMsg}</span>
			</div>

			<div class="mt-1 border-t border-slate-800/80 pt-1 text-[11px] text-slate-400">
				Cam: {cameraPos.lat}°N, {cameraPos.lon}°W | Alt: {cameraPos.alt}m
			</div>

			{#if errorLog}
				<div class="mt-2 overflow-x-auto rounded border border-rose-800/50 bg-rose-950/80 p-2 font-mono text-[11px] text-rose-200">
					<div class="font-bold text-rose-400">Initialization Exception:</div>
					<pre class="mt-1 whitespace-pre-wrap">{errorLog}</pre>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(.cesium-viewer),
	:global(.cesium-viewer-scrollable),
	:global(.cesium-widget),
	:global(.cesium-widget canvas) {
		width: 100% !important;
		height: 100% !important;
		position: absolute !important;
		top: 0 !important;
		left: 0 !important;
		touch-action: none;
	}

	:global(.cesium-viewer-bottom) {
		display: none !important;
	}
</style>

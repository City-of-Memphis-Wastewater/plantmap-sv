<!-- src/lib/components/NavigationHUD.svelte -->
<script lang="ts">
	let {
		showNavigation = $bindable(true),
		geojsonLoaded = false,
		showGeoJson = false,
		showSensorLabels = false,
		showHoverInfo = false,
		showDebugger = $bindable(false),
		viewMode = '2D',
		currentBasemap = 'satellite',
		onToggleViewMode = () => {},
		onSwitchBasemap = () => {},
		onResetCamera = () => {},
		onZoomIn = () => {},
		onZoomOut = () => {},
		onToggleGeoJson = () => {},
		onToggleSensorLabels = () => {},
		onToggleHoverInfo = () => {}
	}: {
		showNavigation?: boolean;
		geojsonLoaded?: boolean;
		showGeoJson?: boolean;
		showSensorLabels?: boolean;
		showHoverInfo?: boolean;
		showDebugger?: boolean;
		viewMode?: '2D' | '3D';
		currentBasemap?: 'satellite' | 'streets';
		onToggleViewMode?: (mode: '2D' | '3D') => void;
		onSwitchBasemap?: (map: 'satellite' | 'streets') => void;
		onResetCamera?: () => void;
		onZoomIn?: () => void;
		onZoomOut?: () => void;
		onToggleGeoJson?: () => void;
		onToggleSensorLabels?: () => void;
		onToggleHoverInfo?: () => void;
	} = $props();
</script>
<div class="fixed bottom-[20vh] right-3 z-30 max-w-[220px]">
<!--div class="fixed top-1/2 right-3 z-30 -translate-y-1/2 max-w-[220px]"-->
	<div class="rounded-lg border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md">
		<!-- Header -->
		<div class="flex items-center justify-between gap-2 px-1 pb-1">
			<span class="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
				Nav Controls
			</span>
			<button
				type="button"
				onclick={() => (showNavigation = !showNavigation)}
				title={showNavigation ? 'Collapse HUD' : 'Expand HUD'}
				class="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
			>
				{showNavigation ? '−' : '+'}
			</button>
		</div>

		{#if showNavigation}
			<div class="flex flex-col gap-1.5 pt-1 text-slate-200">
				<!-- View Mode Segmented Switch -->
				<div class="grid grid-cols-2 rounded-md border border-slate-700/70 bg-slate-950/60 p-0.5">
					<button
						type="button"
						onclick={() => onToggleViewMode('2D')}
						class="rounded py-1 font-mono text-[11px] font-medium transition-colors {viewMode === '2D' ? 'bg-sky-600/80 text-white' : 'text-slate-400 hover:text-slate-200'}"
					>
						2D
					</button>
					<button
						type="button"
						onclick={() => onToggleViewMode('3D')}
						class="rounded py-1 font-mono text-[11px] font-medium transition-colors {viewMode === '3D' ? 'bg-sky-600/80 text-white' : 'text-slate-400 hover:text-slate-200'}"
					>
						3D
					</button>
				</div>

				<!-- Basemap Segmented Switch -->
				<div class="grid grid-cols-2 rounded-md border border-slate-700/70 bg-slate-950/60 p-0.5">
					<button
						type="button"
						onclick={() => onSwitchBasemap('satellite')}
						class="rounded py-1 font-mono text-[11px] font-medium transition-colors {currentBasemap === 'satellite' ? 'bg-sky-600/80 text-white' : 'text-slate-400 hover:text-slate-200'}"
					>
						Satellite
					</button>
					<button
						type="button"
						onclick={() => onSwitchBasemap('streets')}
						class="rounded py-1 font-mono text-[11px] font-medium transition-colors {currentBasemap === 'streets' ? 'bg-sky-600/80 text-white' : 'text-slate-400 hover:text-slate-200'}"
					>
						Streets
					</button>
				</div>

				<!-- Compact Camera Bar (+ / Reset / -) -->
				<div class="grid grid-cols-3 gap-1">
					<button
						type="button"
						onclick={onZoomIn}
						title="Zoom In"
						class="rounded border border-slate-700/80 bg-slate-800/80 py-1 font-mono text-sm font-semibold hover:bg-slate-700 text-slate-100"
					>
						+
					</button>
					<button
						type="button"
						onclick={onResetCamera}
						title="Reset Camera View"
						class="rounded border border-slate-700/80 bg-slate-800/80 py-1 font-mono text-[10px] uppercase font-semibold hover:bg-slate-700 text-slate-100"
					>
						Reset
					</button>
					<button
						type="button"
						onclick={onZoomOut}
						title="Zoom Out"
						class="rounded border border-slate-700/80 bg-slate-800/80 py-1 font-mono text-sm font-semibold hover:bg-slate-700 text-slate-100"
					>
						−
					</button>
				</div>

				<!-- Display Layer Toggles -->
				<div class="border-t border-slate-800/80 pt-1.5 flex flex-col gap-1">
					<div class="px-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
						Layers
					</div>

					<button
						type="button"
						onclick={onToggleGeoJson}
						disabled={!geojsonLoaded}
						class="flex items-center justify-between rounded border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-left font-mono text-[11px] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<span>Plant GeoJSON</span>
						<span class="text-[10px] font-bold {showGeoJson ? 'text-emerald-400' : 'text-slate-500'}">
							{showGeoJson ? 'ON' : 'OFF'}
						</span>
					</button>

					<button
						type="button"
						onclick={onToggleSensorLabels}
						class="flex items-center justify-between rounded border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-left font-mono text-[11px] hover:bg-slate-800"
					>
						<span>Sensor Labels</span>
						<span class="text-[10px] font-bold {showSensorLabels ? 'text-emerald-400' : 'text-slate-500'}">
							{showSensorLabels ? 'ON' : 'OFF'}
						</span>
					</button>

					<button
						type="button"
						onclick={onToggleHoverInfo}
						class="flex items-center justify-between rounded border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-left font-mono text-[11px] hover:bg-slate-800"
					>
						<span>Sensor Values</span>
						<span class="text-[10px] font-bold {showSensorValues ? 'text-emerald-400' : 'text-slate-500'}">
							{showSensorValues ? 'ON' : 'OFF'}
						</span>
					</button>
				</div>

				<!-- Diagnostics Toggle -->
				<div class="border-t border-slate-800/80 pt-1.5">
					<button
						type="button"
						onclick={() => (showDebugger = !showDebugger)}
						class="flex w-full items-center justify-between rounded border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-left font-mono text-[11px] hover:bg-slate-800"
					>
						<span class="text-slate-300">Debugger</span>
						<span class="text-[10px] font-bold {showDebugger ? 'text-amber-400' : 'text-slate-500'}">
							{showDebugger ? 'ON' : 'OFF'}
						</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<script lang="ts">
	let {
		showNavigation = $bindable(true),
		geojsonLoaded = false,
		showGeoJson = false,
		showSensorLabels = false,
		showHoverInfo = false,
		showDebugger = $bindable(false),
		onToggleViewMode,
		onSwitchBasemap,
		onResetCamera,
		onZoomIn,
		onZoomOut,
		onToggleGeoJson,
		onToggleSensorLabels,
		onToggleHoverInfo
	}: {
		showNavigation?: boolean;
		geojsonLoaded?: boolean;
		showGeoJson?: boolean;
		showSensorLabels?: boolean;
		showHoverInfo?: boolean;
		showDebugger?: boolean;
		onToggleViewMode: (mode: '2D' | '3D') => void;
		onSwitchBasemap: (map: 'satellite' | 'streets') => void;
		onResetCamera: () => void;
		onZoomIn: () => void;
		onZoomOut: () => void;
		onToggleGeoJson: () => void;
		onToggleSensorLabels: () => void;
		onToggleHoverInfo: () => void;
	} = $props();
</script>

<div class="fixed top-1/2 right-3 z-30 -translate-y-1/2">
	<div class="rounded-lg border border-slate-700/80 bg-slate-900/95 p-1 shadow-xl backdrop-blur-sm">
		<div class="flex items-center justify-between gap-2 px-1.5 py-0.5">
			<span class="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
				Navigation
			</span>
			<button
				type="button"
				onclick={() => (showNavigation = !showNavigation)}
				title={showNavigation ? 'Collapse navigation' : 'Expand navigation'}
				class="rounded border border-slate-700/80 px-1.5 py-0.5 font-mono text-xs text-slate-300 hover:bg-slate-800"
			>
				{showNavigation ? '−' : '+'}
			</button>
		</div>

		{#if showNavigation}
			<div class="flex flex-col gap-2 pt-2">
				<div class="flex rounded-lg border border-slate-700 bg-slate-900/90 p-1">
					<button
						type="button"
						onclick={() => onToggleViewMode('2D')}
						class="rounded px-3 py-2 font-mono text-xs text-white hover:bg-slate-800"
					>
						2D Top-Down
					</button>
					<button
						type="button"
						onclick={() => onToggleViewMode('3D')}
						class="rounded px-3 py-2 font-mono text-xs text-white hover:bg-slate-800"
					>
						3D Perspective
					</button>
				</div>

				<div class="flex rounded-lg border border-slate-700 bg-slate-900/90 p-1">
					<button
						type="button"
						onclick={() => onSwitchBasemap('satellite')}
						class="rounded px-3 py-2 font-mono text-xs text-white hover:bg-slate-800"
					>
						Satellite
					</button>
					<button
						type="button"
						onclick={() => onSwitchBasemap('streets')}
						class="rounded px-3 py-2 font-mono text-xs text-white hover:bg-slate-800"
					>
						Streets
					</button>
				</div>

				<button
					type="button"
					onclick={onResetCamera}
					class="rounded-lg border border-slate-700 bg-slate-900/90 p-2 font-mono text-xs text-white hover:bg-slate-800"
				>
					Reset View
				</button>

				<div class="flex gap-2">
					<button
						type="button"
						onclick={onZoomIn}
						class="flex-1 rounded-lg border border-slate-700 bg-slate-900/90 p-2 font-mono text-lg text-white hover:bg-slate-800"
					>
						+
					</button>
					<button
						type="button"
						onclick={onZoomOut}
						class="flex-1 rounded-lg border border-slate-700 bg-slate-900/90 p-2 font-mono text-lg text-white hover:bg-slate-800"
					>
						−
					</button>
				</div>

				<div class="border-t border-slate-800 pt-2">
					<div class="mb-1 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
						Display
					</div>
					<button
						type="button"
						onclick={onToggleGeoJson}
						disabled={!geojsonLoaded}
						class="w-full rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-left font-mono text-xs text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{showGeoJson ? 'Hide Plant GeoJSON' : 'Show Plant GeoJSON'}
					</button>

					<button
						type="button"
						onclick={onToggleSensorLabels}
						class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-left font-mono text-xs text-white hover:bg-slate-800"
					>
						{showSensorLabels ? 'Hide Sensor Labels' : 'Show Sensor Labels'}
					</button>

					<button
						type="button"
						onclick={onToggleHoverInfo}
						class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-left font-mono text-xs text-white hover:bg-slate-800"
					>
						{showHoverInfo ? 'Hide Sensor Readouts' : 'Show Sensor Readouts'}
					</button>
				</div>

				<div class="border-t border-slate-800 pt-2">
					<div class="mb-1 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
						Diagnostics
					</div>
					<button
						type="button"
						onclick={() => (showDebugger = !showDebugger)}
						class="w-full rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-left font-mono text-xs text-white hover:bg-slate-800"
					>
						{showDebugger ? 'Hide Debugger' : 'Show Debugger'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

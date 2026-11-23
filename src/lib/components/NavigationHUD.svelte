<!-- src/lib/components/NavigationHUD.svelte -->
<script lang="ts">
        import { onDestroy } from 'svelte';

        type PanDirection = 'up' | 'down' | 'left' | 'right';

        let {
                showNavigation = $bindable(true),
                geojsonLoaded = false,
                showGeoJson = false,
                showSensorLabels = false,
                showSensorValues = false,
                showHoverInfo = true,
                showDebugger = $bindable(false),
                viewMode = '2D',
                currentBasemap = 'satellite',
                onToggleViewMode = () => {},
                onSwitchBasemap = () => {},
                onResetCamera = () => {},
                onZoomIn = () => {},
                onZoomOut = () => {},
                onPanCamera = () => {},
                onToggleGeoJson = () => {},
                onToggleSensorLabels = () => {},
                onToggleSensorValues = () => {},
                onToggleHoverInfo = () => {}
        }: {
                showNavigation?: boolean;
                geojsonLoaded?: boolean;
                showGeoJson?: boolean;
                showSensorLabels?: boolean;
                showSensorValues?: boolean;
                showHoverInfo?: boolean;
                showDebugger?: boolean;
                viewMode?: '2D' | '3D';
                currentBasemap?: 'satellite' | 'streets';
                onToggleViewMode?: (mode: '2D' | '3D') => void;
                onSwitchBasemap?: (map: 'satellite' | 'streets') => void;
                onResetCamera?: () => void;
                onZoomIn?: () => void;
                onZoomOut?: () => void;
                onPanCamera?: (direction: PanDirection) => void;
                onToggleGeoJson?: () => void;
                onToggleSensorLabels?: () => void;
                onToggleSensorValues?: () => void;
                onToggleHoverInfo?: () => void;
        } = $props();

        let panInterval: ReturnType<typeof setInterval> | undefined;

        function stopPan() {
                if (panInterval) {
                        clearInterval(panInterval);
                        panInterval = undefined;
                }
        }

        function startPan(direction: PanDirection) {
                stopPan();

                onPanCamera(direction);

                panInterval = setInterval(() => {
                        onPanCamera(direction);
                }, 100);
        }

        onDestroy(stopPan);
</script>

<div class="fixed right-3 bottom-[4vh] z-30 max-w-[220px]">
        <div class="rounded-lg border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md">

                {#if showNavigation}
                        <div class="flex flex-col gap-1.5 pt-1 text-slate-200">

                                <!-- View Mode -->
                                <div class="grid grid-cols-2 rounded-md border border-slate-700/70 bg-slate-950/60 p-0.5">
                                        <button
                                                type="button"
                                                onclick={() => onToggleViewMode('2D')}
                                                class="rounded py-1 font-mono text-[11px] font-medium transition-colors {viewMode === '2D'
                                                        ? 'bg-sky-600/80 text-white'
                                                        : 'text-slate-400 hover:text-slate-200'}"
                                        >
                                                2D
                                        </button>

                                        <button
                                                type="button"
                                                onclick={() => onToggleViewMode('3D')}
                                                class="rounded py-1 font-mono text-[11px] font-medium transition-colors {viewMode === '3D'
                                                        ? 'bg-sky-600/80 text-white'
                                                        : 'text-slate-400 hover:text-slate-200'}"
                                        >
                                                3D
                                        </button>
                                </div>

                                <!-- Basemap -->
                                <div class="grid grid-cols-2 rounded-md border border-slate-700/70 bg-slate-950/60 p-0.5">
                                        <button
                                                type="button"
                                                onclick={() => onSwitchBasemap('satellite')}
                                                class="rounded py-1 font-mono text-[11px] font-medium transition-colors {currentBasemap === 'satellite'
                                                        ? 'bg-sky-600/80 text-white'
                                                        : 'text-slate-400 hover:text-slate-200'}"
                                        >
                                                Satellite
                                        </button>

                                        <button
                                                type="button"
                                                onclick={() => onSwitchBasemap('streets')}
                                                class="rounded py-1 font-mono text-[11px] font-medium transition-colors {currentBasemap === 'streets'
                                                        ? 'bg-sky-600/80 text-white'
                                                        : 'text-slate-400 hover:text-slate-200'}"
                                        >
                                                Streets
                                        </button>
                                </div>

                                <!-- Zoom -->
                                <div class="grid grid-cols-3 gap-1">
                                        <button
                                                type="button"
                                                onclick={onZoomIn}
                                                title="Zoom In"
                                                class="rounded border border-slate-700/80 bg-slate-800/80 py-1 font-mono text-sm font-semibold text-slate-100 hover:bg-slate-700"
                                        >
                                                +
                                        </button>

                                        <button
                                                type="button"
                                                onclick={onResetCamera}
                                                title="Reset Camera View"
                                                class="rounded border border-slate-700/80 bg-slate-800/80 py-1 font-mono text-[10px] font-semibold text-slate-100 uppercase hover:bg-slate-700"
                                        >
                                                Reset
                                        </button>

                                        <button
                                                type="button"
                                                onclick={onZoomOut}
                                                title="Zoom Out"
                                                class="rounded border border-slate-700/80 bg-slate-800/80 py-1 font-mono text-sm font-semibold text-slate-100 hover:bg-slate-700"
                                        >
                                                −
                                        </button>
                                </div>

                                <!-- Directional Pad -->
                                <div class="border-t border-slate-800/80 pt-1.5">
                                        <div class="mb-1 px-1 text-center font-mono text-[9px] tracking-wider text-slate-500 uppercase">
                                                Navigation
                                        </div>

                                        <div class="mx-auto grid w-fit grid-cols-3 grid-rows-3 gap-1">
                                                <!-- Up -->
                                                <div></div>
                                                <button
                                                        type="button"
                                                        aria-label="Pan North"
                                                        title="Pan Up"
                                                        onpointerdown={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.setPointerCapture(e.pointerId);
                                                                startPan('up');
                                                        }}
                                                        onpointerup={stopPan}
                                                        onpointercancel={stopPan}
                                                        onlostpointercapture={stopPan}
                                                        class="touch-none flex h-11 w-11 items-center justify-center rounded border border-slate-700 bg-slate-800 text-lg text-slate-100 active:bg-sky-600"
                                                >
                                                        ▲
                                                </button>
                                                <div></div>

                                                <!-- Left / Center / Right -->
                                                <button
                                                        type="button"
                                                        aria-label="Pan West"
                                                        title="Pan Left"
                                                        onpointerdown={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.setPointerCapture(e.pointerId);
                                                                startPan('left');
                                                        }}
                                                        onpointerup={stopPan}
                                                        onpointercancel={stopPan}
                                                        onlostpointercapture={stopPan}
                                                        class="touch-none flex h-11 w-11 items-center justify-center rounded border border-slate-700 bg-slate-800 text-lg text-slate-100 active:bg-sky-600"
                                                >
                                                        ◀
                                                </button>

                                                <div class="flex items-center justify-center rounded border border-slate-800 bg-slate-950 text-slate-500">
                                                        <span class="text-xs">●</span>
                                                </div>

                                                <button
                                                        type="button"
                                                        aria-label="Pan East"
                                                        title="Pan Right"
                                                        onpointerdown={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.setPointerCapture(e.pointerId);
                                                                startPan('right');
                                                        }}
                                                        onpointerup={stopPan}
                                                        onpointercancel={stopPan}
                                                        onlostpointercapture={stopPan}
                                                        class="touch-none flex h-11 w-11 items-center justify-center rounded border border-slate-700 bg-slate-800 text-lg text-slate-100 active:bg-sky-600"
                                                >
                                                        ▶
                                                </button>

                                                <!-- Down -->
                                                <div></div>
                                                <button
                                                        type="button"
                                                        aria-label="Pan South"
                                                        title="Pan Down"
                                                        onpointerdown={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.setPointerCapture(e.pointerId);
                                                                startPan('down');
                                                        }}
                                                        onpointerup={stopPan}
                                                        onpointercancel={stopPan}
                                                        onlostpointercapture={stopPan}
                                                        class="touch-none flex h-11 w-11 items-center justify-center rounded border border-slate-700 bg-slate-800 text-lg text-slate-100 active:bg-sky-600"
                                                >
                                                        ▼
                                                </button>
                                                <div></div>
                                        </div>
                                </div>

                                <!-- Layer Toggles -->
                                <div class="flex flex-col gap-1 border-t border-slate-800/80 pt-1.5">
                                        <div class="px-1 font-mono text-[9px] tracking-wider text-slate-500 uppercase">
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
                                                <span class="text-[10px] font-bold text-slate-500" class:text-emerald-400={showSensorLabels}>
                                                        {showSensorLabels ? 'ON' : 'OFF'}
                                                </span>
                                        </button>

                                        <button
                                                type="button"
                                                onclick={onToggleSensorValues}
                                                class="flex items-center justify-between rounded border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-left font-mono text-[11px] hover:bg-slate-800"
                                        >
                                                <span>Sensor Values</span>
                                                <span class="text-[10px] font-bold text-slate-500" class:text-emerald-400={showSensorValues}>
                                                        {showSensorValues ? 'ON' : 'OFF'}
                                                </span>
                                        </button>

                                        <button
                                                type="button"
                                                onclick={onToggleHoverInfo}
                                                class="flex items-center justify-between rounded border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-left font-mono text-[11px] hover:bg-slate-800"
                                        >
                                                <span>Hover Info</span>
                                                <span class="text-[10px] font-bold text-slate-500" class:text-emerald-400={showHoverInfo}>
                                                        {showHoverInfo ? 'ON' : 'OFF'}
                                                </span>
                                        </button>
                                </div>

                                <!-- Diagnostics -->
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

                <!-- Bottom HUD Footer / Collapse -->
                <div class="flex items-center justify-between gap-2 border-t border-slate-700/80 px-1 pt-1.5">
                        <span class="font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                Nav Controls
                        </span>

                        <button
                                type="button"
                                onclick={() => (showNavigation = !showNavigation)}
                                title={showNavigation ? 'Collapse HUD' : 'Expand HUD'}
                                aria-label={showNavigation ? 'Collapse Navigation HUD' : 'Expand Navigation HUD'}
                                class="rounded border border-slate-700 px-2 py-0.5 font-mono text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                                {showNavigation ? '−' : '+'}
                        </button>
                </div>
        </div>
</div>

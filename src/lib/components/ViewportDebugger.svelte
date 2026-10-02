<script lang="ts">
	let {
		webGlSupported = false,
		viewMode = '3D',
		statusMsg = '',
		cameraPos = { lat: 0, lon: 0, alt: 0 },
		errorLog = ''
	}: {
		webGlSupported?: boolean;
		viewMode?: string;
		statusMsg?: string;
		cameraPos?: { lat: number; lon: number; alt: number };
		errorLog?: string;
	} = $props();
</script>

<div class="pointer-events-none absolute top-4 right-4 z-30 flex max-w-md flex-col gap-2">
	<div
		class="pointer-events-auto rounded-lg border border-slate-800 bg-slate-900/90 p-3 font-mono text-xs text-slate-300 shadow-2xl backdrop-blur-md"
	>
		<div class="mb-1 flex items-center justify-between border-b border-slate-800 pb-1">
			<span class="font-bold text-slate-400 uppercase">3D Viewport Debugger</span>
			<div class="flex items-center gap-2">
				<span class={webGlSupported ? 'text-emerald-400' : 'text-rose-400'}>
					{webGlSupported ? 'WebGL OK' : 'WebGL FAIL'}
				</span>
			</div>
		</div>

		<div class="py-1">
			<span class="text-slate-500">Mode:</span>
			<span class="text-emerald-300">{viewMode}</span>
			<span class="ml-2 text-slate-500">Status:</span>
			<span class="text-amber-300">{statusMsg}</span>
		</div>

		<div class="mt-1 border-t border-slate-800/80 pt-1 text-[11px] text-slate-400">
			Cam: {cameraPos.lat}°N, {cameraPos.lon}°W | Alt: {cameraPos.alt}m
		</div>

		{#if errorLog}
			<div class="mt-2 overflow-x-auto rounded border border-rose-900/50 bg-rose-950/30 p-2">
				<div class="font-bold text-rose-400">Initialization Exception:</div>
				<pre class="mt-1 text-[10px] whitespace-pre-wrap text-rose-300">{errorLog}</pre>
			</div>
		{/if}
	</div>
</div>

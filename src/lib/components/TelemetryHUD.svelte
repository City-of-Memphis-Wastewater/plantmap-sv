<!-- src/lib/components/TelemetryHUD.svelte -->
<script lang="ts">
	import { telemetryStore } from '#lib/stores/telemetry-client.svelte.js';

	let showTelemetryHud = $state(false);
</script>

<div class="fixed bottom-[4vh] left-3 z-20 flex max-w-[280px] flex-col">
	<!--div class="fixed bottom-[4vh] left-3 z-20 flex w-[280px] max-w-[90vw] flex-col"-->
	<div
		class="pointer-events-auto overflow-hidden rounded-md border border-slate-700/80 bg-slate-900/90 text-xs text-slate-100 shadow-xl backdrop-blur-md select-text"
	>
		<!-- Expandable, scrollable sensor matrix -->
		{#if showTelemetryHud}
			<div
				class="max-h-[calc(100dvh-110px)] overflow-y-auto overscroll-contain border-b border-slate-800/80 px-1.5 py-1 text-[10px]"
			>
				<!-- Warning Callout -->
				{#if telemetryStore.error}
					<div class="mb-1 rounded bg-amber-950/40 px-1.5 py-0.5 font-mono text-[9px] italic">
						{telemetryStore.error}
					</div>
				{/if}

				<!-- Sensor Grid -->
				<div class="flex flex-col gap-0">
					{#each Object.values(telemetryStore.sensors || {}) as sensor (sensor.id)}
						<div class="flex items-center justify-between gap-2 py-0 font-mono">
							<span class="text-slate-400">
								{sensor.name || sensor.id}
							</span>
							<span class="font-semibold text-emerald-400">
								{sensor.value ?? '--'}
								<span class="text-[8px] font-normal text-slate-500">{sensor.unit ?? ''}</span>
							</span>
						</div>
					{:else}
						<div class="py-0.5 text-center font-mono text-[9px] text-slate-500">
							Loading sensor matrix...
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Persistent bottom control bar -->
		<div class="flex items-center justify-between gap-3 px-2 py-1.5">
			<div class="flex flex-col items-start gap-0.5">
				<span class="font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
					Telemetry
				</span>

				{#if telemetryStore.isDegraded}
					<span
						class="rounded border border-amber-500/40 bg-amber-500/20 px-1 py-0.5 font-mono text-[8px] font-semibold text-amber-400"
					>
						FALLBACK
					</span>
				{:else}
					<span
						class="rounded border border-emerald-500/40 bg-emerald-500/20 px-1 py-0.5 font-mono text-[8px] font-semibold text-emerald-400"
					>
						ONLINE
					</span>
				{/if}
			</div>

			<!-- Button stays anchored at the bottom-right -->
			<button
				type="button"
				onclick={() => (showTelemetryHud = !showTelemetryHud)}
				title={showTelemetryHud ? 'Collapse telemetry' : 'Expand telemetry'}
				aria-expanded={showTelemetryHud}
				class="rounded border border-slate-700 px-2 py-1 font-mono text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
			>
				{showTelemetryHud ? '−' : '+'}
			</button>
		</div>
	</div>
</div>

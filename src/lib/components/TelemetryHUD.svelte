<script lang="ts">
	import { telemetryStore } from '$lib/stores/telemetry.svelte';

	let showTelemetryHud = $state(false);
</script>

<div class="fixed top-1/2 left-3 z-20 -translate-y-1/2 flex max-w-[240px] flex-col gap-1.5">
	<div
		class="pointer-events-auto select-text rounded-md border border-slate-700/80 bg-slate-900/90 text-xs text-slate-100 shadow-xl backdrop-blur-md"
	>
		<!-- Compact Header Bar -->
		<div class="flex items-center justify-between gap-3 px-2 py-1.5">
			<div class="flex flex-col items-start gap-0.5">
				<span class="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
					Telemetry
				</span>
				<!-- Status Pulse Pill Stacked Vertically -->
				{#if telemetryStore.isDegraded}
					<span
						class="rounded border border-amber-500/40 bg-amber-500/20 px-1 py-0.2 font-mono text-[8px] font-semibold text-amber-400"
					>
						FALLBACK
					</span>
				{:else}
					<span
						class="rounded border border-emerald-500/40 bg-emerald-500/20 px-1 py-0.2 font-mono text-[8px] font-semibold text-emerald-400"
					>
						ONLINE
					</span>
				{/if}
			</div>

			<button
				type="button"
				onclick={() => (showTelemetryHud = !showTelemetryHud)}
				title={showTelemetryHud ? 'Collapse telemetry' : 'Expand telemetry'}
				class="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
			>
				{showTelemetryHud ? '−' : '+'}
			</button>
		</div>

		<!-- Expandable Matrix -->
		{#if showTelemetryHud}
			<div class="border-t border-slate-800/80 p-2 text-[11px]">
				<!-- Warning Callout -->
				{#if telemetryStore.error}
					<div class="mb-1.5 rounded bg-amber-950/40 px-1.5 py-1 font-mono text-[10px] italic text-amber-300/90 border border-amber-800/40">
						{telemetryStore.error}
					</div>
				{/if}

				<!-- Sensor Grid -->
				<div class="flex flex-col gap-0.5">
					{#each Object.values(telemetryStore.sensors || {}) as sensor (sensor.id)}
						<div class="flex items-center justify-between gap-4 py-0.5 font-mono">
							<span class="text-slate-400">
								{sensor.name || sensor.id}
							</span>
							<span class="font-bold text-emerald-400">
								{sensor.value ?? '--'} <span class="text-[9px] font-normal text-slate-400">{sensor.unit}</span>
							</span>
						</div>
					{:else}
						<div class="py-1 text-center font-mono text-[10px] text-slate-500">
							Loading sensor matrix...
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

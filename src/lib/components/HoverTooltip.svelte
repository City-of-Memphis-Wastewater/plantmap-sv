<!-- src/lib/components/HoverTooltip.svelte -->
<script lang="ts">
	let {
		hoverInfo
	}: {
		hoverInfo: {
			name: string;
			value: string;
			x: number;
			y: number;
		};
	} = $props();
</script>

<div
	class="pointer-events-none absolute z-40 rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md"
	style="left: {hoverInfo.x + 12}px; top: {hoverInfo.y + 12}px;"
>
	<div class="font-bold text-emerald-400">
		{hoverInfo.name}
	</div>
	<div class="text-slate-300">
		{hoverInfo.value}
	</div>
</div>

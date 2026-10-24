<!-- src/lib/components/HoverTooltip.svelte -->
<script lang="ts">
	import PlotHUD from './PlotHUD.svelte';

	let {
		hoverInfo
	}: {
		hoverInfo: {
			name: string;
			value: string;
			tag: string;
			x: number;
			y: number;
		};
	} = $props();
</script>

<PlotHUD tag={hoverInfo.tag} name={hoverInfo.name} x={hoverInfo.x} y={hoverInfo.y} />

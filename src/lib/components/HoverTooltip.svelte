<!-- src/lib/components/HoverTooltip.svelte -->
<script lang="ts">
    import PlotHUD from './PlotHUD.svelte';
    import { telemetryStore } from '$lib/stores/telemetry-client.svelte';

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

    const currentSensor = $derived(telemetryStore.sensors[hoverInfo.tag]);

    const currentValue = $derived(
        currentSensor
            ? `${currentSensor.value} ${currentSensor.unit}`
            : hoverInfo.value
    );
</script>

<PlotHUD
    tag={hoverInfo.tag}
    name={hoverInfo.name}
    x={hoverInfo.x}
    y={hoverInfo.y}
    {currentValue}
/>

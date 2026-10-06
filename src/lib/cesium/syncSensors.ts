// src/lib/cesium/syncSensors.ts

import type { Viewer } from 'cesium';
type CesiumModule = typeof import('cesium');
import type { SensorNode } from '$lib/stores/telemetry.svelte';

export function syncSensorEntities(
	viewer: Viewer,
	CesiumModule: CesiumModule,
	sensors: Record<string, SensorNode>,
	showSensorLabels: boolean,
	showSensorValues: boolean
) {
	console.log(
		'[Cesium Sync] syncSensorEntities',
		Object.values(sensors).map((s) => ({
			id: s.id,
			value: s.value
		}))
	);

	if (!viewer || !CesiumModule || !sensors) return;

	Object.values(sensors).forEach((sensor) => {
		const entityId = `sensor-${sensor.id}`;
		const entity = viewer.entities.getById(entityId);

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
					text: showSensorValues
						? `${showSensorLabels ? sensor.name + '\n' : ''}${sensor.value} ${sensor.unit}`
						: showSensorLabels
							? sensor.name
							: '',
					font: '13px monospace',
					style: CesiumModule.LabelStyle.FILL_AND_OUTLINE,
					outlineWidth: 3,
					verticalOrigin: CesiumModule.VerticalOrigin.BOTTOM,
					pixelOffset: new CesiumModule.Cartesian2(0, -22),
					show: showSensorLabels || showSensorValues
				}

				//label: {
				//	text: `${sensor.name}\n${sensor.value} ${sensor.unit}`,
				//	font: '13px monospace',
				//	style: CesiumModule.LabelStyle.FILL_AND_OUTLINE,
				//	outlineWidth: 3,
				//	verticalOrigin: CesiumModule.VerticalOrigin.BOTTOM,
				//	pixelOffset: new CesiumModule.Cartesian2(0, -22),
				//	show: showSensorLabels
				//}
			});
		} else {
			if (entity.label) {
				entity.label.text = showSensorValues
					? `${showSensorLabels ? sensor.name + '\n' : ''}${sensor.value} ${sensor.unit}`
					: showSensorLabels
						? sensor.name
						: '';

				entity.label.show = showSensorLabels || showSensorValues;
			}
			//if (entity.label) {
			//	entity.label.text = `${sensor.name}\n${sensor.value} ${sensor.unit}`;
			//	entity.label.show = showSensorLabels;
			//}
			if (entity.point) {
				entity.point.color =
					sensor.status === 'alarm' ? CesiumModule.Color.RED : CesiumModule.Color.LIME;
			}
		}
	});
}

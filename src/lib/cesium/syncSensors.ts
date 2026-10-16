// src/lib/cesium/syncSensors.ts

import type { Viewer } from 'cesium';

type CesiumModule = typeof import('cesium');

import type { SensorNode } from '$lib/telemetry/types';

export function syncSensorEntities(
	viewer: Viewer,
	CesiumModule: CesiumModule,
	sensors: Record<string, SensorNode>,
	showSensorLabels: boolean,
	showSensorValues: boolean
) {
	console.log(
		'[Cesium Sync] syncSensorEntities',
		Object.values(sensors).map((sensor) => ({
			id: sensor.id,
			value: sensor.value
		}))
	);

	if (!viewer || !CesiumModule || !sensors) return;

	Object.values(sensors).forEach((sensor) => {
		const entityId = `sensor-${sensor.id}`;
		const entity = viewer.entities.getById(entityId);

		const pos = CesiumModule.Cartesian3.fromDegrees(sensor.lon, sensor.lat, sensor.altitude ?? 15);

		// Build the label text independently of its visibility.
		const labelText = [
			showSensorLabels ? sensor.name : '',
			showSensorValues ? `${sensor.value} ${sensor.unit}` : ''
		]
			.filter(Boolean)
			.join('\n');

		const labelVisible = showSensorLabels || showSensorValues;

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
					text: labelText,
					font: '13px monospace',
					style: CesiumModule.LabelStyle.FILL_AND_OUTLINE,
					outlineWidth: 3,
					verticalOrigin: CesiumModule.VerticalOrigin.BOTTOM,
					pixelOffset: new CesiumModule.Cartesian2(0, -22),
					show: labelVisible
				}
			});
		} else {
			// Update the existing entity's position and sensor data.
			entity.position = new CesiumModule.ConstantPositionProperty(pos);
			entity.name = sensor.name;
			entity.properties = new CesiumModule.PropertyBag({
				sensorData: sensor
			});

			if (entity.label) {
				entity.label.text = new CesiumModule.ConstantProperty(labelText);
				entity.label.show = new CesiumModule.ConstantProperty(labelVisible);
			}

			if (entity.point) {
				entity.point.color = new CesiumModule.ConstantProperty(
					sensor.status === 'alarm' ? CesiumModule.Color.RED : CesiumModule.Color.LIME
				);
			}
		}
	});
}

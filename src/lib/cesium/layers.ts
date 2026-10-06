// src/lib/cesium/layers.ts
import type { Viewer } from 'cesium';
//import type { Viewer, Cartesian2, Cartesian3, Cartographic } from 'cesium';
type CesiumModule = typeof import('cesium');
export function applyBasemap(
	viewer: Viewer,
	CesiumModule: CesiumModule,
	type: 'satellite' | 'streets'
) {
	if (!viewer || !CesiumModule) return;

	const layers = viewer.imageryLayers;
	layers.removeAll();

	if (type === 'satellite') {
		const satelliteProvider = new CesiumModule.UrlTemplateImageryProvider({
			url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			maximumLevel: 19,
			credit: 'Esri, Maxar, Earthstar Geographics'
		});
		layers.addImageryProvider(satelliteProvider);
	} else {
		const streetProvider = new CesiumModule.OpenStreetMapImageryProvider({
			url: 'https://tile.openstreetmap.org/',
			maximumLevel: 19,
			credit: 'OpenStreetMap contributors'
		});
		layers.addImageryProvider(streetProvider);
	}

	const labelsProvider = new CesiumModule.UrlTemplateImageryProvider({
		url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
		maximumLevel: 19
	});
	layers.addImageryProvider(labelsProvider);
}

export async function loadKmlOverlay(viewer: Viewer, CesiumModule: CesiumModule, kmlPath: string) {
	if (!viewer || !CesiumModule) return;

	try {
		const kmlDataSource = await CesiumModule.KmlDataSource.load(kmlPath, {
			camera: viewer.scene.camera,
			canvas: viewer.scene.canvas,
			clampToGround: true
		});
		kmlDataSource.name = 'plant-kml';
		await viewer.dataSources.add(kmlDataSource);
		return kmlDataSource;
	} catch (err) {
		console.error(`Failed to load KML overlay from ${kmlPath}:`, err);
		return null;
	}
}

export async function loadGeoJsonOverlay(
	viewer: Viewer,
	CesiumModule: CesiumModule,
	geoJsonPath: string
) {
	if (!viewer || !CesiumModule) return;

	try {
		const geoJsonDataSource = await CesiumModule.GeoJsonDataSource.load(geoJsonPath, {
			clampToGround: true
		});
		geoJsonDataSource.name = 'plant-geojson';

		// Fix fuzzy/grainy label rendering on entities
		for (const entity of geoJsonDataSource.entities.values) {
			if (entity.label) {
				entity.label.font = new CesiumModule.ConstantProperty(
					'bold 14px Inter, system-ui, sans-serif'
				);
				entity.label.style = new CesiumModule.ConstantProperty(
					CesiumModule.LabelStyle.FILL_AND_OUTLINE
				);
				entity.label.fillColor = new CesiumModule.ConstantProperty(CesiumModule.Color.WHITE);
				entity.label.outlineColor = new CesiumModule.ConstantProperty(CesiumModule.Color.BLACK);
				entity.label.outlineWidth = new CesiumModule.ConstantProperty(3);
				entity.label.disableDepthTestDistance = new CesiumModule.ConstantProperty(
					Number.POSITIVE_INFINITY
				);
				entity.label.scaleByDistance = new CesiumModule.NearFarScalar(150, 1.0, 2000, 0.5);
			}
		}

		await viewer.dataSources.add(geoJsonDataSource);
		return geoJsonDataSource;
	} catch (err) {
		console.error(`Failed to load GeoJSON overlay from ${geoJsonPath}:`, err);
		return null;
	}
}

export function setLayerVisibility(dataSource: any, visible: boolean) {
	if (dataSource) {
		dataSource.show = visible;
	}
}

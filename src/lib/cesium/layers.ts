// src/lib/cesium/layers.ts

export function applyBasemap(
	viewer: any,
	CesiumModule: any,
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

	// Add reference transportation/labels layer over both options
	const labelsProvider = new CesiumModule.UrlTemplateImageryProvider({
		url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
		maximumLevel: 19
	});
	layers.addImageryProvider(labelsProvider);
}

export async function loadKmlOverlay(viewer: any, CesiumModule: any, kmlPath: string) {
	if (!viewer || !CesiumModule) return;

	try {
		const kmlDataSource = await CesiumModule.KmlDataSource.load(kmlPath, {
			camera: viewer.scene.camera,
			canvas: viewer.scene.canvas,
			clampToGround: true
		});
		await viewer.dataSources.add(kmlDataSource);
	} catch (err) {
		console.error(`Failed to load KML overlay from ${kmlPath}:`, err);
	}
}

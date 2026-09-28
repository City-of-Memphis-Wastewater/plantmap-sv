// src/lib/cesium/navigation.ts

export const SITE_LON = -90.155655;
export const SITE_LAT = 35.071202;
export const DEFAULT_CAMERA_ALT = 1100; // Maxson plant scale

export function resetCamera(viewer: any, CesiumModule: any) {
	if (!viewer || !CesiumModule) return;

	viewer.camera.flyTo({
		destination: CesiumModule.Cartesian3.fromDegrees(SITE_LON, SITE_LAT, DEFAULT_CAMERA_ALT),
		orientation: {
			heading: CesiumModule.Math.toRadians(0),
			pitch: CesiumModule.Math.toRadians(-90),
			roll: 0.0
		},
		duration: 1.2
	});
}

export function toggleViewMode(viewer: any, CesiumModule: any, mode: '2D' | '3D') {
        if (!viewer || !CesiumModule) return;

        const scene = viewer.scene;
        const camera = viewer.camera;

        // 1. Find ground point currently centered on screen
        const windowCenter = new CesiumModule.Cartesian2(
                scene.canvas.clientWidth / 2,
                scene.canvas.clientHeight / 2
        );

        // Pick ground/globe position at center of screen
        let targetGroundPos = scene.pickPosition(windowCenter);

        // Fallback to ellipsoid if picking terrain/3D tiles fails or yields nothing
        if (!CesiumModule.defined(targetGroundPos)) {
                const ray = camera.getPickRay(windowCenter);
                targetGroundPos = scene.globe.pick(ray, scene);
        }

        // 2. Fallback to current camera coordinates if no ground intersection exists (e.g. looking at sky)
        if (!CesiumModule.defined(targetGroundPos)) {
                const cartographic = camera.positionCartographic;
                targetGroundPos = CesiumModule.Cartesian3.fromRadians(
                        cartographic.longitude,
                        cartographic.latitude,
                        0.0
                );
        }

        // 3. Convert target ground position to Cartographic to preserve altitude/distance
        const groundCarto = CesiumModule.Cartographic.fromCartesian(targetGroundPos);
        const currentAlt = camera.positionCartographic.height;

        if (mode === '2D') {
                // Place camera directly above the ground target looking straight down (-90°)
                const destination = CesiumModule.Cartesian3.fromRadians(
                        groundCarto.longitude,
                        groundCarto.latitude,
                        Math.max(currentAlt, 300) // Ensure reasonable minimum altitude
                );

                camera.flyTo({
                        destination,
                        orientation: {
                                heading: CesiumModule.Math.toRadians(0.0),   // True North
                                pitch: CesiumModule.Math.toRadians(-90.0),  // Direct top-down
                                roll: 0.0
                        },
                        duration: 1.2
                });
        } else {
                // Return to 45° perspective, offset south so the ground target remains centered
                // Calculate offset required to center the target point when tilted -45°
                const offsetDistance = currentAlt / Math.tan(CesiumModule.Math.toRadians(45.0));

                // Move camera position south of target point
                const targetGeographic = {
                        lon: CesiumModule.Math.toDegrees(groundCarto.longitude),
                        lat: CesiumModule.Math.toDegrees(groundCarto.latitude)
                };

                // Approximate latitude shift (~111,000 meters per degree latitude)
                const latOffsetDegrees = offsetDistance / 111000;
                const newLat = targetGeographic.lat - latOffsetDegrees;

                const destination = CesiumModule.Cartesian3.fromDegrees(
                        targetGeographic.lon,
                        newLat,
                        currentAlt
                );

                camera.flyTo({
                        destination,
                        orientation: {
                                heading: CesiumModule.Math.toRadians(0.0),
                                pitch: CesiumModule.Math.toRadians(-45.0),
                                roll: 0.0
                        },
                        duration: 1.2
                });
        }
}


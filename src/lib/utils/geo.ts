import proj4 from 'proj4';

// WGS84 GPS to UTM Zone 16N (Memphis / Mid-South area) projection
const WGS84 = 'EPSG:4326';
const UTM16N = '+proj=utm +zone=16 +datum=WGS84 +units=m +no_defs';

// Plant Anchor Point (0,0 in local 3D scene)
const PLANT_ORIGIN_LON = -90.0908;
const PLANT_ORIGIN_LAT = 35.0256;

const [originX, originY] = proj4(WGS84, UTM16N, [PLANT_ORIGIN_LON, PLANT_ORIGIN_LAT]);

/**
 * Converts global GPS (Lat, Lon) to local 3D scene space (X, Y) relative to plant origin
 */
export function gpsToLocalCoords(lat: number, lon: number): { x: number; y: number } {
	const [easting, northing] = proj4(WGS84, UTM16N, [lon, lat]);
	return {
		x: easting - originX,
		y: northing - originY // In Three.js, Z is height, so Y is North/South
	};
}

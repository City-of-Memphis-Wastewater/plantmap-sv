import { defineConfig } from 'vitest/config';
//import { viteStaticCopy } from 'vite-plugin-static-copy';
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
//import { normalizePath } from 'vite';
//import path from 'node:path';
//import { fileURLToPath } from 'node:url';

import { bootstrapPlantMapConfig } from './src/lib/plantmap-sv/bootstrap.ts';
import { loadPlantMapConfig } from './src/lib/plantmap-sv/config.ts';

const plantMapConfig = loadPlantMapConfig(bootstrapPlantMapConfig());

//const projectRoot = path.dirname(fileURLToPath(import.meta.url));
//const cesiumSource = normalizePath(path.resolve(projectRoot, 'node_modules/cesium/Build/Cesium'));

//const cesiumBaseUrl = 'cesium';

/**const cesiumTargets = [
	{
		src: `${cesiumSource}/ThirdParty`,
		dest: cesiumBaseUrl
	},
	{
		src: `${cesiumSource}/Workers`,
		dest: cesiumBaseUrl
	},
	{
		src: `${cesiumSource}/Assets`,
		dest: cesiumBaseUrl
	},
	{
		src: `${cesiumSource}/Widgets`,
		dest: cesiumBaseUrl
	}
];
*/
export default defineConfig({
	server: {
		port: plantMapConfig.devServer.port
	},
	preview: {
		port: plantMapConfig.devServer.port
	},
	assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.pbf', '**/*.geojson', '**/*.czml'],
	plugins: [
		tailwindcss(),
		//viteStaticCopy({
		//	targets: cesiumTargets
		//}),
		sveltekit() // Must remain empty so svelte.config.js is read
	],
	optimizeDeps: {
		include: ['cesium', 'mersenne-twister']
	},
	ssr: {
		noExternal: []
	},
	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'browser',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

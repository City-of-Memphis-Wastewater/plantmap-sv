import { defineConfig } from 'vitest/config';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { normalizePath } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

import { bootstrapPlantMapConfig } from './src/lib/plantmap/bootstrap.ts';
import { loadPlantMapConfig } from './src/lib/plantmap/config.ts';

const plantMapConfig = loadPlantMapConfig(bootstrapPlantMapConfig());

const cesiumSource = normalizePath(path.resolve('node_modules/cesium/Build/Cesium'));

const cesiumBaseUrl = 'cesium';

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
		sveltekit(), // Must remain empty so svelte.config.js is read
		viteStaticCopy({
			targets: [
				{ src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
				{ src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
				{ src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
				{ src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl }
			]
		})
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

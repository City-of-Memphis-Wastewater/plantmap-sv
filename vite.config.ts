import { defineConfig } from 'vitest/config';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { normalizePath } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bootstrapPlantMapConfig } from './src/lib/plantmap/bootstrap.ts';
import { loadPlantMapConfig } from './src/lib/plantmap/config.ts';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const plantMapConfig = loadPlantMapConfig(bootstrapPlantMapConfig());

const cesiumSource = normalizePath(path.resolve(projectRoot,'node_modules/cesium/Build/Cesium'));

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
		viteStaticCopy({
			targets: [
				{ src: `${cesiumSource}/ThirdParty/**/*`, dest: `${cesiumBaseUrl}/ThirdParty` },
				{ src: `${cesiumSource}/Workers/**/*`, dest: `${cesiumBaseUrl}/Workers` },
				{ src: `${cesiumSource}/Assets/**/*`, dest: `${cesiumBaseUrl}/Assets` },
				{ src: `${cesiumSource}/Widgets/**/*`, dest: `${cesiumBaseUrl}/Widgets` }
			]
		}),
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

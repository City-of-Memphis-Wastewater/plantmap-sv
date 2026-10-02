import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.pbf', '**/*.geojson', '**/*.czml'],
	plugins: [
		tailwindcss(),
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

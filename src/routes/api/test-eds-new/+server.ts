// src/routes/api/test-eds-new/+server.ts

import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { createEdsClient } from '$lib/server/eds/factory';

export const GET: RequestHandler = async () => {
	const started = Date.now();

	console.log('');
	console.log('============================================================');
	console.log('[TestRoute] GET /api/test-eds-new');
	console.log('[TestRoute] Starting EDS test');

	//const client = new ClientEdsSoap();
	const client = createEdsClient();

	try {
		const sampleTags = ['m100fi', 'fi8001', 'si1000-6'];

		console.log('[TestRoute] Sample tags:', sampleTags);

		console.log('[TestRoute] Endpoint:', client.endpoint);

		console.log('[TestRoute] Calling client.points.getRegex()...');

		const requestStarted = Date.now();

		const data = await client.points.getRegex(sampleTags);

		console.log(Object.keys(data));

		console.log('[TestRoute] client.points.getRegex() returned');

		console.log('[TestRoute] Request elapsed:', `${Date.now() - requestStarted}ms`);

		console.log('[TestRoute] Point count:', Object.keys(data).length);

		console.log('[TestRoute] Point keys:', Object.keys(data));

		console.log('[TestRoute] Total elapsed:', `${Date.now() - started}ms`);

		console.log('[TestRoute] SUCCESS');

		console.log('============================================================');
		console.log('');

		return json({
			success: true,
			count: Object.keys(data).length,
			data
		});
	} catch (error: unknown) {
		console.error('============================================================');
		console.error('[TestRoute] EDS TEST FAILED');
		console.error('[TestRoute] Total elapsed:', `${Date.now() - started}ms`);

		if (error instanceof Error) {
			console.error('[TestRoute] Error name:', error.name);

			console.error('[TestRoute] Error message:', error.message);

			console.error('[TestRoute] Error stack:', error.stack);
		} else {
			console.error('[TestRoute] Unknown error:', error);
		}

		console.error('============================================================');
		console.error('');

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	} finally {
		console.log('[TestRoute] Logging out of EDS...');

		try {
			await client.auth.logout();

			console.log('[TestRoute] EDS logout complete');
		} catch (error) {
			console.error('[TestRoute] EDS logout failed:', error);
		}
	}
};

import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { ClientEdsSoap } from '$lib/server/eds/client';
//import { ClientEdsSoap } from '$lib/server/eds/client-new';

export const GET: RequestHandler = async () => {
	console.log('[TestRoute] ========================================');
	console.log('[TestRoute] GET /api/test-eds');
	console.log('[TestRoute] Starting EDS test...');
	console.log('[TestRoute] ========================================');

	const startTime = Date.now();

	console.log('[TestRoute] Creating ClientEdsSoap...');
	const client = new ClientEdsSoap();
	console.log('[TestRoute] ClientEdsSoap created.');

	try {
		const sampleTags = ['m100fi', 'fi8001'];

		console.log('[TestRoute] Sample tags:', sampleTags);
		console.log('[TestRoute] About to call getPointsByIdcsListParsed()...');
		console.log('[TestRoute] Elapsed:', `${Date.now() - startTime}ms`);

		const requestStart = Date.now();

		const data = await client.getPointsByIdcsListParsed(sampleTags);
		//const data = await client.points.getByIdcsList(sampleTags);

		console.log('[TestRoute] getPointsByIdcsListParsed() returned.');
		console.log('[TestRoute] Request elapsed:', `${Date.now() - requestStart}ms`);
		console.log('[TestRoute] Total elapsed:', `${Date.now() - startTime}ms`);

		console.log('[TestRoute] Returned data type:', typeof data);
		console.log('[TestRoute] Returned data:', data);

		const count = Object.keys(data).length;

		console.log('[TestRoute] Data count:', count);
		console.log('[TestRoute] Data keys:', Object.keys(data));

		console.log('[TestRoute] Logging out of EDS...');

		const logoutStart = Date.now();

		await client.logout();

		console.log(
			'[TestRoute] EDS logout completed.',
			`(${Date.now() - logoutStart}ms)`
		);

		console.log(
			'[TestRoute] Test completed successfully.',
			`Total: ${Date.now() - startTime}ms`
		);

		console.log('[TestRoute] ========================================');

		return json({
			success: true,
			count,
			data
		});
	} catch (error: any) {
		console.error('[TestRoute] ========================================');
		console.error('[TestRoute] EDS TEST FAILED');
		console.error('[TestRoute] Error:', error);
		console.error('[TestRoute] Error message:', error?.message);
		console.error('[TestRoute] Error name:', error?.name);
		console.error('[TestRoute] Error stack:', error?.stack);
		console.error('[TestRoute] Total elapsed:', `${Date.now() - startTime}ms`);
		console.error('[TestRoute] ========================================');

		return json(
			{
				success: false,
				error: error?.message || String(error)
			},
			{ status: 500 }
		);
	}
};
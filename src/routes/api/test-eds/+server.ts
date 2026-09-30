import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ClientEdsSoap } from '$lib/server/eds/client';

export const GET: RequestHandler = async () => {
	const client = new ClientEdsSoap();

	try {
		// Test tags (adjust to real tags or let it fallback/empty)
		const sampleTags = ['m100fi', 'fi8001'];
		
		console.log('[TestRoute] Attempting to fetch current values from EDS...');
		const data = await client.fetchCurrentValues(sampleTags);
		
		await client.logout();

		return json({
			success: true,
			count: Object.keys(data).length,
			data
		});
	} catch (error: any) {
		console.error('[TestRoute] EDS connection error:', error);
		return json(
			{
				success: false,
				error: error.message || String(error)
			},
			{ status: 500 }
		);
	}
};

// src/routes/api/debug/tabular/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getEdsClient } from '$lib/server/eds/factory';

export const GET: RequestHandler = async ({ url }) => {
	const started = Date.now();

	const tags = [
		...new Set(
			url.searchParams
				.getAll('tags')
				.join(',')
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean)
		)
	];

	const days = Number(url.searchParams.get('days') ?? '1');
	const stepSeconds = Number(url.searchParams.get('stepSeconds') ?? '60');
	const functionType = (url.searchParams.get('function') ?? 'AVG').trim().toUpperCase();

	console.log('');
	console.log('============================================================');
	console.log('[TabularDebug] GET /api/debug/tabular');
	console.log('[TabularDebug] Starting historical EDS test');
	console.log('[TabularDebug] Input tags:', tags);
	console.log('[TabularDebug] Days:', days);
	console.log('[TabularDebug] Step seconds:', stepSeconds);
	console.log('[TabularDebug] Function:', functionType);

	if (
		tags.length === 0 ||
		tags.length > 25 ||
		!Number.isFinite(days) ||
		days <= 0 ||
		days > 365 ||
		!Number.isInteger(stepSeconds) ||
		stepSeconds <= 0 ||
		stepSeconds > 86400 ||
		!/^[A-Z][A-Z0-9_]{0,19}$/.test(functionType)
	) {
		return json(
			{
				success: false,
				error: 'Invalid parameters.',
				usage: '/api/debug/tabular?tags=M100FI&days=1&stepSeconds=60&function=AVG'
			},
			{ status: 400 }
		);
	}

	try {
		const client = getEdsClient();

		console.log('[TabularDebug] Endpoint:', client.endpoint);
		console.log('[TabularDebug] Window seconds:', Math.round(days * 86400));
		console.log('[TabularDebug] Calling client.tabular.fetch()');

		const requestStarted = Date.now();
        //mustupdate
		const data = await client.tabular.fetch(
			tags,
			Math.round(days-1 * 86400),
			Math.round(days * 86400),
			stepSeconds,
			functionType,
			true
		);

		console.log('[TabularDebug] Tabular request returned');
		console.log('[TabularDebug] Result keys:', Object.keys(data));
		console.log('[TabularDebug] Result count:', Object.keys(data).length);
		console.log('[TabularDebug] Request elapsed:', `${Date.now() - requestStarted}ms`);
		console.log('[TabularDebug] Total elapsed:', `${Date.now() - started}ms`);
		console.log('[TabularDebug] SUCCESS');
		console.log('============================================================');
		console.log('');

		return json(
			{
				success: true,
				request: {
					tags,
					days,
					stepSeconds,
					function: functionType
				},
				count: Object.keys(data).length,
				data,
				elapsedMs: Date.now() - started
			},
			{
				headers: { 'Cache-Control': 'no-store' }
			}
		);
	} catch (error: unknown) {
		console.error('[TabularDebug] HISTORICAL EDS TEST FAILED');
		console.error('[TabularDebug] Total elapsed:', `${Date.now() - started}ms`);

		if (error instanceof Error) {
			console.error('[TabularDebug] Error name:', error.name);
			console.error('[TabularDebug] Error message:', error.message);
			console.error('[TabularDebug] Error stack:', error.stack);
		} else {
			console.error('[TabularDebug] Unknown error:', error);
		}

		console.error('============================================================');
		console.error('');

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
				elapsedMs: Date.now() - started
			},
			{ status: 502 }
		);
	}
};

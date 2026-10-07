// src/routes/api/telemetry-live/+server.ts

import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { telemetryService } from '$lib/server/telemetry/service';

export const GET: RequestHandler = async () => {
	return json(telemetryService.getLatest());
};

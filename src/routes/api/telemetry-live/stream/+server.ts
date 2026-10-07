// src/routes/api/telemetry-live/stream/+server.ts

import type { RequestHandler } from './$types';

import { telemetryService } from '$lib/server/telemetry/service';

const encoder = new TextEncoder();

export const GET: RequestHandler = ({ request }) => {
	let unsubscribe: (() => void) | undefined;
	let heartbeat: ReturnType<typeof setInterval> | undefined;

	const stream = new ReadableStream({
		start(controller) {
			const send = (snapshot: unknown) => {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
			};

			send(telemetryService.getLatest());

			unsubscribe = telemetryService.subscribe(send);

			heartbeat = setInterval(() => {
				controller.enqueue(encoder.encode(': heartbeat\n\n'));
			}, 15_000);

			request.signal.addEventListener('abort', () => {
				if (heartbeat) {
					clearInterval(heartbeat);
				}

				unsubscribe?.();
				controller.close();
			});
		},

		cancel() {
			if (heartbeat) {
				clearInterval(heartbeat);
			}

			unsubscribe?.();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};

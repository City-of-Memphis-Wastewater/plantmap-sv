// src/routes/api/telemetry-live/stream/+server.ts

import type { RequestHandler } from './$types';

import { telemetryService } from '$lib/server/telemetry/service';

const encoder = new TextEncoder();

export const GET: RequestHandler = ({ request }) => {
	let unsubscribe: (() => void) | undefined;
	let heartbeat: ReturnType<typeof setInterval> | undefined;
	let closed = false;

	const cleanup = () => {
		if (closed) {
			return;
		}

		closed = true;

		if (heartbeat !== undefined) {
			clearInterval(heartbeat);
			heartbeat = undefined;
		}

		unsubscribe?.();
		unsubscribe = undefined;
	};

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (data: string) => {
				if (closed) {
					return;
				}

				try {
					controller.enqueue(encoder.encode(data));
				} catch {
					// The client disconnected or the stream was already closed.
					cleanup();
				}
			};

			const sendSnapshot = (snapshot: unknown) => {
				send(`data: ${JSON.stringify(snapshot)}\n\n`);
			};

			// Send the current snapshot immediately.
			sendSnapshot(telemetryService.getLatest());

			// Subscribe to subsequent telemetry updates.
			unsubscribe = telemetryService.subscribe(sendSnapshot);

			// Keep the connection alive without generating telemetry updates.
			heartbeat = setInterval(() => {
				send(': heartbeat\n\n');
			}, 15_000);

			request.signal.addEventListener('abort', cleanup, {
				once: true
			});

			// Handle a request that was already aborted during setup.
			if (request.signal.aborted) {
				cleanup();
			}
		},

		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};

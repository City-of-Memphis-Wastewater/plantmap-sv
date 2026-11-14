export async function readErrorMessageDefunct(response: Response): Promise<string> {
	const body = await response.text();

	if (body) {
		try {
			const parsed: unknown = JSON.parse(body);

			if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
				const error = (parsed as { error?: unknown }).error;

				if (typeof error === 'string') {
					return error;
				}
			}
		} catch {
			// The response was not JSON; use its text below.
		}

		return body.slice(0, 500);
	}

	return response.statusText || 'Unknown server error';
}

export async function readErrorMessage(response: Response): Promise<string> {
	const body = await response.text();

	if (body) {
		try {
			const parsed: unknown = JSON.parse(body);

			if (typeof parsed === 'object' && parsed !== null) {
				const payload = parsed as {
					error?: unknown;
					detail?: unknown;
				};

				const error = typeof payload.error === 'string' ? payload.error : undefined;

				const detail = typeof payload.detail === 'string' ? payload.detail : undefined;

				if (error && detail) {
					return `${error} Detail: ${detail}`;
				}

				if (error) return error;
				if (detail) return detail;
			}
		} catch {
			// Response was not JSON.
		}

		return body.slice(0, 500);
	}

	return response.statusText || 'Unknown server error';
}

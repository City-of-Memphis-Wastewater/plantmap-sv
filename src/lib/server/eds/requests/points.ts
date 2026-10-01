// requests/points.ts

import type { ClientEdsSoap } from '../client-new';
import { formatIessTag } from '../helpers';
import { parseGetPointsResponse } from '../parsers/points';
import type { EdsPointTelemetry } from '../types';

export class Points {
	constructor(
		private readonly client: ClientEdsSoap
	) {}


	/**
	 * Fetch multiple points in a SINGLE SOAP request.
	 *
	 * This corresponds to the old client's getPoints().
	 */
	public async getRegex(
		idcsTags: string[]
	): Promise<Record<string, EdsPointTelemetry>> {
		const started = Date.now();

		if (idcsTags.length === 0) {
			this.client.log(
				'Points.getRegex called with empty list'
			);

			return {};
		}

		this.client.log('Points.getRegex START');

		const token =
			await this.client.auth.getToken();

		const iessTags = idcsTags.map(
			(name) =>
				formatIessTag(
					name,
					this.client.iessSuffix
				)
		);

		const regexPattern =
			`^(${iessTags.join('|')})$`;

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
	xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
	xmlns:tns="http://tt.com.pl/eds/">
	<soap:Body>
		<tns:getPoints>
			<tns:authString>${token}</tns:authString>
			<tns:filter>
				<tns:iessRe>${regexPattern}</tns:iessRe>
			</tns:filter>
			<tns:maxCount>${idcsTags.length}</tns:maxCount>
		</tns:getPoints>
	</soap:Body>
</soap:Envelope>`;

		this.client.log('Points.getRegex sending request', {
			idcsTags,
			iessTags,
			regexPattern,
			endpoint: this.client.endpoint
		});

		try {
			const response = await fetch(
				this.client.endpoint,
				{
					method: 'POST',
					headers: {
						'Content-Type':
							'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPoints"'
					},
					body: soapEnvelope
				}
			);

			this.client.log('Points.getRegex response received', {
				status: response.status,
				statusText: response.statusText,
				ok: response.ok,
				elapsedMs: Date.now() - started
			});

			const xml = await response.text();

			this.client.log('Points.getRegex response body received', {
				length: xml.length
				//xml
			});

			if (!response.ok) {
				throw new Error(
					`EDS getPoints failed: HTTP ${response.status} ${response.statusText}`
				);
			}

			const results =
				parseGetPointsResponse(xml);

			this.client.log('Points.getRegex COMPLETE', {
				elapsedMs: Date.now() - started
			});

			return results;
		} catch (error) {
			this.client.log('Points.getRegex FAILED', {
				elapsedMs: Date.now() - started,
				error:
					error instanceof Error
						? error.message
						: String(error)
			});

			throw error;
		}
	}
}
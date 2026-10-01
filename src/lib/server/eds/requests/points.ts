import type { ClientEdsSoap } from '../client-new';
import { formatIessTag } from '../helpers';
import { parseGetPointsResponse } from '../parsers/points';
import type { EdsPointTelemetry } from '../types';

export class Points {
	constructor(
		private readonly client: ClientEdsSoap
	) {}

	/**
	 * Fetch a single point from EDS.
	 *
	 * Returns the raw SOAP/XML response.
	 */
	public async getByIess(
		iessName: string
	): Promise<string> {
		const started = Date.now();

		this.client.log('Points.getByIess START', {
			iessName
		});

		const token = await this.client.auth.getToken();

		this.client.log('Points.getByIess authenticated', {
			iessName
		});

		const formattedTag = formatIessTag(
			iessName,
			this.client.iessSuffix
		);

		this.client.log('Points.getByIess formatted tag', {
			iessName,
			formattedTag
		});

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
	xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
	xmlns:tns="http://tt.com.pl/eds/">
	<soap:Body>
		<tns:getPoints>
			<tns:authString>${token}</tns:authString>
			<tns:filter>
				<tns:iessRe>${formattedTag}</tns:iessRe>
			</tns:filter>
		</tns:getPoints>
	</soap:Body>
</soap:Envelope>`;

		this.client.log('Points.getByIess sending request', {
			iessName,
			formattedTag,
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

			this.client.log('Points.getByIess response received', {
				iessName,
				status: response.status,
				statusText: response.statusText,
				ok: response.ok,
				elapsedMs: Date.now() - started
			});

			const xml = await response.text();

			this.client.log('Points.getByIess response body received', {
				iessName,
				length: xml.length
			});

			if (!response.ok) {
				throw new Error(
					`EDS getPoints failed: HTTP ${response.status} ${response.statusText}`
				);
			}

			this.client.log('Points.getByIess COMPLETE', {
				iessName,
				elapsedMs: Date.now() - started
			});

			return xml;
		} catch (error) {
			this.client.log('Points.getByIess FAILED', {
				iessName,
				elapsedMs: Date.now() - started,
				error:
					error instanceof Error
						? error.message
						: String(error)
			});

			throw error;
		}
	}

	/**
	 * Fetch multiple points concurrently.
	 *
	 * This preserves the behavior of the old client.
	 */
	public async getByIessList(
		iessNames: string[]
	): Promise<Record<string, string>> {
		const started = Date.now();

		this.client.log('Points.getByIessList START', {
			count: iessNames.length,
			iessNames
		});

		const results: Record<string, string> = {};

		const responses = await Promise.all(
			iessNames.map(async (name) => {
				try {
					const xml = await this.getByIess(name);

					return {
						name,
						xml
					};
				} catch (error) {
					console.warn(
						`[EDS] Failed fetching point ${name}:`,
						error
					);

					return {
						name,
						xml: ''
					};
				}
			})
		);

		for (const result of responses) {
			if (result.xml) {
				results[result.name] = result.xml;
			}
		}

		this.client.log('Points.getByIessList COMPLETE', {
			requested: iessNames.length,
			returned: Object.keys(results).length,
			elapsedMs: Date.now() - started
		});

		return results;
	}

	/**
	 * Fetch multiple points and parse each response.
	 */
	public async getByIessListParsed(
		iessNames: string[]
	): Promise<Record<string, EdsPointTelemetry>> {
		const started = Date.now();

		this.client.log(
			'Points.getByIessListParsed START',
			{
				count: iessNames.length,
				iessNames
			}
		);

		const rawResults =
			await this.getByIessList(iessNames);

		const results: Record<
			string,
			EdsPointTelemetry
		> = {};

		for (const xml of Object.values(rawResults)) {
			const parsed =
				parseGetPointsResponse(xml);

			for (const [key, point] of Object.entries(parsed)) {
				results[key] = point;
			}
		}

		this.client.log(
			'Points.getByIessListParsed COMPLETE',
			{
				requested: iessNames.length,
				rawResponses: Object.keys(rawResults).length,
				points: Object.keys(results).length,
				elapsedMs: Date.now() - started
			}
		);

		return results;
	}

	/**
	 * Fetch multiple points in a SINGLE SOAP request.
	 *
	 * This corresponds to the old client's getPoints().
	 */
	public async get(
		iessNames: string[]
	): Promise<Record<string, EdsPointTelemetry>> {
		const started = Date.now();

		if (iessNames.length === 0) {
			this.client.log(
				'Points.get called with empty list'
			);

			return {};
		}

		this.client.log('Points.get START', {
			count: iessNames.length,
			iessNames
		});

		const token =
			await this.client.auth.getToken();

		const formattedTags = iessNames.map(
			(name) =>
				formatIessTag(
					name,
					this.client.iessSuffix
				)
		);

		const regexPattern =
			`^(${formattedTags.join('|')})$`;

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
			<tns:maxCount>${iessNames.length}</tns:maxCount>
		</tns:getPoints>
	</soap:Body>
</soap:Envelope>`;

		this.client.log('Points.get sending request', {
			iessNames,
			formattedTags,
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

			this.client.log('Points.get response received', {
				status: response.status,
				statusText: response.statusText,
				ok: response.ok,
				elapsedMs: Date.now() - started
			});

			const xml = await response.text();

			this.client.log('Points.get response body received', {
				length: xml.length
			});

			if (!response.ok) {
				throw new Error(
					`EDS getPoints failed: HTTP ${response.status} ${response.statusText}`
				);
			}

			const results =
				parseGetPointsResponse(xml);

			this.client.log('Points.get COMPLETE', {
				points: Object.keys(results).length,
				keys: Object.keys(results),
				elapsedMs: Date.now() - started
			});

			return results;
		} catch (error) {
			this.client.log('Points.get FAILED', {
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
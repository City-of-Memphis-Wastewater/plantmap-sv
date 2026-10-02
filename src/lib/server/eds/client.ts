// client.ts

import type { EDSClientOptions, EDSTelemetryValue } from './types';
import { env } from '$env/dynamic/private';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface EdsPointTelemetry {
	sid: string;
	iess: string;
	idcs: string;
	description: string;
	units: string;
	value: number;
	quality: string;
	timestamp: string;
}

export class ClientEdsSoap {
	private endpoint: string;
	private iessSuffix: string;
	private timeoutMs: number;
	private username?: string;
	private password?: string;
	private debug: boolean;
	private authstring: string | null = null;

	constructor(options: EDSClientOptions = {}) {
		this.endpoint = options.endpoint || env.OVATION_EDS_ENDPOINT || 'http://000.00.0.000:00000';
		this.iessSuffix = options.iessSuffix ?? '.UNIT0@NET0';
		this.timeoutMs = options.timeoutMs ?? 10000;
		this.username = options.username || env.OVATION_EDS_USER;
		this.password = options.password || env.OVATION_EDS_PASSWORD;
		this.debug = env.OVATION_EDS_DEBUG === 'true' || options.wsdlUrl !== undefined;
	}

	private log(label: string, data: unknown) {
		if (this.debug) {
			console.log(
				`[EDS DEBUG] ${label}:`,
				typeof data === 'string' ? data : JSON.stringify(data, null, 2)
			);
		}
	}

	public async login(): Promise<string> {
		if (this.authstring) return this.authstring;
		if (!this.username) {
			this.log('Login', 'No credentials provided. Using ANONYMOUS_SESSION.');
			return (this.authstring = 'ANONYMOUS_SESSION');
		}

		const user = this.username ?? '';
		const pass = this.password ?? '';

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:login>
      <tns:username>${user}</tns:username>
      <tns:password>${pass}</tns:password>
      <tns:type>CLIENT-TYPE-DEFAULT</tns:type>
    </tns:login>
  </soap:Body>
</soap:Envelope>`;

		const response = await fetch(this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/login"'
			},
			body: soapEnvelope
		});

		const xmlText = await response.text();
		if (!response.ok) {
			throw new Error(`EDS Login failed: HTTP ${response.status} ${response.statusText}`);
		}

		const match =
			xmlText.match(
				/<(?:[a-zA-Z0-9]+:)?authString[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?authString>/i
			) || xmlText.match(/<(?:[a-zA-Z0-9]+:)?return[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?return>/i);

		if (!match) {
			throw new Error('Failed to extract authString from EDS login response');
		}

		this.authstring = match[1].trim();
		return this.authstring;
	}

	public async logout(): Promise<void> {
		if (!this.authstring || this.authstring === 'ANONYMOUS_SESSION') return;

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:logout>
      <authstring>${this.authstring}</authstring>
    </tns:logout>
  </soap:Body>
</soap:Envelope>`;

		try {
			await fetch(this.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type':
						'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/logout"'
				},
				body: soapEnvelope
			});
		} catch (err) {
			console.warn('[EDS] Error during logout:', err);
		} finally {
			this.authstring = null;
		}
	}

	public formatIessTag(id: string): string {
		const upper = id.toUpperCase();
		if (upper.includes('@') || upper.includes('.UNIT')) {
			return upper;
		}
		return `${upper}${this.iessSuffix}`;
	}

	// =========================================================================
	// 1. Point Telemetry & Metadata (`getPoints`)
	// =========================================================================

	/**
	 * Single point query returning raw XML.
	 */
	public async getPointsByIdcs(iessName: string): Promise<string> {
		const token = await this.login();
		const formattedTag = this.formatIessTag(iessName);

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getPoints>
      <tns:authString>${token}</tns:authString>
      <tns:filter>
        <tns:iessRe>${formattedTag}</tns:iessRe>
      </tns:filter>
    </tns:getPoints>
  </soap:Body>
</soap:Envelope>`;

		const response = await fetch(this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type':
					'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPoints"'
			},
			body: soapEnvelope
		});

		return await response.text();
	}

	/**
	 * Multi-tag fan-out querying getPointsByIdcs concurrently for an array of tags.
	 */
	public async getPointsByIdcsList(iessNames: string[]): Promise<Record<string, string>> {
		const results: Record<string, string> = {};

		const responses = await Promise.all(
			iessNames.map(async (name) => {
				try {
					const xml = await this.getPointsByIdcs(name);
					return { name, xml };
				} catch (err) {
					console.warn(`[EDS] Failed fetching point ${name}:`, err);
					return { name, xml: '' };
				}
			})
		);

		for (const res of responses) {
			if (res.xml) {
				results[res.name] = res.xml;
			}
		}

		return results;
	}

	public async getPointsByIdcsListParsed(
		iessNames: string[]
	): Promise<Record<string, EdsPointTelemetry>> {
		const rawResults = await this.getPointsByIdcsList(iessNames);
		const results: Record<string, EdsPointTelemetry> = {};

		for (const xml of Object.values(rawResults)) {
			const parsed = this.parseGetPointsResponse(xml);

			for (const [key, point] of Object.entries(parsed)) {
				results[key] = point;
			}
		}

		return results;
	}

	/**
	 * Batch queries telemetry for multiple tags in a SINGLE SOAP payload
	 * using regex OR pattern matching on iessRe.
	 */
	public async getPoints(iessNames: string[]): Promise<Record<string, EdsPointTelemetry>> {
		if (!iessNames.length) return {};

		const token = await this.login();
		const formattedTags = iessNames.map((name) => this.formatIessTag(name));
		const regexPattern = `^(${formattedTags.join('|')})$`;

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
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

		this.log('Outgoing getPoints Request', soapEnvelope);

		const response = await fetch(this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type':
					'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPoints"'
			},
			body: soapEnvelope
		});

		const xml = await response.text();
		this.log('Incoming getPoints Response', xml);

		return this.parseGetPointsResponse(xml);
	}

	// =========================================================================
	// 2. Historical Trend Data (`requestTabular`)
	// =========================================================================

	public async fetchTabularValues(
		sensorIds: string[],
		windowSeconds: number = 600,
		stepSeconds: number = 60,
		functionType: string = 'AVG'
	): Promise<Record<string, EDSTelemetryValue>> {
		if (sensorIds.length === 0) return {};

		const token = await this.login();
		const validTags = sensorIds.map((id) => this.formatIessTag(id));

		const now = Math.floor(Date.now() / 1000);
		const startTime = now - windowSeconds;
		const endTime = now;

		const itemsXml = validTags
			.map(
				(tag) => `
        <tns:item>
          <tns:pointId>
            <tns:iess>${tag}</tns:iess>
          </tns:pointId>
          <tns:shadePriority>0</tns:shadePriority>
          <tns:function>${functionType}</tns:function>
        </tns:item>`
			)
			.join('');

		const requestTabularEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:requestTabular>
      <tns:authString>${token}</tns:authString>
      <tns:request>
        <tns:period>
          <tns:from><tns:second>${startTime}</tns:second></tns:from>
          <tns:till><tns:second>${endTime}</tns:second></tns:till>
        </tns:period>
        <tns:step><tns:seconds>${stepSeconds}</tns:seconds></tns:step>
        <tns:items>${itemsXml}
        </tns:items>
      </tns:request>
    </tns:requestTabular>
  </soap:Body>
</soap:Envelope>`;

		// 1. Submit Request
		const reqResponse = await fetch(this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type':
					'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/requestTabular"'
			},
			body: requestTabularEnvelope
		});

		const reqXml = await reqResponse.text();
		const requestIdMatch =
			reqXml.match(/<(?:[a-zA-Z0-9]+:)?return[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?return>/i) ||
			reqXml.match(/<(?:[a-zA-Z0-9]+:)?requestId[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?requestId>/i);

		if (!requestIdMatch) {
			throw new Error(`Failed to submit tabular request: ${reqXml}`);
		}

		const requestId = requestIdMatch[1].trim();

		// 2. Poll Status
		let isReady = false;
		const maxPolls = 10;
		for (let i = 0; i < maxPolls; i++) {
			await new Promise((resolve) => setTimeout(resolve, 500));

			const statusEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getRequestStatus>
      <tns:authString>${token}</tns:authString>
      <tns:requestId>${requestId}</tns:requestId>
    </tns:getRequestStatus>
  </soap:Body>
</soap:Envelope>`;

			const statusResp = await fetch(this.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type':
						'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getRequestStatus"'
				},
				body: statusEnvelope
			});

			const statusXml = await statusResp.text();
			const statusMatch = statusXml.match(
				/<(?:[a-zA-Z0-9]+:)?status[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?status>/i
			);
			const status = statusMatch ? statusMatch[1].trim() : '';

			if (status === 'REQUEST-SUCCESS') {
				isReady = true;
				break;
			} else if (status === 'REQUEST-FAILURE') {
				throw new Error(`EDS Tabular Request Failed for requestId: ${requestId}`);
			}
		}

		if (!isReady) {
			throw new Error(`EDS Tabular Request timed out for requestId: ${requestId}`);
		}

		// 3. Retrieve Data
		const getTabularEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getTabular>
      <tns:authString>${token}</tns:authString>
      <tns:requestId>${requestId}</tns:requestId>
    </tns:getTabular>
  </soap:Body>
</soap:Envelope>`;

		const dataResp = await fetch(this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type':
					'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getTabular"'
			},
			body: getTabularEnvelope
		});

		const dataXml = await dataResp.text();
		return this.parseTabularResponse(dataXml, validTags);
	}

	// =========================================================================
	// Private Parsers
	// =========================================================================

	private parseGetPointsResponse(xml: string): Record<string, EdsPointTelemetry> {
		const results: Record<string, EdsPointTelemetry> = {};

		// Match individual point blocks (handles both prefixed <eds:points> and bare <points>)
		const pointsRegex = /<(?:[a-zA-Z0-9]+:)?points[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?points>/gi;
		let match: RegExpExecArray | null;

		while ((match = pointsRegex.exec(xml)) !== null) {
			const block = match[1];

			const sid =
				block.match(/<(?:[a-zA-Z0-9]+:)?sid>([^<]+)<\/(?:[a-zA-Z0-9]+:)?sid>/i)?.[1] ?? '';
			const iess =
				block.match(/<(?:[a-zA-Z0-9]+:)?iess>([^<]+)<\/(?:[a-zA-Z0-9]+:)?iess>/i)?.[1] ?? '';
			const idcs =
				block.match(/<(?:[a-zA-Z0-9]+:)?idcs>([^<]+)<\/(?:[a-zA-Z0-9]+:)?idcs>/i)?.[1] ?? '';
			const desc =
				block.match(/<(?:[a-zA-Z0-9]+:)?desc>([^<]+)<\/(?:[a-zA-Z0-9]+:)?desc>/i)?.[1] ?? '';
			const units =
				block.match(/<(?:[a-zA-Z0-9]+:)?un>([^<]+)<\/(?:[a-zA-Z0-9]+:)?un>/i)?.[1] ?? '';
			const quality =
				block.match(/<(?:[a-zA-Z0-9]+:)?quality>([^<]+)<\/(?:[a-zA-Z0-9]+:)?quality>/i)?.[1] ?? '';

			// Extract numeric value from analog (<eds:av>) or digital (<eds:dv>)
			const avMatch = block.match(/<(?:[a-zA-Z0-9]+:)?av>([^<]+)<\/(?:[a-zA-Z0-9]+:)?av>/i);
			const dvMatch = block.match(/<(?:[a-zA-Z0-9]+:)?dv>([^<]+)<\/(?:[a-zA-Z0-9]+:)?dv>/i);
			const rawValue = avMatch ? parseFloat(avMatch[1]) : dvMatch ? parseFloat(dvMatch[1]) : 0;

			// Parse timestamp from seconds epoch
			const tsMatch = block.match(
				/<(?:[a-zA-Z0-9]+:)?ts>\s*<(?:[a-zA-Z0-9]+:)?second>([^<]+)<\/(?:[a-zA-Z0-9]+:)?second>/i
			);
			const epochSec = tsMatch ? parseInt(tsMatch[1], 10) : 0;
			const timestamp =
				epochSec > 0 ? new Date(epochSec * 1000).toISOString() : new Date().toISOString();

			if (iess) {
				results[iess] = {
					sid,
					iess,
					idcs,
					description: desc,
					units,
					value: Number.isNaN(rawValue) ? 0 : rawValue,
					quality,
					timestamp
				};
			}
		}

		return results;
	}

	private parseTabularResponse(
		xml: string,
		requestedTags: string[]
	): Record<string, EDSTelemetryValue> {
		const results: Record<string, EDSTelemetryValue> = {};

		const pointsMatch = xml.match(/<pointsIds[^>]*>([\s\S]*?)<\/pointsIds>/gi) || [];
		const pointTags: string[] = [];

		for (const pBlock of pointsMatch) {
			const tagMatch =
				pBlock.match(/<iess[^>]*>([^<]+)<\/iess>/i) || pBlock.match(/<idcs[^>]*>([^<]+)<\/idcs>/i);
			if (tagMatch) {
				pointTags.push(tagMatch[1].trim().toUpperCase());
			}
		}

		const activeTags = pointTags.length > 0 ? pointTags : requestedTags;
		const rowBlocks =
			xml.match(/<rows[^>]*>([\s\S]*?)<\/rows>/gi) ||
			xml.match(/<TabularRow[^>]*>([\s\S]*?)<\/TabularRow>/gi) ||
			[];

		if (rowBlocks.length > 0) {
			const lastRow = rowBlocks[rowBlocks.length - 1];
			const tsMatch = lastRow.match(/<second[^>]*>([^<]+)<\/second>/i);
			const timestamp = tsMatch
				? new Date(parseInt(tsMatch[1], 10) * 1000).toISOString()
				: new Date().toISOString();

			const valueBlocks =
				lastRow.match(/<values[^>]*>([\s\S]*?)<\/values>/gi) ||
				lastRow.match(/<TabularValue[^>]*>([\s\S]*?)<\/TabularValue>/gi) ||
				[];

			valueBlocks.forEach((valBlock, idx) => {
				if (idx < activeTags.length) {
					const tag = activeTags[idx];
					const valMatch = valBlock.match(/<value[^>]*>([^<]+)<\/value>/i);
					const qualMatch = valBlock.match(/<quality[^>]*>([^<]+)<\/quality>/i);

					const rawVal = valMatch ? parseFloat(valMatch[1]) : 0;
					const qualityStr = qualMatch ? qualMatch[1].toUpperCase() : 'GOOD';

					results[tag] = {
						iessTag: tag,
						value: Number.isNaN(rawVal) ? 0 : rawVal,
						quality: qualityStr.includes('NONE') || qualityStr.includes('BAD') ? 'BAD' : 'GOOD',
						timestamp
					};
				}
			});
		}

		return results;
	}
}

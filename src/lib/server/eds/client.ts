import type { EDSClientOptions, EDSTelemetryValue } from './types';
import { env } from '$env/dynamic/private';

// Bypass self-signed certificate errors for local/plant industrial servers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
		this.timeoutMs = options.timeoutMs ?? 5000;
		this.username = options.username || env.OVATION_EDS_USER;
		this.password = options.password || env.OVATION_EDS_PASSWORD;
		this.debug = env.OVATION_EDS_DEBUG === 'true' || options.wsdlUrl !== undefined;
	}

	private log(label: string, data: unknown) {
		if (this.debug) {
			console.log(`[EDS DEBUG] ${label}:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
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
      <tns:password>********</tns:password>
	  <tns:type>CLIENT-TYPE-DEFAULT</tns:type>
    </tns:login>
  </soap:Body>
</soap:Envelope>`;


		// Actual request with real password
		const actualEnvelope = soapEnvelope.replace('<tns:password>********</tns:password>', `<tns:password>${pass}</tns:password>`);

		this.log('Final Outgoing Login Payload', soapEnvelope);
		this.log('Final Outgoing Login Payload', actualEnvelope);

		const response = await fetch(this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/login"'
			},
			body: actualEnvelope
		});

		const xmlText = await response.text();
		this.log('Incoming Login Response (`status: ' + response.status + '`)', xmlText);

		if (!response.ok) {
			throw new Error(`EDS Login failed: HTTP ${response.status} ${response.statusText}`);
		}

		const match = xmlText.match(/<loginResult[^>]*>([^<]+)<\/loginResult>/i) ||
		              xmlText.match(/<return[^>]*>([^<]+)<\/return>/i);

		if (!match) {
			throw new Error('Failed to extract session authstring from TT.com.pl EDS login response');
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

		this.log('Outgoing Logout Request', soapEnvelope);

		try {
			await fetch(this.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/logout"'
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
		if (id.includes('@') || id.includes('.UNIT')) {
			return id;
		}
		return `${id}${this.iessSuffix}`;
	}

	public async fetchCurrentValues(sensorIds: string[]): Promise<Record<string, EDSTelemetryValue>> {
		if (sensorIds.length === 0) return {};

		const token = await this.login();

		const tagToIdMap: Record<string, string> = {};
		const iessTags = sensorIds.length > 0 && sensorIds[0].includes('@') 
			? sensorIds 
			: sensorIds.map((id) => {
				const tag = this.formatIessTag(id);
				tagToIdMap[tag] = id;
				return tag;
			});

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getPointValues>
      <authstring>${token}</authstring>
      <pointNames>
        ${iessTags.map((tag) => `<string>${tag}</string>`).join('\n        ')}
      </pointNames>
    </tns:getPointValues>
  </soap:Body>
</soap:Envelope>`;

		this.log('Outgoing getPointValues Request', soapEnvelope);

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

		try {
			const response = await fetch(this.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPointValues"'
				},
				body: soapEnvelope,
				signal: controller.signal
			});

			this.log(`Incoming getPointValues Response status: ${response.status}`, '');

			if (!response.ok) {
				throw new Error(`EDS HTTP ${response.status}: ${response.statusText}`);
			}

			const xmlText = await response.text();
			this.log('Incoming getPointValues XML Body', xmlText);

			return this.parseSoapResponse(xmlText, tagToIdMap);
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private parseSoapResponse(xml: string, tagToIdMap: Record<string, string>): Record<string, EDSTelemetryValue> {
		const results: Record<string, EDSTelemetryValue> = {};
		const pointNodeRegex = /<(?:PointValue|item|point)[^>]*>([\s\S]*?)<\/(?:PointValue|item|point)>/g;
		let match: RegExpExecArray | null;

		while ((match = pointNodeRegex.exec(xml)) !== null) {
			const block = match[1];

			const nameMatch = block.match(/<PointName[^>]*>([^<]+)<\/PointName>/i) ||
			                 block.match(/<name[^>]*>([^<]+)<\/name>/i);
			const valMatch = block.match(/<Value[^>]*>([^<]+)<\/Value>/i) ||
			                 block.match(/<value[^>]*>([^<]+)<\/value>/i);
			const qualityMatch = block.match(/<Quality[^>]*>([^<]+)<\/Quality>/i) ||
			                     block.match(/<quality[^>]*>([^<]+)<\/quality>/i);

			if (nameMatch) {
				const returnedTag = nameMatch[1].trim();
				const sensorId = tagToIdMap[returnedTag] || returnedTag;
				const rawVal = valMatch ? parseFloat(valMatch[1]) : 0;
				const quality = qualityMatch ? qualityMatch[1].toUpperCase() : 'GOOD';

		results[sensorId] = {
					iessTag: returnedTag,
					value: Number.isNaN(rawVal) ? 0 : rawVal,
					quality: quality.includes('GOOD') || quality === '0' ? 'GOOD' : 'BAD',
					timestamp: new Date().toISOString()
				};
			}
		}

		this.log('Parsed Telemetry Results', results);
		return results;
	}
}
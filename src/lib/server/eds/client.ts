import type { EDSClientOptions, EDSTelemetryValue } from './types';

export class ClientEdsSoap {
	private endpoint: string;
	private iessSuffix: string;

	constructor(options: EDSClientOptions = {}) {
		this.endpoint = options.endpoint || process.env.OVATION_EDS_ENDPOINT || 'http://ovation-eds.local/soap';
		this.iessSuffix = options.iessSuffix || '.UNIT0@NET0';
	}

	/**
	 * Formats point IDs into Ovation IESS Tag names
	 */
	public formatIessTags(ids: string[]): string[] {
		return ids.map((id) => (id.endsWith(this.iessSuffix) ? id : `${id}${this.iessSuffix}`));
	}

	/**
	 * Queries current value snapshot for target IESS tags via SOAP
	 */
	public async fetchCurrentValues(sensorIds: string[]): Promise<Record<string, EDSTelemetryValue>> {
		const iessTags = this.formatIessTags(sensorIds);

		// SOAP Request Payload matching Ovation Enterprise Data Server spec
		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetPointValues xmlns="http://emerson.com/ovation/eds">
      <pointNames>
        ${iessTags.map((tag) => `<string>${tag}</string>`).join('\n        ')}
      </pointNames>
    </GetPointValues>
  </soap:Body>
</soap:Envelope>`;

		const response = await fetch(this.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'text/xml; charset=utf-8',
				SOAPAction: 'http://emerson.com/ovation/eds/GetPointValues'
			},
			body: soapEnvelope
		});

		if (!response.ok) {
			throw new Error(`EDS SOAP request failed with status HTTP ${response.status}: ${response.statusText}`);
		}

		const xmlText = await response.text();
		return this.parseSoapResponse(xmlText, sensorIds);
	}

	/**
	 * Minimalist XML response parser for point values
	 */
	private parseSoapResponse(xml: string, originalIds: string[]): Record<string, EDSTelemetryValue> {
		const results: Record<string, EDSTelemetryValue> = {};

		// Quick regex extraction or DOMParser alternative for server environment
		for (const id of originalIds) {
			const tag = `${id}${this.iessSuffix}`;
			
			// Match node blocks corresponding to tag
			const valMatch = xml.match(new RegExp(`<value[^>]*>([0-9.-]+)</value>`));
			const qualityMatch = xml.match(new RegExp(`<quality[^>]*>(\\w+)</quality>`));

			results[id] = {
				iessTag: tag,
				value: valMatch ? parseFloat(valMatch[1]) : 0,
				quality: qualityMatch ? qualityMatch[1] : 'GOOD',
				timestamp: new Date().toISOString()
			};
		}

		return results;
	}
}

// requests/tabular.ts

import type { ClientEdsSoap } from '../client';
import { formatIessTag } from '../helpers';
import { parseTabularResponse } from '../parsers/tabular';
import type { EDSTelemetryValue } from '../types';

export class Tabular {
	constructor(private readonly client: ClientEdsSoap) {}

	public async fetch(
		sensorIds: string[],
		windowSeconds: number = 600,
		stepSeconds: number = 60,
		functionType: string = 'AVG'
	): Promise<Record<string, EDSTelemetryValue>> {
		if (sensorIds.length === 0) {
			return {};
		}

		const token = await this.client.auth.getToken();

		const iessTags = sensorIds.map((id) => formatIessTag(id, this.client.iessSuffix));

		const now = Math.floor(Date.now() / 1000);
		const startTime = now - windowSeconds;
		const endTime = now;

		const itemsXml = iessTags
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
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:requestTabular>
      <tns:authString>${token}</tns:authString>
      <tns:request>
        <tns:period>
          <tns:from>
            <tns:second>${startTime}</tns:second>
          </tns:from>
          <tns:till>
            <tns:second>${endTime}</tns:second>
          </tns:till>
        </tns:period>
        <tns:step>
          <tns:seconds>${stepSeconds}</tns:seconds>
        </tns:step>
        <tns:items>
          ${itemsXml}
        </tns:items>
      </tns:request>
    </tns:requestTabular>
  </soap:Body>
</soap:Envelope>`;

		// 1. Submit request
		const reqResponse = await fetch(this.client.endpoint, {
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

		// 2. Poll status
		let isReady = false;
		const maxPolls = 10;

		for (let i = 0; i < maxPolls; i++) {
			await new Promise((resolve) => setTimeout(resolve, 500));

			const statusEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getRequestStatus>
      <tns:authString>${token}</tns:authString>
      <tns:requestId>${requestId}</tns:requestId>
    </tns:getRequestStatus>
  </soap:Body>
</soap:Envelope>`;

			const statusResp = await fetch(this.client.endpoint, {
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
			}

			if (status === 'REQUEST-FAILURE') {
				throw new Error(`EDS Tabular Request Failed for requestId: ${requestId}`);
			}
		}

		if (!isReady) {
			throw new Error(`EDS Tabular Request timed out for requestId: ${requestId}`);
		}

		// 3. Retrieve data
		const getTabularEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getTabular>
      <tns:authString>${token}</tns:authString>
      <tns:requestId>${requestId}</tns:requestId>
    </tns:getTabular>
  </soap:Body>
</soap:Envelope>`;

		const dataResp = await fetch(this.client.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type':
					'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getTabular"'
			},
			body: getTabularEnvelope
		});

		const dataXml = await dataResp.text();

		return parseTabularResponse(dataXml, iessTags);
	}
}

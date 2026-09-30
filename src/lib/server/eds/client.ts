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


		const match = xmlText.match(/<(?:[a-zA-Z0-9]+:)?authString[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?authString>/i) ||
		              xmlText.match(/<(?:[a-zA-Z0-9]+:)?loginResult[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?loginResult>/i) ||
		              xmlText.match(/<(?:[a-zA-Z0-9]+:)?return[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?return>/i);

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

	public async getPointsByIess(iessName: string): Promise<string> {
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
                'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPoints"'
            },
            body: soapEnvelope
        });

        return await response.text();
    }

	public async fetchPointValues(tags: string[]): Promise<any[]> {
        const token = await this.login();
        const results = [];

        for (const tag of tags) {
            const formattedTag = this.formatIessTag(tag);
            const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getPoints>
      <tns:authString>${token}</tns:authString>
      <tns:filter>
        <tns:iessRe>${formattedTag}</tns:iessRe>
      </tns:filter>
      <tns:maxCount>1</tns:maxCount>
    </tns:getPoints>
  </soap:Body>
</soap:Envelope>`;

            this.log('Outgoing getPoints Request (Single)', soapEnvelope);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPoints"'
                    },
                    body: soapEnvelope,
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`EDS HTTP ${response.status}: ${response.statusText}`);
                }

                const xmlText = await response.text();
                results.push({ tag: formattedTag, xml: xmlText });
            } finally {
                clearTimeout(timeoutId);
            }
        }

        return results;
    }

	public async fetchCurrentValues(sensorIds: string[]): Promise<Record<string, EDSTelemetryValue>> {
        if (sensorIds.length === 0) return {};

        const token = await this.login();
        const results: Record<string, EDSTelemetryValue> = {};

        for (const id of sensorIds) {
            const formattedTag = this.formatIessTag(id);
            
            const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getPoints>
      <tns:authString>${token}</tns:authString>
      <tns:filter>
        <tns:iessRe>${formattedTag}</tns:iessRe>
      </tns:filter>
      <tns:maxCount>1</tns:maxCount>
    </tns:getPoints>
  </soap:Body>
</soap:Envelope>`;

            this.log(`Outgoing getPoints Request for tag: ${formattedTag}`, soapEnvelope);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPoints"'
                    },
                    body: soapEnvelope,
                    signal: controller.signal
                });

                if (!response.ok) {
                    console.warn(`[EDS] HTTP ${response.status} for tag ${formattedTag}`);
                    continue;
                }

                const xmlText = await response.text();
                
                // Parse individual point response using your existing parser logic
                const parsed = this.parseSoapResponse(xmlText, { [formattedTag]: id });
                Object.assign(results, parsed);

            } catch (err) {
                console.warn(`[EDS] Error fetching tag ${formattedTag}:`, err);
            } finally {
                clearTimeout(timeoutId);
            }
        }

        this.log('Final Batch Telemetry Results', results);
        return results;
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

	public formatIessTag(id: string): string {
        const upper = id.toUpperCase();
        if (upper.includes('@') || upper.includes('.UNIT')) {
            return upper;
        }
        return `${upper}${this.iessSuffix}`;
    }

    /**
     * Verifies existence of IESS point names individually via getPoints.
     */
    public async filterValidPoints(tags: string[]): Promise<string[]> {
        const token = await this.login();
        const validTags: string[] = [];

        for (const tag of tags) {
            const formattedTag = this.formatIessTag(tag);
            const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:getPoints>
      <tns:authString>${token}</tns:authString>
      <tns:filter>
        <tns:iessRe>${formattedTag}</tns:iessRe>
      </tns:filter>
      <tns:maxCount>1</tns:maxCount>
    </tns:getPoints>
  </soap:Body>
</soap:Envelope>`;

            try {
                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPoints"'
                    },
                    body: soapEnvelope
                });

                if (response.ok) {
                    const xmlText = await response.text();
                    const matchCountMatch = xmlText.match(/<(?:[a-zA-Z0-9]+:)?matchCount[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?matchCount>/i);
                    if (matchCountMatch && parseInt(matchCountMatch[1], 10) === 1) {
                        validTags.push(formattedTag);
                    }
                }
            } catch (err) {
                console.warn(`[EDS] Failed point verification for ${formattedTag}:`, err);
            }
        }

        return validTags;
    }

    /**
     * Executes the full requestTabular -> getRequestStatus -> getTabular sequence.
     */
    public async fetchTabularValues(
        sensorIds: string[],
        stepSeconds: number = 60,
        functionType: string = 'AVG'
    ): Promise<Record<string, EDSTelemetryValue>> {
        if (sensorIds.length === 0) return {};

        const token = await this.login();
        const validTags = await this.filterValidPoints(sensorIds);

        if (validTags.length === 0) {
            this.log('Tabular Request', 'No valid points found to query.');
            return {};
        }

        const now = Math.floor(Date.now() / 1000);
        const startTime = now - 600; // Last 10 minutes
        const endTime = now;

        const itemsXml = validTags.map((tag) => `
        <tns:item>
          <tns:pointId>
            <tns:iess>${tag}</tns:iess>
          </tns:pointId>
          <tns:shadePriority>0</tns:shadePriority>
          <tns:function>${functionType}</tns:function>
        </tns:item>`).join('');

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

        this.log('Outgoing requestTabular Payload', requestTabularEnvelope);

        // 1. Submit Tabular Request
        const reqResponse = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/requestTabular"'
            },
            body: requestTabularEnvelope
        });

        const reqXml = await reqResponse.text();
        const requestIdMatch = reqXml.match(/<(?:[a-zA-Z0-9]+:)?return[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?return>/i) ||
                               reqXml.match(/<(?:[a-zA-Z0-9]+:)?requestId[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?requestId>/i);

        if (!requestIdMatch) {
            throw new Error(`Failed to submit tabular request: ${reqXml}`);
        }

        const requestId = requestIdMatch[1].trim();
        this.log('Tabular Request Submitted', { requestId });

        // 2. Poll Status until REQUEST-SUCCESS
        let isReady = false;
        const maxPolls = 10;
        for (let i = 0; i < maxPolls; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));

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
                    'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getRequestStatus"'
                },
                body: statusEnvelope
            });

            const statusXml = await statusResp.text();
            const statusMatch = statusXml.match(/<(?:[a-zA-Z0-9]+:)?status[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?status>/i);
            const status = statusMatch ? statusMatch[1].trim() : '';

            this.log(`Poll Status [${i + 1}/${maxPolls}]`, status);

            if (status === 'REQUEST-SUCCESS') {
                isReady = true;
                break;
            } else if (status === 'REQUEST-FAILURE') {
                throw new Error(`EDS Tabular Request Failed for requestId: ${requestId}`);
            }
        }

        if (!isReady) {
            throw new Error(`EDS Tabular Request timed out waiting for ready state (requestId: ${requestId})`);
        }

        // 3. Fetch Tabular Data
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
                'Content-Type': 'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getTabular"'
            },
            body: getTabularEnvelope
        });

        const dataXml = await dataResp.text();
        this.log('Incoming getTabular XML Response', dataXml);

        return this.parseTabularResponse(dataXml, validTags);
    }

    private parseTabularResponse(xml: string, requestedTags: string[]): Record<string, EDSTelemetryValue> {
        const results: Record<string, EDSTelemetryValue> = {};

        // Extract points metadata array to match column ordering
        const pointsMatch = xml.match(/<pointsIds[^>]*>([\s\S]*?)<\/pointsIds>/gi) || [];
        const pointTags: string[] = [];

        for (const pBlock of pointsMatch) {
            const tagMatch = pBlock.match(/<iess[^>]*>([^<]+)<\/iess>/i) ||
                             pBlock.match(/<idcs[^>]*>([^<]+)<\/idcs>/i);
            if (tagMatch) {
                pointTags.push(tagMatch[1].trim().toUpperCase());
            }
        }

        // Fallback to input order if XML header tags weren't resolved
        const activeTags = pointTags.length > 0 ? pointTags : requestedTags;

        // Parse last row of values table for latest snapshot
        const rowBlocks = xml.match(/<rows[^>]*>([\s\S]*?)<\/rows>/gi) ||
                          xml.match(/<TabularRow[^>]*>([\s\S]*?)<\/TabularRow>/gi) || [];

        if (rowBlocks.length > 0) {
            const lastRow = rowBlocks[rowBlocks.length - 1];
            const tsMatch = lastRow.match(/<second[^>]*>([^<]+)<\/second>/i);
            const timestamp = tsMatch ? new Date(parseInt(tsMatch[1], 10) * 1000).toISOString() : new Date().toISOString();

            const valueBlocks = lastRow.match(/<values[^>]*>([\s\S]*?)<\/values>/gi) ||
                                lastRow.match(/<TabularValue[^>]*>([\s\S]*?)<\/TabularValue>/gi) || [];

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
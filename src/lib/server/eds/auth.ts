// server/eds/auth.ts
import type { ClientEdsSoap } from './client'; // only for typing

export class Auth {
	private client: ClientEdsSoap;
	private authstring: string | null = null;

	constructor(client: ClientEdsSoap) {
		this.client = client;
	}

	public async login(): Promise<string> {
		if (this.authstring) {
			return this.authstring;
		}

		if (!this.client.username) {
			this.client.log('Login', 'No credentials provided. Using ANONYMOUS_SESSION.');

			this.authstring = 'ANONYMOUS_SESSION';
			return this.authstring;
		}

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:login>
      <tns:username>${this.client.username}</tns:username>
      <tns:password>${this.client.password ?? ''}</tns:password>
      <tns:type>CLIENT-TYPE-DEFAULT</tns:type>
    </tns:login>
  </soap:Body>
</soap:Envelope>`;

		const response = await fetch(this.client.endpoint, {
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
		if (!this.authstring || this.authstring === 'ANONYMOUS_SESSION') {
			return;
		}

		const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:tns="http://tt.com.pl/eds/">
  <soap:Body>
    <tns:logout>
      <authstring>${this.authstring}</authstring>
    </tns:logout>
  </soap:Body>
</soap:Envelope>`;

		try {
			await fetch(this.client.endpoint, {
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

	public async getToken(): Promise<string> {
		return this.login();
	}
}

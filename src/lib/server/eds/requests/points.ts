import type { ClientEdsSoap } from '../client';
import { formatIessTag } from '../helpers';

export class Points {
    constructor(private readonly client: ClientEdsSoap) {}

    public async getByIess(iessName: string): Promise<string> {
        const token = await this.client.auth.getToken();
        const formattedTag = formatIessTag(
            iessName,
            this.client.iessSuffix
        );

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

        const response = await fetch(this.client.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type':
                    'application/soap+xml; charset=utf-8; action="http://tt.com.pl/eds/getPoints"'
            },
            body: soapEnvelope
        });

        return response.text();
    }

    // getByIessList()
    // get()
}

import { describe, expect, it } from 'vitest';
import { 
    getEmailCreds,
    VAULT_SENDER_ADDRESS_ITEM,
    VAULT_PASSWORD_ITEM 
} from './settings.ts';

describe('getEmailCreds', () => {
	it('returns an object containing email_address and password', () => {
		const creds = getEmailCreds();

		expect(creds).toHaveProperty(VAULT_SENDER_ADDRESS_ITEM);
		expect(creds).toHaveProperty(VAULT_PASSWORD_ITEM);
	});
});

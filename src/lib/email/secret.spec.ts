import { describe, expect, it } from 'vitest';
import { getEmailCreds } from './settings.ts';

describe('getEmailCreds', () => {
	it('returns an object containing email_address and password', () => {
		const creds = getEmailCreds();

		expect(creds).toHaveProperty('sender_email_address');
		expect(creds).toHaveProperty('sender_password');
	});
});

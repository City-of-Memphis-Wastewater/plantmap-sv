import { describe, expect, it } from 'vitest';
import { getEmailCreds } from './secret';

describe('getEmailCreds', () => {
	it('returns an object containing email_address and password', () => {
		const creds = getEmailCreds();

		expect(creds).toHaveProperty('email_address');
		expect(creds).toHaveProperty('password');
	});
});

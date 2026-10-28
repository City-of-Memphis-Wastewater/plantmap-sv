import { bootstrapPlantMapSecret } from '$lib/plantmap-sv/bootstrap';

export interface EmailCredentials {
    email_address: string;
    password: string;
}

export function getEmailCreds(): EmailCredentials {
    const secret = bootstrapPlantMapSecret();

    const email_address = secret.value('gmail-smtp', 'email-address');
    const password = secret.value('gmail-smtp', 'app-password');

    return { email_address, password };

}

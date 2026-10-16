// scripts/setup-creds.js

import {
	bootstrapPlantMapEnv,
	bootstrapPlantMapConfig,
	bootstrapPlantMapSecret
} from '../src/lib/plantmap-sv/bootstrap.ts';

const env = bootstrapPlantMapEnv();
const config = bootstrapPlantMapConfig();
const secret = bootstrapPlantMapSecret();

function requiredInteger(name) {
	//const value = env.requiredValue(name);
	const value = env.value(name);
	const parsed = Number(value);

	if (!Number.isInteger(parsed)) {
		throw new Error(`${name} must be an integer`);
	}

	return parsed;
}

function requiredBoolean(name) {
	//const value = env.requiredValue(name).toLowerCase();
    const value = env.value(name).toLowerCase();

	if (!['true', 'false'].includes(value)) {
		throw new Error(`${name} must be true or false`);
	}

	return value === 'true';
}

// EDS configuration
config.setValue('eds', 'host', env.requiredValue('EDS_HOST'));
config.setValue('eds', 'protocol', env.requiredValue('EDS_PROTOCOL'));
config.setValue('eds', 'soapPort', requiredInteger('EDS_SOAP_PORT'));
config.setValue('eds', 'iessSuffix', env.requiredValue('EDS_IESS_SUFFIX'));
config.setValue('eds', 'debug', requiredBoolean('EDS_DEBUG'));

// Server configuration
config.setValue('devServer', 'port', requiredInteger('DEV_SERVER_PORT'));
config.setValue('prodServer', 'port', requiredInteger('PROD_SERVER_PORT'));

// EDS credentials
secret.initializeVault();
secret.setValue('eds', 'username', env.requiredValue('EDS_USERNAME'));
secret.setValue('eds', 'password', env.requiredValue('EDS_PASSWORD'));

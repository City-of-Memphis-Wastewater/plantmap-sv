// scripts/setup.js

import { MemphisEnv, bootstrapPlantMapConfig, bootstrapPlantMapSecret } from '../src/lib/plantmap/bootrap.ts'

const env = new MemphisEnv();
const config = bootstrapPlantMapConfig();
const secret = bootstrapPlantMapSecret();

config.setValue('eds', 'host', env.requiredValue('EDS_HOST'));
config.setValue('eds', 'protocol', env.requiredValue('EDS_PROTOCOL'));
config.setValue('eds', 'soapPort', env.requiredValue('EDS_SOAP_PORT'));
config.setValue('eds', 'iessSuffix', env.requiredValue('EDS_IESS_SUFFIX'));
config.setValue('eds', 'debug', env.requiredValue('EDS_DEBUG'));
config.setValue('devServer', 'port', env.requiredValue('DEV_SERVER_PORT'));
config.setValue('prodServer', 'port', env.requiredValue('PROD_SERVER_PORT'));

secret.initializeVault();
secret.setValue('eds', 'username', env.requiredValue('EDS_USERNAME'));
secret.setValue('eds', 'password', env.requiredValue('EDS_PASSWORD'));

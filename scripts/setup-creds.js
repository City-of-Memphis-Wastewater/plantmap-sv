// scripts/setup.js

import { 
    MemphisEnv,
    bootstrapPlantMapConfig, 
    bootstrapPlantMapSecret,
} from 'memphis-settings';

const env = new MemphisEnv();
const config = bootstrapPlantMapConfig();
const secret = bootstrapPlantMapSecret();

config.setValue('eds', 'host', env.requiredValue('EDS_HOST'));
config.setValue('server', 'port', env.requiredValue('SERVER_PORT'));

secret.initializeVault();
secret.setValue('eds', 'username', env.requiredValue('EDS_USERNAME'));
secret.setValue('eds', 'password', env.requiredValue('EDS_PASSWORD'));

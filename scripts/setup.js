// scripts/setup.js

import { MemphisEnv } from '../src/lib/memphis-env.ts';
import {
        bootstrapPlantMapConfig,
        bootstrapPlantMapSecret
} from '../src/lib/plantmap/bootstrap.ts';

const env = new MemphisEnv();
const config = bootstrapPlantMapConfig();
const secret = bootstrapPlantMapSecret();

config.setValue('eds.host', env.requireValue('EDS_HOST'));
config.setValue('server.port', env.requireValue('SERVER_PORT'));

secret.setValue('eds.username', env.requireValue('EDS_USERNAME'));
secret.setValue('eds.password', env.requireValue('EDS_PASSWORD'));

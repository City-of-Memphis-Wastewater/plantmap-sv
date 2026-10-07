// src/lib/cli/secret.ts

import os from 'node:os';
import path from 'node:path';

import { MemphisSecret } from '../memphis-secret/index.ts';

export function secret() {
        const appDir = path.join(os.homedir(), '.plantmap');

        const secrets = new MemphisSecret({
                appDir
        });

        for (const credential of secrets.list()) {
                console.log(`${credential.service}/${credential.item}`);
        }
}

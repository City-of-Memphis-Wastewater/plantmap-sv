import os from 'node:os';
import path from 'node:path';

import { MemphisEnv } from './index.ts';

export function bootstrapMemphisEnv(appName: string): MemphisEnv {
    const appDir = path.join(os.homedir(), `.${appName}`);

    return new MemphisEnv({
        appDir
    });
}

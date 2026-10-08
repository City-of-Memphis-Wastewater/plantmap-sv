import os from 'node:os';
import path from 'node:path';

import { MemphisSecret } from './index.ts';

export function bootstrapMemphisSecret(appName: string): MemphisSecret {
	const appDir = path.join(os.homedir(), `.${appName}`);

	return new MemphisSecret({
		appDir
	});
}

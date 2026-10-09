import os from 'node:os';
import path from 'node:path';

import { MemphisConfig } from './index.ts';

export function bootstrapMemphisConfig(appName: string): MemphisConfig {
	const appDir = path.join(os.homedir(), `.${appName}`);

	return new MemphisConfig({
		appDir
	});
}

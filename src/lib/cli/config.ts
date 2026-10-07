import os from 'node:os';
import path from 'node:path';

import { MemphisConfig } from '../memphis-config/index.ts';

export function config() {
	const appDir = path.join(os.homedir(), '.plantmap');
	const values = new MemphisConfig({ appDir });

	for (const item of values.list()) {
		console.log(`${item.key}=${item.value}`);
	}
}

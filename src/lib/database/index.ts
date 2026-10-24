//

import { ensureLocalDatabase } from './build.ts';
import { cacheToLocalDatabase } from './crud.ts'; 
import type { DatabasePayload } from 'types.ts';


export const VALID_MINUTE_INT_LIST = [0, 15, 30, 45] as const;

export const DATABASE_PATH = Path.home() / ".plantmap-sv/db/local.sqlite"

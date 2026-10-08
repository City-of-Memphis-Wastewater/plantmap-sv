// the standard approach is for .env to be in root

import { MemphisEnv } from './index.ts';

export function bootstrapMemphisEnv(): MemphisEnv {
    return new MemphisEnv();
}

/* 
import { bootstrapMemphisEnv } from 'memphis-env/bootstrap';
*/

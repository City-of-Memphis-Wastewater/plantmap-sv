import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MemphisSecret } from './index.ts';

const appDir = mkdtempSync(
    path.join(os.tmpdir(), 'memphis-secret-')
);

console.log(`Test directory: ${appDir}`);

try {
    const secret = new MemphisSecret({ appDir });

    console.log('\n--- initialize ---');
    secret.initializeVault();

    console.log('\n--- set ---');
    secret.setValue(
        'ovation',
        'username',
        'clayton'
    );

    secret.setValue(
        'ovation',
        'password',
        'super-secret'
    );

    console.log('\n--- get ---');
    console.log(
        'username:',
        secret.value('ovation', 'username')
    );

    console.log(
        'password:',
        secret.value('ovation', 'password')
    );

    console.log('\n--- overwrite false ---');

    try {
        secret.setValue(
            'ovation',
            'password',
            'different',
            { overwrite: false }
        );
    } catch (error) {
        console.log(
            error instanceof Error
                ? error.message
                : error
        );
    }

    console.log('\n--- remove ---');

    console.log(
        'removed:',
        secret.remove('ovation', 'password')
    );

    console.log(
        'password:',
        secret.value('ovation', 'password')
    );

    console.log('\n--- missing vault ---');

    const missing = new MemphisSecret({
        appDir: path.join(appDir, 'missing'),
    });

    try {
        missing.setValue(
            'test',
            'value',
            'should fail'
        );
    } catch (error) {
        console.log(
            error instanceof Error
                ? error.message
                : error
        );
    }
} finally {
    rmSync(appDir, {
        recursive: true,
        force: true,
    });
}

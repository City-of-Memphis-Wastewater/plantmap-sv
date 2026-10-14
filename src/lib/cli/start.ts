// src/lib/cli/start.ts

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bootstrapPlantMapConfig } from '../plantmap/bootstrap.ts';
import { loadPlantMapConfig } from '../plantmap/config.ts';

const projectDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../..'
);

export function start(args: string[] = []) {
    //let port = process.env.PORT ?? '4000';
    const config = bootstrapPlantMapConfig();
    const plantMapConfig = loadPlantMapConfig(config);

    let port = process.env.PORT ?? String(plantMapConfig.prodServer.port);
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--port') {
            const value = args[++i];

            if (!value || !/^\d+$/.test(value) ||
                Number(value) < 1 || Number(value) > 65535) {
                console.error('Invalid port. Expected an integer from 1 to 65535.');
                process.exitCode = 1;
                return;
            }

            port = value;
        } else {
            console.error(`Unknown start option: ${args[i]}`);
            process.exitCode = 1;
            return;
        }
    }

    const child = spawn(process.execPath, [path.join(projectDir, 'build/index.js')], {
        cwd: projectDir,
        env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: port,
        },
        stdio: 'inherit',
    });

    child.on('error', (error) => {
        console.error(`Failed to start PlantMap: ${error.message}`);
        process.exitCode = 1;
    });

    child.on('exit', (code) => {
        process.exitCode = code ?? 1;
    });
}

// cli/index.ts
import { setup } from './setup';

export async function runCli(command: string) {
    switch (command) {
        case 'setup':
            return setup();

        case 'config':
            return config();

        default:
            throw new Error(`Unknown command: ${command}`);
    }
}

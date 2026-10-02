// cli/setup.ts
import { input, password, confirm, number } from '@inquirer/prompts';
export async function setup() {
    //const endpoint = await input({
    //   message: 'Ovation EDS endpoint:',
    //    default: 'http://127.0.0.1:43080'
    //});

    const baseUrl = await input({
        message: 'Ovation EDS endpoint baseUrl:',
        default: 'http://127.0.0.1'
    });

    const port = await number({
        message: 'Ovation EDS endpoint port:',
        default: 43080
    });

    const username = await input({
        message: 'Ovation EDS username:'
    });

    const edsPassword = await password({
        message: 'Ovation EDS password:'
    });

    const suffix = await input({
        message: 'Ovation EDS suffix:',
        default: '.UNIT0@NET0'
    });

    const debug = await confirm({
        message: 'Enable EDS debugging?',
        default: false
    });

    // save later
}

import { spawn } from 'node:child_process';
import process from 'node:process';

export function openUrl(url: string): void {
	let commands: Array<{ command: string; args: string[] }>;

	if (process.env.TERMUX_VERSION) {
		commands = [
			{ command: 'termux-open-url', args: [url] },
			{ command: 'xdg-open', args: [url] }
		];
	} else if (process.platform === 'darwin') {
		commands = [{ command: 'open', args: [url] }];
	} else if (process.platform === 'win32') {
		commands = [{ command: 'cmd.exe', args: ['/c', 'start', '', url] }];
	} else {
		commands = [{ command: 'xdg-open', args: [url] }];
	}

	const tryCommand = (index: number): void => {
		const entry = commands[index];

		if (!entry) {
			console.error('Could not launch a browser. Open this URL manually:\n' + url);
			return;
		}

		const child = spawn(entry.command, entry.args, {
			detached: true,
			stdio: 'ignore'
		});

		child.once('error', () => {
			tryCommand(index + 1);
		});

		child.once('spawn', () => {
			child.unref();
		});
	};

	tryCommand(0);
}

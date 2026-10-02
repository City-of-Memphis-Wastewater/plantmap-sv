#!/usr/bin/env node

console.log('PlantMap');

import { spawnSync } from 'node:child_process';

const command = process.argv[2] ?? 'help';

const commands = {
	dev: ['run', 'dev'],
	build: ['run', 'build'],
	preview: ['run', 'preview'],
	check: ['run', 'check'],
	lint: ['run', 'lint'],
	test: ['run', 'test']
};

if (command === 'help') {
	console.log(`
PlantMap

Usage:
  plantmap <command>

Commands:
  dev       Start the development server
  build     Build the application
  preview   Preview the production build
  check     Run Svelte checks
  lint      Run linting
  test      Run tests
`);
	process.exit(0);
}

if (!(command in commands)) {
	console.error(`Unknown command: ${command}`);
	process.exit(1);
}

const result = spawnSync('npm', commands[command], {
	stdio: 'inherit',
	shell: false
});

process.exit(result.status ?? 1);

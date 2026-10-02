#!/usr/bin/env node

const command = process.argv[2] ?? 'help';

const { runCli } = await import('../src/lib/cli/index.ts');

await runCli(command);

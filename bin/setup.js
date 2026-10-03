#!/usr/bin/env node

const { runCli } = await import('../src/lib/cli/index.ts');

await runCli('setup');

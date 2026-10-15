import fs from 'node:fs';
import path from 'node:path';

const directories = ['Workers', 'ThirdParty', 'Assets', 'Widgets'];

const source = path.resolve('node_modules/cesium/Build/Cesium');
const output = path.resolve('build/client/cesium');

let failed = false;

for (const directory of directories) {
	for (const [label, root] of [
		['source', source],
		['build', output]
	]) {
		const target = path.join(root, directory);

		if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
			console.error(`Missing Cesium ${label} directory: ${target}`);
			failed = true;
		}
	}
}

if (failed) {
	process.exitCode = 1;
} else {
	console.log('Cesium asset directories verified.');
}

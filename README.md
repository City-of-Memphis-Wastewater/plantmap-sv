# plantmap-sv

A Cesium-based Svelte map app for visualizing geolocated live data from the Emerson Ovation EDS SOAP API.

## Setup

Setup config and secret values via CLI prompt, using `memphis-config` and `memphis-secret` libraries.

```bash
git clone https://github.com/City-of-Memphis-Wastewater/plantmap-sv.git
cd plantmap-sv
npm install
npm link
npx plantmap-sv setup
```

## Development

Run the SvelteKit development server:

```bash
npm run dev
```

## Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
node build
```

The production server listens on the port configured by the SvelteKit/Node adapter.

## Cesium Assets

The Windows setup script copies the Cesium distribution into "static/cesium":

```pwsh
scripts/copy-cesium.ps1
```

The privileged Windows setup script runs the complete setup sequence:

```pwsh
scripts/setup-priveleged.cmd
```

This installs dependencies, copies the Cesium assets, and runs the application setup script.

### Bun

Bun may also be used as an alternative JavaScript runtime/package manager where available.

```bash
bun install
bun link plantmap-sv
bunx plantmap-sv setup
bun run dev
```

The application does not require Bun.

## Source

https://github.com/City-of-Memphis-Wastewater/plantmap-sv

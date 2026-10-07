# plantmap-sv

A Cesium-based Svelte map app for visualizing geolocated live data from the Emerson Ovation EDS SOAP API.

## Setup

Setup config values via CLI prompt, using memphis-config.

```bash
git clone https://github.com/City-of-Memphis-Wastewater/plantmap-sv.git
cd plantmap-sv
```

### Running with Bun

```bash
bun install
bun link plantmap-sv
bunx plantmap-sv setup
```

### Running on Termux and Other Platforms Without Bun

```bash
npm install
npm link plantmap-sv
npx plantmap-sv setup
```

## Run, Dev

Bun entry point.

```bash
bun run dev
```

Cross-platform approach, like for Termux.

```bash
npm run dev
```

## Source

https://github.com/City-of-Memphis-Wastewater/plantmap-sv

# plantmap-sv

A Cesium-based Svelte map app for visualizing geolocated live data from the Emerson Ovation EDS SOAP API.

## Setup

Setup config values via CLI prompt, using memphis-config.

```bash
git clone https://github.com/City-of-Memphis-Wastewater/plantmap-sv.git
cd plantmap-sv
```

### Running, Standard Approach, with Bun

```bash
bun install
bun run setup
```

### Running on Termux and Other Platforms Without Bun

```bash
npm install
npm run setup
```

## Run

Recommended entry point.

```bash
bun run dev
```

Cross-platform approach, like for Termux.

```bash
npm run dev
```

## Local CLI Installation

Use the `plantmap-sv` CLI, like to call `plantmap-sv setup`.

```bash
bun link plantmap-sv
```

## Source

https://github.com/City-of-Memphis-Wastewater/plantmap-sv

# plantmap-sv

A Cesium-based Svelte map app for visualizing geolocated live data from the Emerson Ovation EDS SOAP API.

City of Memphis Wastewater is now self-hosting an instance of plantmap-sv, for T.E Maxson Wastewater Treatment Facility.

Instead of blocky, proprietary SCADA graphics that are limited to a few expensive workstations, we can now give operators something intuitive that they can see on their phones and laptops.

Emerson Ovation users, notice that the project is free, open-source, permissively licensed, and configurable.

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

Bun may also be used as an alternative JavaScript runtime/package manager where available.

The application does not require Bun.

## Dependencies

- cesium
- memphis-settings: https://github.com/City-of-Memphis-Wastewater/memphis-settings
- three
- three-geo
- proj4
- zod

## Screenshot

Self-hosted and configured instance of `plantmap-sv` for T.E. Maxson Wastewater Treatment Plant in Memphis, Tennessee

<p align="center">
<img src="https://raw.githubusercontent.com/City-of-Memphis-Wastewater/plantmap-sv/main/assets/plantmap-sv-v0.0.08-maxson.png" width="900">
</p>

## Source

https://github.com/City-of-Memphis-Wastewater/plantmap-sv

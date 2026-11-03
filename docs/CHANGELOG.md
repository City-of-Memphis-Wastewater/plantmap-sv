# Changelog

All notable changes to this project will be documented in this file.

The format is (read: strives to be) based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.0.7] – 2026-11-02

### Added:

- appServer.host is now configured, but the only use case is for the probe. Because whenyou set this thing up on a machine as self-hosted, it doesn't need to know it's own url. Ergo, the only use case is for 'npx plantmap-sv' CLI commands status, download, and plot, which use src/lib/status/probe.ts:discoverServer() to first check for sa local server and then for the configured appServer host.
- Email settings are now configured in the 'npx plantmap-sv setup' CLI experience, and retained in the relevant config and secret files.

---

## [0.0.6] – 2026-10-29

### Added:

- Plotting, download, cli, status, and tabular requests.
- Plotting Hover HUD, independent with pipeline-eds style CLI call, and in map view on hover.
- Hover telemetry calls data from cached database.
- Email functionality tested, ready to link to cli or curl call download for external transmission.

### Internal:

- Telemetry HUD needs a vertical scrollbar, and for the minimization key to possibly be lower and unmoving.
- We need text size adjustment, and possibly roll controls.

---

## [0.0.5] – 2026-10-15

### Changed:

- Increase memphis-settings to v0.0.8, to use MemphisEnv.requireValue()
- Copy cesium assets in run dev and run build calls, namely targeted at Windows pathing gaps. `node scripts/copy-cesium.mjs`.

---

## [0.0.4] – 2026-10-08

### Changed:

- Polling restructure to keep client instance and not log out for every call.

### Added:

- hook entry point
- bootstrappers for memphis-config, memphis-secret, and memphis-env
- memphis-secret machination, to replace memphis-env usage

---

## [0.0.3] – 2026-10-07

### Changed:

- memphis-secret is now in service.
- plantmap-sv CLI now supports config and secret listing.

---

## [0.0.2] – 2026-10-06

### Changed:

- Linted successfully.
- Exposed plantmap-sv CLI entry

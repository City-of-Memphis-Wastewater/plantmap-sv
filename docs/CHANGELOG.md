# Changelog

All notable changes to this project will be documented in this file.

The format is (read: strives to be) based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

- Telemetry HUD needs a vertical scrollbar, and for the minimization key to possibly be lower and unmoving.
- We need text size adjustment, and possibly roll controls.
- Plotting HUD, independent with pipeline-eds style CLI call, and in map view on hover, and in separate panel.

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

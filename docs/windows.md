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

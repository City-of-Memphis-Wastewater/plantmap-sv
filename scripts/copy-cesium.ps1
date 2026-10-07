$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "node_modules\cesium\Build\Cesium"
$Destination = Join-Path $Root "static\cesium"

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Cesium build directory not found: $Source"
}

if (Test-Path -LiteralPath $Destination) {
    throw "Destination already exists: $Destination`nRemove it manually before copying Cesium assets."
}

Copy-Item -LiteralPath $Source -Destination $Destination -Recurse

Write-Host "Copied Cesium assets:"
Write-Host "  from: $Source"
Write-Host "  to:   $Destination"

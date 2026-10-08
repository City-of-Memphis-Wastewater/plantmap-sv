param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "node_modules\cesium\Build\Cesium"
$Destination = Join-Path $Root "static\cesium"

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Cesium build directory not found: $Source"
}

if (Test-Path -LiteralPath $Destination) {
    if (-not $Force) {
        throw "Destination already exists: $Destination`nRemove it manually or rerun with -Force."
    }

    Remove-Item -LiteralPath $Destination -Recurse -Force
}

Copy-Item -LiteralPath $Source -Destination $Destination -Recurse

Write-Host "Copied Cesium assets:"
Write-Host "  from: $Source"
Write-Host "  to:   $Destination"

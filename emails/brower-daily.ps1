
$ErrorActionPreference = "Stop"

$AppDir = Join-Path $HOME ".plantmap-sv"
$ExportDir = Join-Path $AppDir "export"
$RepoDir = Split-Path $PSScriptRoot -Parent
$QueryFile = Join-Path $RepoDir "queries/presson-daily-tags.txt"

New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null

Set-Location $RepoDir

function Invoke-PlantMap {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    & npx @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "PlantMap command failed with exit code $LASTEXITCODE"
    }
}

Write-Host "Retrieving email recipients..."

$EmailList = & npx memphis-settings `
    --app-dir $AppDir `
    config get email-recipient list-4

if ($LASTEXITCODE -ne 0 -or !$EmailList) {
    throw "Unable to retrieve email recipients."
}

$EmailList = ($EmailList | Out-String).Trim()

if (!(Test-Path $QueryFile)) {
    throw "Query file not found: $QueryFile"
}

Write-Host "Downloading telemetry..."

# Capture existing files so we only attach this run's exports.
$Before = @{}

Get-ChildItem $ExportDir -File | ForEach-Object {
    $Before[$_.FullName] = $_.LastWriteTimeUtc
}

$Started = [DateTime]::UtcNow

Invoke-PlantMap @(
    "plantmap-sv",
    "download",
    $QueryFile,
    "--days", "1",
    "--format", "csv",
    "--format", "json",
    "--format", "svg",
    "-o", $ExportDir,
    "-sec", "900"
)

$Attachments = @(
    Get-ChildItem $ExportDir -File |
    Where-Object {
        $_.Extension -in ".csv", ".json", ".svg" -and
        (
            !$Before.ContainsKey($_.FullName) -or
            $_.LastWriteTimeUtc -ge $Started
        )
    } |
    Sort-Object Name |
    ForEach-Object { $_.FullName }
)

if ($Attachments.Count -eq 0) {
    throw "No export attachments were generated."
}

foreach ($Path in $Attachments) {
    if (!(Test-Path $Path) -or (Get-Item $Path).Length -eq 0) {
        throw "Missing or empty attachment: $Path"
    }

    Write-Host "Attachment: $Path"
}

Write-Host "Sending email ..."

$EmailArgs = @(
    "plantmap-sv",
    "email",
    "--to", $EmailList,
    "--subject", "Test - Weekly Maxson EDS Report",
    "--body",
    "Attached is the test data report in 15-minute increments. Open the SVG image file in your browser to view the graph. This report was generated using PlantMap-SV automated reporting tools. This email address will likely be flagged; this is because i use 'memphistn' in the gmail account for this purpose, to send email using SMTP. Gmail is much friendlier than Microsoft for this. This is a test, but I plan to send regular reports like this."
)

foreach ($Path in $Attachments) {
    $EmailArgs += @("--attachment", $Path)
}

Invoke-PlantMap $EmailArgs

Write-Host "Report sent successfully."

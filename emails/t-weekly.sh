#!/bin/bash
set -euo pipefail

APP_DIR="$HOME/.plantmap-sv"
EXPORT_DIR="$APP_DIR/export"

EMAIL_LIST=$(npx memphis-settings \
    --app-dir "$APP_DIR" \
    config get email-recipient list-0)

EXPORT_PATHS_BIOREM=$(npx plantmap-sv download \
queries/t-weekly-biorem-tags.txt \
--days 7 \
--format csv --format json --format svg \
-o "$EXPORT_DIR" \
-sec 900)

EXPORT_PATHS_SCAN=$(npx plantmap-sv download \
queries/t-weekly-scan-tags.txt \
--days 7 \
--format csv --format json --format svg \
-o "$EXPORT_DIR" \
-sec 900)

mapfile -t BIOREM_PATHS <<< "$EXPORT_PATHS_BIOREM"
mapfile -t SCAN_PATHS <<< "$EXPORT_PATHS_SCAN"

ATTACHMENTS=("${BIOREM_PATHS[@]}" "${SCAN_PATHS[@]}")
for path in "${ATTACHMENTS[@]}"; do
    [[ -s "$path" ]] || {
        echo "Missing or empty attachment: $path" >&2
        exit 1
    }
done

EMAIL_ARGS=()

for path in "${ATTACHMENTS[@]}"; do
    EMAIL_ARGS+=(--attachment "$path")
done

npx plantmap-sv email \
    --to "$EMAIL_LIST" \
    --subject "Weekly BioRem and S::CAN Report" \
    --body "Attached is the weekly BioRem and S::CAN data, in 15 minute increments. This was sent from using PlantMap-SV automated reporting tools." \
    "${EMAIL_ARGS[@]}"

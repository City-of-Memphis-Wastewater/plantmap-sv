#!/bin/bash
set -euo pipefail

APP_DIR="$HOME/.plantmap-sv"
EXPORT_DIR="$APP_DIR/export"

EMAIL_LIST=$(npx memphis-settings \
    --app-dir "$APP_DIR" \
    config get email-recipient list-3)

EXPORT_PATHS_BIOREM=$(npx plantmap-sv download \
queries/presson-daily-tags.txt \
--days 1 \
--format csv --format json --format svg \
-o "$EXPORT_DIR" \
-sec 900)

mapfile -t EX_PATHS <<< "$EXPORT_PATHS"

ATTACHMENTS=("${EX_PATHS[@]}")
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
    --subject "Daily Presson Report" \
    --body "Attached is the daily test data report weekly, in 15 minute increments. Open the SVG image file in your browser to view the graph. This was sent from using PlantMap-SV automated reporting tools." \
    "${EMAIL_ARGS[@]}"

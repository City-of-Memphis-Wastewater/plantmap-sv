#!/bin/bash
set -euo pipefail

EMAIL_LIST=$(npx memphis-settings --app-dir ~/.plantmap-sv secret 
get email-recipient list-1 --emit)

EXPORT_PATHS_BIOREM=$(npx plantmap-sv download 
queries/t-weekly-biorem-tags.txt 
--days 7 
--format csv --format json --format csv 
-o ~/.plantmap-sv/export 
-sec 900)

EXPORT_PATHS_SCAN=$(npx plantmap-sv download 
queries/t-weekly-scan-tags.txt 
--days 7 
--format csv --format json --format csv
-o ~/.plantmap-sv/export 
-sec 900)

npx plantmap-sv email --to "$EMAIL_LIST" 
--subject "Weekly Influent and Effluent Report" 
--body "Attached is the weekly Influent and Effluent data, in 15 minute increments." 
--attachment "$EXPORT_PATHS_BIOREM,$EXPORT_PATHS_SCAN"

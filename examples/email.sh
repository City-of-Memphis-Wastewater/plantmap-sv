# Should return filepath to stdout
npx plantmap-sv download queries/weekly-report-tags.txt --days 7 -f csv -o ~/.plantmap-sv/export -sec 900
#
npx plantmap-sv email --to recipient@example.com \
      --subject "Weekly Influent and Effluent Report" \
      --body "Attached is the weekly Influent and Effluent data, in 15 mimute increments." \
      --attachment ${EXPORT_PATH}

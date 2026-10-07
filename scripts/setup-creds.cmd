@echo off

set "SCRIPTDIR=%~dp0"
set "APPDIR=%SCRIPTDIR%.."
set "LOGFILE=%SCRIPTDIR%log-creds.txt"

cd /d "%APPDIR%"

echo Starting script at %DATE% %TIME% > "%LOGFILE%"
echo %LOGFILE% >> "%LOGFILE%"

"C:\Program Files\nodejs\node.exe" "%SCRIPTDIR%setup.js" >> "%LOGFILE%" 2>&1

@echo off

set "SCRIPTDIR=%~dp0"
set "LOGFILE=%SCRIPTDIR%log.txt"
set "NODE_ENV=production"
set "PORT=4000"

echo Starting script at %DATE% %TIME% > "%LOGFILE%"
echo %LOGFILE% >> "%LOGFILE%"

"C:\Program Files\nodejs\node.exe" build >> "%LOGFILE%" 2>&1

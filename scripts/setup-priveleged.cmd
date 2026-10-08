@echo off

set "SCRIPTDIR=%~dp0"
set "APPDIR=%SCRIPTDIR%.."
set "LOGFILE=%SCRIPTDIR%log-creds.txt"

cd /d "%APPDIR%"

echo Starting script at %DATE% %TIME% > "%LOGFILE%"
echo %LOGFILE% >> "%LOGFILE%"

echo. >> "%LOGFILE%"
echo === npm install === >> "%LOGFILE%"
call npm install >> "%LOGFILE%" 2>&1
if errorlevel 1 goto :error


echo. >> "%LOGFILE%"
echo === Copy Cesium assets === >> "%LOGFILE%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPTDIR%copy-cesium.ps1" -Force >> "%LOGFILE%" 2>&1
if errorlevel 1 goto :error

echo. >> "%LOGFILE%"
echo === Setup credentials and configuration === >> "%LOGFILE%"
"C:\Program Files\nodejs\node.exe" "%SCRIPTDIR%setup-creds.js" >> "%LOGFILE%" 2>&1
if errorlevel 1 goto :error

echo. >> "%LOGFILE%"
echo Setup completed successfully at %DATE% %TIME% >> "%LOGFILE%"
exit /b 0

:error
echo. >> "%LOGFILE%"
echo Setup failed at %DATE% %TIME% >> "%LOGFILE%"
exit /b 1

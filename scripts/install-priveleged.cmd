@echo off

set "SCRIPTDIR=%~dp0"
set "APPDIR=%SCRIPTDIR%.."
set "LOGFILE=%SCRIPTDIR%log-install-priveleged.txt"

cd /d "%APPDIR%"

echo Starting script at %DATE% %TIME% > "%LOGFILE%"
echo %LOGFILE% >> "%LOGFILE%"

echo. >> "%LOGFILE%"
echo === npm install === >> "%LOGFILE%"
call npm install  >> "%LOGFILE%" 2>&1
if errorlevel 1 goto :error

echo. >> "%LOGFILE%"
echo Setup completed successfully at %DATE% %TIME% >> "%LOGFILE%"
exit /b 0

:error
echo. >> "%LOGFILE%"
echo Setup failed at %DATE% %TIME% >> "%LOGFILE%"
exit /b 1

@echo off
setlocal

set "SCRIPTDIR=%~dp0"
set "APPDIR=%SCRIPTDIR%.."
set "LOGFILE=%SCRIPTDIR%log.txt"

cd /d "%APPDIR%"
if errorlevel 1 (
    echo Failed to change to application directory: "%APPDIR%"
    exit /b 1
)

set "NODE_ENV=production"
set "PORT=4000"

echo.>> "%LOGFILE%"
echo ============================================================>> "%LOGFILE%"
echo Starting PlantMap at %DATE% %TIME%>> "%LOGFILE%"
echo Application directory: %APPDIR%>> "%LOGFILE%"
echo Port: %PORT%>> "%LOGFILE%"
echo ============================================================>> "%LOGFILE%"

echo Building PlantMap...>> "%LOGFILE%"
call npm run build >> "%LOGFILE%" 2>&1
if errorlevel 1 goto :error

echo Starting PlantMap...>> "%LOGFILE%"
"C:\Program Files\nodejs\node.exe" build >> "%LOGFILE%" 2>&1

set "EXITCODE=%ERRORLEVEL%"
echo PlantMap stopped at %DATE% %TIME% with exit code %EXITCODE%>> "%LOGFILE%"

exit /b %EXITCODE%

:error
set "EXITCODE=%ERRORLEVEL%"
echo Build failed at %DATE% %TIME% with exit code %EXITCODE%>> "%LOGFILE%"
exit /b %EXITCODE%

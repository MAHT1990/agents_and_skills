@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%.monitor.pid"

if not exist "%PID_FILE%" (
    echo NO_PID_FILE
    exit /b 1
)

set /p PID=<"%PID_FILE%"
taskkill /F /PID %PID% >NUL 2>&1
del "%PID_FILE%"
echo MONITOR_STOP pid=%PID%

endlocal

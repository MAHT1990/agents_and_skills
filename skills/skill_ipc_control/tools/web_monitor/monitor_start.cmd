@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%.monitor.pid"

if exist "%PID_FILE%" (
    set /p EXISTING_PID=<"%PID_FILE%"
    tasklist /FI "PID eq %EXISTING_PID%" 2>NUL | find "%EXISTING_PID%" >NUL
    if not errorlevel 1 (
        echo MONITOR_ALREADY_RUNNING pid=%EXISTING_PID%
        exit /b 1
    )
    del "%PID_FILE%"
)

pushd "%SCRIPT_DIR%"

powershell -NoProfile -Command "$p = Start-Process -FilePath 'node' -ArgumentList 'server/index.mjs' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden -PassThru; Set-Content -Path '%PID_FILE%' -Value $p.Id; Write-Host ('MONITOR_START pid=' + $p.Id)"

popd
endlocal

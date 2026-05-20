@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%.monitor.pid"

REM Guard 1: Node installation check
where node >NUL 2>&1
if errorlevel 1 (
    echo NODE_NOT_FOUND
    echo Install Node.js 18+ from https://nodejs.org/ and retry.
    exit /b 1
)

REM Guard 2: node_modules presence check
if not exist "%SCRIPT_DIR%node_modules" (
    echo DEPS_MISSING node_modules not found.
    echo Run: cd /d "%SCRIPT_DIR%" ^&^& npm install
    exit /b 1
)

REM Guard 3: stale PID handling (delayed expansion required inside block)
if exist "%PID_FILE%" (
    set /p EXISTING_PID=<"%PID_FILE%"
    tasklist /FI "PID eq !EXISTING_PID!" 2>NUL | findstr /C:"!EXISTING_PID!" >NUL
    if not errorlevel 1 (
        echo MONITOR_ALREADY_RUNNING pid=!EXISTING_PID!
        exit /b 1
    )
    del "%PID_FILE%"
)

pushd "%SCRIPT_DIR%"

powershell -NoProfile -Command "$p = Start-Process -FilePath 'node' -ArgumentList 'server/index.mjs' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden -PassThru; Set-Content -Path '%PID_FILE%' -Value $p.Id; Write-Host ('MONITOR_START pid=' + $p.Id)"

popd
endlocal

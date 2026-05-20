@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%.monitor.pid"

REM ── 사전 점검 1: Node 설치 여부 ─────────────────────
where node >NUL 2>&1
if errorlevel 1 (
    echo NODE_NOT_FOUND
    echo Install Node.js 18+ from https://nodejs.org/ and retry.
    exit /b 1
)

REM ── 사전 점검 2: node_modules 존재 여부 ─────────────
if not exist "%SCRIPT_DIR%node_modules" (
    echo DEPS_MISSING node_modules not found.
    echo Run: cd /d "%SCRIPT_DIR%" ^&^& npm install
    exit /b 1
)

REM ── 사전 점검 3: stale PID 처리 ──────────────────────
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

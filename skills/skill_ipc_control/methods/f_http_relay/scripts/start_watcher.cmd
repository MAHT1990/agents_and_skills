@echo off
chcp 65001 > nul
REM Usage: start_watcher.cmd <channel> <as>
REM Polls channels/<channel>/.relay_url's /recv forever, streaming new envelopes to stdout.
REM Intended to be invoked via Monitor(command=..., persistent=true). See SKILL.md Step 2.

setlocal EnableExtensions

if "%~2"=="" goto :usage

set "IPC_CHANNEL=%~1"
set "IPC_AS=%~2"

set "SCRIPT_DIR=%~dp0"
set "IPC_SKILL_ROOT=%SCRIPT_DIR%..\..\.."
set "IPC_CHANNEL_DIR=%IPC_SKILL_ROOT%\channels\%IPC_CHANNEL%"
set "IPC_PID_FILE=%IPC_CHANNEL_DIR%\.watcher_%IPC_AS%.pid"

if not exist "%IPC_CHANNEL_DIR%" mkdir "%IPC_CHANNEL_DIR%"

REM PID gating unified into start_watcher.ps1 last-resort guard (alive/stale/unreadable).

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start_watcher.ps1"
set "EXITCODE=%ERRORLEVEL%"

endlocal & exit /b %EXITCODE%

:usage
echo Usage: start_watcher.cmd ^<channel^> ^<as^>
exit /b 1

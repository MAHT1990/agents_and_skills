@echo off
chcp 65001 > nul
REM Usage: stop_watcher.cmd <channel> <as>
REM Reads .watcher_<as>.pid and terminates the process.

setlocal EnableExtensions

if "%~2"=="" goto :usage

set "IPC_CHANNEL=%~1"
set "IPC_AS=%~2"

set "SCRIPT_DIR=%~dp0"
set "IPC_SKILL_ROOT=%SCRIPT_DIR%..\.."
set "IPC_CHANNEL_DIR=%IPC_SKILL_ROOT%\channels\%IPC_CHANNEL%"
set "IPC_PID_FILE=%IPC_CHANNEL_DIR%\.watcher_%IPC_AS%.pid"

if not exist "%IPC_PID_FILE%" (
  echo NO_WATCHER channel=%IPC_CHANNEL% as=%IPC_AS%
  endlocal & exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%stop_watcher.ps1"
set "EXITCODE=%ERRORLEVEL%"

endlocal & exit /b %EXITCODE%

:usage
echo Usage: stop_watcher.cmd ^<channel^> ^<as^>
exit /b 1

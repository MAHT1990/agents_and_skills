@echo off
chcp 65001 > nul
REM Usage: recv.cmd <channel> <as>
REM Prints unread messages addressed to <as> from channels/<channel>/inbox.log

setlocal EnableExtensions

if "%~2"=="" goto :usage

set "IPC_CHANNEL=%~1"
set "IPC_AS=%~2"

set "SCRIPT_DIR=%~dp0"
set "IPC_SKILL_ROOT=%SCRIPT_DIR%..\.."
set "IPC_CHANNEL_DIR=%IPC_SKILL_ROOT%\channels\%IPC_CHANNEL%"
set "IPC_INBOX=%IPC_CHANNEL_DIR%\inbox.log"
set "IPC_READ=%IPC_CHANNEL_DIR%\.read_%IPC_AS%"

if not exist "%IPC_INBOX%" (
  echo NO_INBOX channel=%IPC_CHANNEL%
  endlocal & exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%recv.ps1"
set "EXITCODE=%ERRORLEVEL%"

endlocal & exit /b %EXITCODE%

:usage
echo Usage: recv.cmd ^<channel^> ^<as^>
exit /b 1

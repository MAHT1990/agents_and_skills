@echo off
chcp 65001 > nul
REM Usage: send.cmd <channel> <from> <to> <message>
REM Appends a JSON line to channels/<channel>/inbox.log

setlocal EnableExtensions

if "%~4"=="" goto :usage

set "IPC_CHANNEL=%~1"
set "IPC_FROM=%~2"
set "IPC_TO=%~3"
set "IPC_BODY=%~4"

set "SCRIPT_DIR=%~dp0"
set "IPC_SKILL_ROOT=%SCRIPT_DIR%..\.."
set "IPC_CHANNEL_DIR=%IPC_SKILL_ROOT%\channels\%IPC_CHANNEL%"
set "IPC_INBOX=%IPC_CHANNEL_DIR%\inbox.log"

if not exist "%IPC_CHANNEL_DIR%" mkdir "%IPC_CHANNEL_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%send.ps1"
set "EXITCODE=%ERRORLEVEL%"

endlocal & exit /b %EXITCODE%

:usage
echo Usage: send.cmd ^<channel^> ^<from^> ^<to^> ^<message^>
exit /b 1

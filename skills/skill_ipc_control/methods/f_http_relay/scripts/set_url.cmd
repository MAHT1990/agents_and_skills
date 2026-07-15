@echo off
chcp 65001 > nul
REM Usage: set_url.cmd <channel> <url>
REM Records the relay URL into channels/<channel>/.relay_url (one-time per channel).
REM Args forwarded via %* so URLs with special chars survive cmd parsing.

setlocal EnableExtensions

if "%~2"=="" goto :usage

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%set_url.ps1" %*
set "EXITCODE=%ERRORLEVEL%"

endlocal & exit /b %EXITCODE%

:usage
echo Usage: set_url.cmd ^<channel^> ^<url^>
exit /b 1

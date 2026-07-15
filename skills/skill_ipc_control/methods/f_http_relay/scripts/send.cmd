@echo off
chcp 65001 > nul
REM Usage: send.cmd <channel> <from> <to> <message>
REM POSTs a JSON envelope to the channel's relay (URL from channels/<channel>/.relay_url).
REM All args forwarded via %* so csv "to" values (e.g. "a,b,c") survive cmd parsing;
REM PowerShell param() parses them safely.

setlocal EnableExtensions

if "%~1"=="" goto :usage

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%send.ps1" %*
set "EXITCODE=%ERRORLEVEL%"

endlocal & exit /b %EXITCODE%

:usage
echo Usage: send.cmd ^<channel^> ^<from^> ^<to^> ^<message^>
exit /b 1

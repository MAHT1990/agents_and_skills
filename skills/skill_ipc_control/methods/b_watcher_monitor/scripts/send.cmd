@echo off
chcp 65001 > nul
REM Usage: send.cmd <channel> <from> <to> <message>
REM cmd batch parameter expansion (%%~N) treats comma/semicolon/equal
REM as argument delimiters, breaking csv "to" values like
REM "claude_b,claude_c". To avoid this, all args are forwarded via %%*
REM to PowerShell; PowerShell's param() parses them safely (preserves
REM quoted commas).

setlocal EnableExtensions

if "%~1"=="" goto :usage

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%send.ps1" %*
set "EXITCODE=%ERRORLEVEL%"

endlocal & exit /b %EXITCODE%

:usage
echo Usage: send.cmd ^<channel^> ^<from^> ^<to^> ^<message^>
exit /b 1

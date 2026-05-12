# stop_watcher.ps1 — terminate watcher by PID file
# Inputs (env): IPC_CHANNEL, IPC_AS, IPC_PID_FILE

$ErrorActionPreference = 'Stop'

$channel = $env:IPC_CHANNEL
$asName  = $env:IPC_AS
$pidFile = $env:IPC_PID_FILE

if (-not (Test-Path $pidFile)) {
    Write-Host ("NO_WATCHER channel={0} as={1}" -f $channel, $asName)
    exit 0
}

$pidRaw = (Get-Content -Path $pidFile -Encoding ASCII).Trim()
$pidNum = [int]$pidRaw

$proc = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
if ($null -eq $proc) {
    Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
    Write-Host ("STALE_PID_CLEANED channel={0} as={1} pid={2}" -f $channel, $asName, $pidNum)
    exit 0
}

Stop-Process -Id $pidNum -Force
Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
Write-Host ("WATCHER_STOPPED channel={0} as={1} pid={2}" -f $channel, $asName, $pidNum)

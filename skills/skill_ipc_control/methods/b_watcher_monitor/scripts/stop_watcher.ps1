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

# PID 파일은 ASCII 단일 라인 — start_watcher.ps1과 동일하게 TryParse 패턴으로 통일
# 빈 파일·비정수·잘린 내용이면 stale로 간주, 파일 정리 후 종료
$pidRaw = (Get-Content -Path $pidFile -Encoding ASCII -ErrorAction SilentlyContinue | Select-Object -First 1)
$pidNum = 0
if (-not ([int]::TryParse($pidRaw, [ref]$pidNum)) -or $pidNum -le 0) {
    Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
    Write-Host ("STALE_PID_CLEANED channel={0} as={1} pid=<unreadable>" -f $channel, $asName)
    exit 0
}

$proc = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
if ($null -eq $proc) {
    Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
    Write-Host ("STALE_PID_CLEANED channel={0} as={1} pid={2}" -f $channel, $asName, $pidNum)
    exit 0
}

Stop-Process -Id $pidNum -Force
Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
Write-Host ("WATCHER_STOPPED channel={0} as={1} pid={2}" -f $channel, $asName, $pidNum)

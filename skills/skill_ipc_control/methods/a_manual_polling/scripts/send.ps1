# send.ps1 — append a JSON line to inbox.log
# Inputs (env): IPC_CHANNEL, IPC_FROM, IPC_TO, IPC_BODY, IPC_INBOX
#
# param() 어댑터: cmd batch %~N 함정(쉼표·세미콜론·등호 인자분리) 회피.
# PowerShell이 자체 파싱한 인자를 $env:IPC_* 에 매핑한 뒤 기존 env 기반 로직 사용.

param(
    [Parameter(Mandatory=$true, Position=0)][string]$Channel,
    [Parameter(Mandatory=$true, Position=1)][string]$From,
    [Parameter(Mandatory=$true, Position=2)][string]$To,
    [Parameter(Mandatory=$true, Position=3)][string]$Body
)

$ErrorActionPreference = 'Stop'

# Explicit env mapping — param 인자를 환경변수로 옮겨 (1) 명시화 (2) 기존 인터페이스 호환
$env:IPC_CHANNEL = $Channel
$env:IPC_FROM    = $From
$env:IPC_TO      = $To
$env:IPC_BODY    = $Body
$env:IPC_INBOX   = (Join-Path $PSScriptRoot "..\..\..\channels\$Channel\inbox.log")

$channelDir = Split-Path -Parent $env:IPC_INBOX
if (-not (Test-Path $channelDir)) {
    New-Item -ItemType Directory -Path $channelDir -Force | Out-Null
}

# 이하 기존 로직 그대로 ($env:IPC_* 사용)
$channel = $env:IPC_CHANNEL
$from    = $env:IPC_FROM
$to      = $env:IPC_TO
$body    = $env:IPC_BODY
$inbox   = $env:IPC_INBOX

$ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$id = 'msg_' + (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmssfff") + '_' + ([guid]::NewGuid().ToString('N').Substring(0,6))

$obj = [ordered]@{
    id   = $id
    ts   = $ts
    from = $from
    to   = $to
    body = $body
}
$json = $obj | ConvertTo-Json -Compress

Add-Content -Path $inbox -Value $json -Encoding UTF8

Write-Host ("SENT id={0} ts={1} channel={2} from={3} to={4}" -f $id, $ts, $channel, $from, $to)

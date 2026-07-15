# set_url.ps1 — record the relay URL for a channel (network analog of B's inbox path)
# Inputs: param Channel, Url  (forwarded via %* from set_url.cmd)

param(
    [Parameter(Mandatory=$true, Position=0)][string]$Channel,
    [Parameter(Mandatory=$true, Position=1)][string]$Url
)

$ErrorActionPreference = 'Stop'

$channelDir = Join-Path $PSScriptRoot "..\..\..\channels\$Channel"
if (-not (Test-Path $channelDir)) {
    New-Item -ItemType Directory -Path $channelDir -Force | Out-Null
}

$urlFile = Join-Path $channelDir ".relay_url"
$clean = $Url.TrimEnd('/')                       # 끝 슬래시 제거 → "$url/send" 이중 슬래시 방지
Set-Content -Path $urlFile -Value $clean -Encoding ASCII -NoNewline

Write-Host ("RELAY_URL_SET channel={0} url={1}" -f $Channel, $clean)

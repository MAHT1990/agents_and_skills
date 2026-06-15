# send.ps1 — POST a JSON envelope to the channel's relay (network twin of B's send.ps1)
# Inputs: param Channel, From, To, Body  (forwarded via %* for comma-safe parsing)
#
# 로컬 inbox.log append 대신 POST /send. URL은 channels/<channel>/.relay_url 에서 읽는다.
# 서버가 id·ts 를 부여하므로 여기선 from/to/body 만 보낸다.

param(
    [Parameter(Mandatory=$true, Position=0)][string]$Channel,
    [Parameter(Mandatory=$true, Position=1)][string]$From,
    [Parameter(Mandatory=$true, Position=2)][string]$To,
    [Parameter(Mandatory=$true, Position=3)][string]$Body
)

$ErrorActionPreference = 'Stop'

$channelDir = Join-Path $PSScriptRoot "..\..\..\channels\$Channel"
$urlFile = Join-Path $channelDir ".relay_url"
if (-not (Test-Path $urlFile)) {
    Write-Host ("RELAY_URL_NOT_SET channel={0} (set_url.cmd <channel> <url> 먼저 실행)" -f $Channel)
    exit 1
}
$url = ((Get-Content -Path $urlFile -Raw) -replace '\s', '')

# 봉투 직렬화 → UTF-8 바이트로 전송 (한글 본문 mojibake 방지)
$payload = @{ from = $From; to = $To; body = $Body } | ConvertTo-Json -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)

try {
    $resp = Invoke-RestMethod -Method Post -Uri "$url/send" -Body $bytes -ContentType "application/json; charset=utf-8"
} catch {
    Write-Host ("SEND_FAILED channel={0} url={1} err={2}" -f $Channel, $url, $_.Exception.Message)
    exit 1
}

Write-Host ("SENT id={0} ts={1} channel={2} from={3} to={4}" -f $resp.id, $resp.ts, $Channel, $From, $To)

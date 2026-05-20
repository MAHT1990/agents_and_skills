$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$p = Start-Process -FilePath 'node' -ArgumentList 'server/index.mjs' -WorkingDirectory $here -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3030/healthz' -UseBasicParsing -TimeoutSec 5
    Write-Host "HEALTHZ STATUS=$($r.StatusCode)"
    Write-Host "HEALTHZ BODY=$($r.Content)"
} catch { Write-Host "HEALTHZ ERROR=$($_.Exception.Message)" }

try {
    $r2 = Invoke-WebRequest -Uri 'http://127.0.0.1:3030/api/v1/channels' -UseBasicParsing -TimeoutSec 5
    Write-Host "CHANNELS STATUS=$($r2.StatusCode)"
    Write-Host "CHANNELS BODY=$($r2.Content)"
} catch { Write-Host "CHANNELS ERROR=$($_.Exception.Message)" }

try {
    $r3 = Invoke-WebRequest -Uri 'http://127.0.0.1:3030/' -UseBasicParsing -TimeoutSec 5
    Write-Host "INDEX STATUS=$($r3.StatusCode) LEN=$($r3.Content.Length)"
} catch { Write-Host "INDEX ERROR=$($_.Exception.Message)" }

Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
Write-Host "STOPPED pid=$($p.Id)"

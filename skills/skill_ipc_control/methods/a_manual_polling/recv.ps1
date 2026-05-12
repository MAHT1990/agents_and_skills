# recv.ps1 — print unread messages for IPC_AS from IPC_INBOX
# Inputs (env): IPC_CHANNEL, IPC_AS, IPC_INBOX, IPC_READ

$ErrorActionPreference = 'Stop'

$channel = $env:IPC_CHANNEL
$asName  = $env:IPC_AS
$inbox   = $env:IPC_INBOX
$readPath = $env:IPC_READ

if (Test-Path $readPath) {
    $readLines = Get-Content -Path $readPath -Encoding UTF8
} else {
    $readLines = @()
}
$readSet = [System.Collections.Generic.HashSet[string]]::new()
foreach ($r in $readLines) {
    if (-not [string]::IsNullOrWhiteSpace($r)) { [void]$readSet.Add($r.Trim()) }
}

$new = @()
foreach ($line in (Get-Content -Path $inbox -Encoding UTF8)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try { $m = $line | ConvertFrom-Json } catch { continue }
    if ($m.to -ne $asName) { continue }
    if ($readSet.Contains($m.id)) { continue }
    $new += $m
}

foreach ($m in $new) {
    Write-Host '---'
    Write-Host ("id:   {0}" -f $m.id)
    Write-Host ("ts:   {0}" -f $m.ts)
    Write-Host ("from: {0}" -f $m.from)
    Write-Host ("body: {0}" -f $m.body)
    Add-Content -Path $readPath -Value $m.id -Encoding UTF8
}

if ($new.Count -eq 0) {
    Write-Host ("NO_NEW channel={0} as={1}" -f $channel, $asName)
} else {
    Write-Host ("RECEIVED count={0}" -f $new.Count)
}

# start_watcher.ps1 — tail inbox.log to stdout, record PID
# Inputs (env): IPC_CHANNEL, IPC_AS, IPC_INBOX, IPC_PID_FILE

$ErrorActionPreference = 'Stop'

$channel = $env:IPC_CHANNEL
$asName  = $env:IPC_AS
$inbox   = $env:IPC_INBOX
$pidFile = $env:IPC_PID_FILE

Set-Content -Path $pidFile -Value $PID -Encoding ASCII

Write-Host ("WATCHER_START channel={0} as={1} pid={2} inbox={3}" -f $channel, $asName, $PID, $inbox)

try {
    Get-Content -Path $inbox -Wait -Tail 0 -Encoding UTF8 | ForEach-Object {
        if (-not [string]::IsNullOrWhiteSpace($_)) {
            Write-Host $_
        }
    }
} finally {
    if (Test-Path $pidFile) { Remove-Item -Force $pidFile -ErrorAction SilentlyContinue }
}

# send.ps1 — append a JSON line to inbox.log (identical behavior as a_manual_polling/send.ps1)
# Inputs (env): IPC_CHANNEL, IPC_FROM, IPC_TO, IPC_BODY, IPC_INBOX

$ErrorActionPreference = 'Stop'

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

# start_watcher.ps1 — poll the channel's relay /recv and stream NEW envelopes to stdout
# Network twin of B's `Get-Content -Wait` inbox tail: here the polling lives INSIDE the
# watcher daemon, so the receiving LLM gets the same push UX (Monitor stdout → prompt) and
# never calls recv itself.
# Inputs (env): IPC_CHANNEL, IPC_AS, IPC_CHANNEL_DIR, IPC_PID_FILE
# Optional (env): IPC_POLL_SEC (default 2)

$ErrorActionPreference = 'Stop'

$channel    = $env:IPC_CHANNEL
$asName     = $env:IPC_AS
$channelDir = $env:IPC_CHANNEL_DIR
$pidFile    = $env:IPC_PID_FILE
$urlFile    = Join-Path $channelDir ".relay_url"
$cursorFile = Join-Path $channelDir ".cursor_$asName"
$intervalSec = if ($env:IPC_POLL_SEC) { [int]$env:IPC_POLL_SEC } else { 2 }

# --- PID 게이팅 (B의 last-resort 가드와 동일) ---
# alive면 중복 기동 거부, stale/판독불가면 PID 파일 정리 후 진행
if (Test-Path $pidFile) {
    $existingPidRaw = (Get-Content -Path $pidFile -Encoding ASCII -ErrorAction SilentlyContinue | Select-Object -First 1)
    $existingPid = 0
    if ([int]::TryParse($existingPidRaw, [ref]$existingPid) -and $existingPid -gt 0) {
        $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        if ($null -ne $proc) {
            Write-Host ("WATCHER_ALREADY_RUNNING channel={0} as={1} pid={2}" -f $channel, $asName, $existingPid)
            exit 1
        } else {
            Write-Host ("WATCHER_STALE_PID_REMOVED channel={0} as={1} pid={2}" -f $channel, $asName, $existingPid)
            Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host ("WATCHER_STALE_PID_REMOVED channel={0} as={1} pid=<unreadable>" -f $channel, $asName)
        Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
    }
}

# --- URL 필수 ---
if (-not (Test-Path $urlFile)) {
    Write-Host ("RELAY_URL_NOT_SET channel={0} (set_url.cmd <channel> <url> 먼저 실행)" -f $channel)
    exit 1
}
$url = ((Get-Content -Path $urlFile -Raw) -replace '\s', '')

# --- 커서 복원 (네트워크판 .read_<as>) ---
$since = ""
if (Test-Path $cursorFile) {
    $since = ((Get-Content -Path $cursorFile -Raw -ErrorAction SilentlyContinue) -replace '\s', '')
}

# 현재 PowerShell PID 기록 — stop_watcher/status가 참조
Set-Content -Path $pidFile -Value $PID -Encoding ASCII
Write-Host ("WATCHER_START channel={0} as={1} pid={2} url={3} since={4}" -f $channel, $asName, $PID, $url, $since)

try {
    while ($true) {
        try {
            $uri = if ($since) { "$url/recv?since=$since" } else { "$url/recv" }
            $raw = (Invoke-WebRequest -Uri $uri -UseBasicParsing).Content   # .Content = raw NDJSON 문자열
        } catch {
            # 네트워크 흔들림/터널 재시작 → 다음 폴링에서 재시도 (watcher는 죽지 않음)
            Start-Sleep -Seconds $intervalSec
            continue
        }
        if ($raw) {
            foreach ($line in ($raw -split "`n")) {
                $line = $line.Trim()
                if (-not $line) { continue }
                # 필터 X — 봉투 raw 그대로 emit (to 매칭은 수신 LLM stage5).
                # 손상 라인은 MALFORMED_LINE 으로 가시화 (B와 동일 정책).
                try {
                    $m = $line | ConvertFrom-Json -ErrorAction Stop
                    $since = $m.id
                    Write-Host $line
                } catch {
                    $rawEscaped = $line -replace "`r`n", '\n' -replace "`n", '\n' -replace "`r", '\n'
                    Write-Host ("MALFORMED_LINE channel={0} as={1} raw={2}" -f $channel, $asName, $rawEscaped)
                }
            }
            # 커서 영속화 — 정상 파싱된 마지막 id만
            if ($since) { Set-Content -Path $cursorFile -Value $since -Encoding ASCII -NoNewline }
        }
        Start-Sleep -Seconds $intervalSec
    }
} finally {
    if (Test-Path $pidFile) { Remove-Item -Force $pidFile -ErrorAction SilentlyContinue }
}

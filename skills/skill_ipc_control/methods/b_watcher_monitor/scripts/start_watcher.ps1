# start_watcher.ps1 — tail inbox.log to stdout, record PID
# Inputs (env): IPC_CHANNEL, IPC_AS, IPC_INBOX, IPC_PID_FILE

$ErrorActionPreference = 'Stop'

$channel = $env:IPC_CHANNEL
$asName  = $env:IPC_AS
$inbox   = $env:IPC_INBOX
$pidFile = $env:IPC_PID_FILE

# last-resort 가드: LLM 사전 점검을 우회한 경우 대비
# alive면 중복 기동을 막고, stale이면 PID 파일을 정리한 뒤 진행
if (Test-Path $pidFile) {
    # PID 파일은 ASCII 단일 라인 — 첫 줄만 정수로 파싱
    $existingPidRaw = (Get-Content -Path $pidFile -Encoding ASCII -ErrorAction SilentlyContinue | Select-Object -First 1)
    $existingPid = 0
    if ([int]::TryParse($existingPidRaw, [ref]$existingPid) -and $existingPid -gt 0) {
        # Get-Process 결과 null=프로세스 미존재(stale), 객체=alive
        $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        if ($null -ne $proc) {
            # alive: 동일 channel·as로 이미 listening 중 → 비정상 종료로 중복 방지
            Write-Host ("WATCHER_ALREADY_RUNNING channel={0} as={1} pid={2}" -f $channel, $asName, $existingPid)
            exit 1
        } else {
            # stale: 직전 세션이 비정상 종료된 잔여 PID → 파일만 정리하고 신규 기동
            Write-Host ("WATCHER_STALE_PID_REMOVED channel={0} as={1} pid={2}" -f $channel, $asName, $existingPid)
            Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
        }
    } else {
        # 파싱 실패 (비정상 내용/공백/잘림) — stale로 간주
        Write-Host ("WATCHER_STALE_PID_REMOVED channel={0} as={1} pid=<unreadable>" -f $channel, $asName)
        Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
    }
}

# 현재 PowerShell 프로세스의 PID를 파일에 기록 — stop_watcher와 status가 이 값을 참조
Set-Content -Path $pidFile -Value $PID -Encoding ASCII

Write-Host ("WATCHER_START channel={0} as={1} pid={2} inbox={3}" -f $channel, $asName, $PID, $inbox)

try {
    Get-Content -Path $inbox -Wait -Tail 0 -Encoding UTF8 | ForEach-Object {
        # catch 블록 안에서 $_는 ErrorRecord로 재바인딩되므로 라인 원본을 $line에 보존
        $line = $_
        if (-not [string]::IsNullOrWhiteSpace($line)) {
            # JSON 검증으로 손상 라인 가시화
            # - 정상 JSON → 기존처럼 그대로 emit
            # - 깨진 라인 → MALFORMED_LINE 시그널 라인으로 변환 emit
            # - raw 안의 줄바꿈은 \n 리터럴로 치환해 stdout 라인 단위 처리 유지
            try {
                $null = $line | ConvertFrom-Json -ErrorAction Stop
                Write-Host $line
            } catch {
                $rawEscaped = $line -replace "`r`n", '\n' -replace "`n", '\n' -replace "`r", '\n'
                Write-Host ("MALFORMED_LINE channel={0} as={1} raw={2}" -f $channel, $asName, $rawEscaped)
            }
        }
    }
} finally {
    if (Test-Path $pidFile) { Remove-Item -Force $pidFile -ErrorAction SilentlyContinue }
}

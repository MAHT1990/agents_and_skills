# Method B — Watcher + Monitor

A의 파일 채널 위에 **백그라운드 watcher**를 얹어, 받는 쪽이 가만히 있어도 메시지 도착을 인지하는 방식.
Claude Code의 `Monitor` 도구와 짝지어 사용.

## 동작 그림

```
[B 세션 시작 시점]
   ┌─────────────────────────────────────────────────────┐
   │ LLM: Monitor(                                       │
   │        command="start_watcher.cmd <ch> <as>",       │
   │        persistent=true                              │
   │      )                                              │
   │  → Monitor가 watcher 기동 + stdout 라인 구독 동시   │
   └─────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌─────────────────────────────────────────────────────┐
   │ watcher 프로세스 (PowerShell)                       │
   │  Get-Content inbox.log -Wait -Tail 0                │
   │  새 라인이 추가되면 stdout 으로 흘림                │
   │  PID를 .watcher_<as>.pid 에 기록                    │
   └─────────────────────────────────────────────────────┘

[A 세션]                                  [디스크]
   send.cmd ─── append JSON 라인 ───────► inbox.log
                                              │
                                              │ Get-Content -Wait 감지
                                              ▼
                                       watcher stdout
                                              │
                                              ▼
                                       Monitor notification
                                              │
                                              ▼
                                       B 세션 LLM 다음 턴
                                       시작 시 자동 인입
```

## 핵심 메커니즘
- A와 동일하게 `channels/<channel>/inbox.log`를 JSON Lines로 공유
- B는 시작 시 watcher 프로세스를 띄움 → 새 라인을 stdout으로 흘림
- LLM이 `Monitor` 도구로 watcher 스크립트를 직접 기동·구독 → 새 라인이 notification으로 도착
- watcher PID는 `.watcher_<as>.pid`에 저장 → 명시적 stop으로 종료
- **읽음 추적은 A와 동일** (.read_<as>) — watcher 재시작 시 누락 방지
- **`to` 매칭은 SKILL.md "broadcast / 그룹 라우팅" 정책을 따름**
  - 매칭 layer: **stage 3(watcher stdout) → stage 5(LLM 매칭) 사이 필터 X** — Monitor command는 `start_watcher.cmd` 단독 호출만 허용 (파이프 `|`·후가공 일체 금지). watcher 스크립트도 가공 없이 stdout
  - 매칭 수행은 stage 5(수신측 LLM)에서만:
    - `to == self` 매치
    - `to == "all"` 매치 (자기 송신분 포함)
    - `to == "a,b,c"` 쉼표 split 후 self 포함 시 매치
    - 그 외 skip + self 송신분(`from == self`)은 무시

## 호출 규칙 (자동승인 매칭)

**이 형태로만 호출한다.** settings.json `permissions.allow`에 등록된 4개 prefix와 정확히 일치해야 매번 승인 프롬프트 없이 동작한다.

> **왜 `~/.claude/...` 인가**: `~`은 Bash가 `$HOME`으로 expand하여 머신 독립적 (`C:\Users\kitor` ↔ `/home/alice` ↔ `/Users/bob`). Claude Code permission은 **raw 문자열 prefix 매칭**이라 `~`가 expand되기 전 토큰으로 비교되어, 모든 머신에서 동일 prefix가 매칭됨. cwd와도 무관.

| 작업 | 사용 도구 | 정확한 호출 형태 |
|---|---|---|
| watcher 가동 | **Monitor** | `Monitor(command="~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/start_watcher.cmd <ch> <as>", persistent=true)` |
| 메시지 발신 | **Bash** | `~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/send.cmd <ch> <from> <to> "<body>"` |
| watcher 종료 | **Bash** | `~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/stop_watcher.cmd <ch> <as>` |

### 매칭이 깨지는 패턴 (사용 금지)
- ❌ **`Bash(run_in_background:true)`로 watcher 호출** — watcher는 `Get-Content -Wait`로 무한 실행이라 "완료 시 1회 알림" 모델과 불일치. SKILL.md `# Mandatory Behavior 3` 안티패턴. `Bash(start_watcher.cmd:*)` prefix는 last-resort 가드 호환을 위해 settings.json에 보존되나 LLM이 직접 사용 금지
- ❌ **PowerShell 도구로 호출** — `PowerShell(& "~\.claude\...")` (prefix 미등록)
- ❌ **머신 dependent 절대경로** — `C:\Users\kitor\...`, `/c/Users/kitor/...`, `/home/alice/...` 등. `~/.claude/...`만 사용
- ❌ **백슬래시 경로** — `~\.claude\skills\...` 또는 `.\skills\...`
- ❌ **cwd 의존 상대경로** — `./skills/...`, `skills/...` (prefix가 `~/.claude/...`로 시작해 매칭 X, cwd 다른 세션 호환 X)
- ❌ **명령 chain** — `... && echo done` 또는 `cd X && ~/.claude/...` (chain된 명령은 별도 prefix 매칭 필요)

### 등록된 prefix (settings.json 사본)
```
Bash(~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/send.cmd:*)
Bash(~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/start_watcher.cmd:*)
Bash(~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/stop_watcher.cmd:*)
Monitor(~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/start_watcher.cmd:*)
```

### 메시지 본문에 `%` 포함 시 주의 (cmd batch 함정)
- 본문 안의 `%`는 cmd batch가 parameter expansion으로 해석함 (큰따옴표 안에서도 발생)
  - 예: 본문에 `%~N` 포함 시 cmd가 invalid modifier로 처리 → 호출 실패
- 회피: `%%`로 escape (cmd literal-percent 컨벤션) 또는 영문 단어로 표현 ("percent-tilde-N", "percent-star" 등)
- `$env:*` 등 `$` prefix(PowerShell 변수)는 cmd가 안 건드림 — 안전

## 공유 자원 보호장치 (LLM 필독)

`channels/<channel>/inbox.log`는 다중 writer + 단일 reader 패턴의 공유 자원이다. 두 세션이 거의 동시에 send하면 라인 인터리브 또는 IOException으로 메시지 손상이 발생할 수 있어, 본 method는 차단(send 측)과 가시화(watcher 측) 2층 보호를 둔다.

### 보호 대상 자원과 정책

| 자원 | 동시 접근 패턴 | 보호 정책 |
|---|---|---|
| `inbox.log` | 다중 writer + 단일 reader | send 측 FileStream 명시 lock + retry / watcher 측 JSON 검증 + MALFORMED_LINE emit |
| `.read_<as>` | per-session 단일 writer | 보호 불필요 (writer 단일) |
| `.watcher_<as>.pid` | per-session 단일 writer | `start_watcher.ps1` last-resort 가드 (SKILL.md `# Error Handling` 참조) |

### 차단 (send 측, `send.ps1`)

```
session_a ─▶ [Open Append+Write, Share=Read] ─▶ Write bytes ─▶ Dispose
                            │
                            │ OS lock 활성
                            ├─ 다른 writer 핸들  → IOException (거부)
                            └─ 다른 reader 핸들  → 허용 (watcher tail 정상)

session_b ─▶ [Open ... 시도] ─▶ IOException
              └─▶ 20ms sleep ─▶ retry ─▶ ... ─▶ a Dispose 후 성공
                          (최대 50회 ≈ 1초, 초과 시 throw)
```

- `[System.IO.File]::Open(path, Append, Write, FileShare.Read)` 명시 lock으로 다른 writer 차단
- `FileShare.Read`라 watcher의 `Get-Content -Wait` (read 핸들)은 영향 없음
- share violation IOException 시 20ms × 50회 retry, 그래도 실패하면 throw
- 인코딩: Byte Order Mark 없는 UTF-8 / 줄바꿈: CRLF 리터럴 (인코딩·줄바꿈 일관성)

### 가시화 (watcher 측, `start_watcher.ps1`)

```
inbox.log 라인 인입
        │
        ▼
JSON 검증 (ConvertFrom-Json -ErrorAction Stop)
        │
        ├─ OK   → 원본 라인 그대로 emit ─▶ Stage 5 LLM 정상 매칭 흐름
        │
        └─ 실패 → 줄바꿈 \n 치환 ─▶ MALFORMED_LINE channel=... as=... raw=... emit
                                              │
                                              ▼
                                        Stage 5 LLM 시그널 인식
                                        (아래 컨벤션 참조)
```

손상 자체는 차단(send 측 lock)으로 거의 막히지만, 외부 수동 편집·디스크 손상·인코딩 충돌 등은 못 막는다. 가시화는 silent drop 대신 explicit signal로 손상을 즉시 인지하기 위함.

### MALFORMED_LINE LLM 처리 컨벤션

watcher stdout 인입 라인이 `MALFORMED_LINE channel=... as=... raw=...` 형태이면 LLM은 아래 규칙을 강제 적용한다.

| 항목 | 동작 |
|---|---|
| 자기 매칭 | 시도하지 않음 (정상 메시지로 오인 금지, broadcast 매칭 흐름 진입 X) |
| 사용자 보고 | 즉시 보고 — raw 원본 그대로 + "송신 측 보호장치 점검 필요" 안내 |
| `.read_<as>` 기록 | 하지 않음 (정상 메시지가 아니므로) |
| 다음 작업 | 보고 후 진행 |

발생이 빈번하면 의심 순서:
1. send.ps1 FileStream lock 우회 (cmd가 아닌 경로로 직접 append)
2. 외부 수동 편집
3. 파일 인코딩 충돌 (Byte Order Mark 혼재 등)

## 명령

### start_watcher.cmd
```
start_watcher.cmd <channel> <as>
```
- 동작: PID 파일 만들고, `Get-Content inbox.log -Wait -Tail 0`으로 새 라인을 stdout에 흘림
- 결과 첫 라인: `WATCHER_START channel=... as=... pid=... inbox=...`
- 이후: 새 메시지 JSON 라인을 그대로 흘림 (필터 X — 수신측 LLM이 to 비교)
- 중복 기동 방지: `.watcher_<as>.pid` 이미 존재 시 `ALREADY_RUNNING` 출력 후 종료

### send.cmd
```
send.cmd <channel> <from> <to> <message>
```
- A의 send.cmd와 동일 동작 (channels/<channel>/inbox.log에 JSON append)
- watcher가 살아있으면 자동으로 수신측에 notification 전달

### stop_watcher.cmd
```
stop_watcher.cmd <channel> <as>
```
- 동작: PID 파일 읽어 `Stop-Process`, PID 파일 제거
- stale PID(프로세스 이미 죽음) 발견 시 파일만 정리
- 결과: `WATCHER_STOPPED pid=...` 또는 `STALE_PID_CLEANED pid=...`

## 사용 흐름 (B 세션 측)

```
[1] watcher 가동 (Monitor 단일 호출)
    LLM: Monitor(
           command="~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/start_watcher.cmd ab session_b",
           persistent=true
         )
    → Monitor가 .cmd 진입 + stdout 구독 동시 수행
    → 첫 이벤트: WATCHER_START channel=ab as=session_b pid=...
    → 이후 새 라인이 system reminder 형태로 인입

[2] 메시지 보내기 (필요 시)
    Bash: ~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/send.cmd ab session_b session_a "hello back"

[3] 종료 시
    Bash: ~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/scripts/stop_watcher.cmd ab session_b
```

## 장단점

| | |
|---|---|
| 장 | 외부 의존성 0으로 push에 근접 |
| 장 | A와 inbox 구조 호환 — 한 채널을 A·B 혼용 가능 |
| 장 | watcher가 죽어도 .read_<as>로 다음 재기동 시 누락 없음 |
| 단 | 양 세션 모두 watcher 셋업 필요 |
| 단 | LLM 턴은 비선점 — long-running 턴 중엔 notification 큐 적재 후 다음 턴에 처리 |
| 단 | `Get-Content -Wait`은 폴링 기반(~2초) — 즉시 push는 아님 |
| 단 | PID 관리 책임 (stale 정리는 stop이 처리하나, 비정상 종료 시 .pid 남음) |

## 학습 포인트
- **A 대비 추가된 것은 "보초(watcher) + 알림 채널(stdout→Monitor)" 둘뿐**
- 전달 채널(파일)은 그대로 → "깨우기를 누가 책임지나"의 본질 체감
- watcher가 가장 단순한 형태의 **이벤트 루프** — D·E의 더 본격적 메시지 큐 이해의 발판

## 주의사항
- watcher 종료 시 PID 파일 정리는 이중 안전망 패턴:
  - 정상 종료/Monitor TaskStop → `start_watcher.ps1` finally 블록이 PID 파일 정리
  - 강제 종료(Monitor timeout·세션 종료 등 finally skip) → 다음 기동 시 `start_watcher.ps1` last-resort 가드(alive/stale/unreadable 3분기)가 stale 자동 복구 후 진행
  - 두 경로 모두 동일 채널·동일 as 재기동을 차단하지 않음 (stale 자동 흡수)
- 동일 채널·동일 as로 alive인 watcher가 이미 있는 경우만 `WATCHER_ALREADY_RUNNING`으로 중복 기동 거부
- 백엔드 한계(~2초 지연)가 거슬리면 향후 `.NET FileSystemWatcher`로 교체 가능

## 구현 메모

### 2-layer 구조 (.cmd → .ps1) 설계 근거

```
┌──────────────────────────────────────────────────┐
│ Layer 1: .cmd  (얇은 어댑터, ~15줄)              │
│   외부 인터페이스 정규화                          │
└──────────────────────────────────────────────────┘
                  │ powershell -File 위임
                  ▼
┌──────────────────────────────────────────────────┐
│ Layer 2: .ps1  (도메인 로직)                     │
│   JSON Lines · Get-Content -Wait · PID 관리      │
└──────────────────────────────────────────────────┘
```

- **본체가 PowerShell인 이유**: batch는 `Get-Content -Wait` 같은 파일 tail,
  JSON 직렬화, ISO8601 UTC, GUID, 안전한 PID 관리가 모두 부재 — 흉내내려면
  수십 줄 + race condition
- **.cmd로 한 번 더 감싼 이유**: PowerShell 직접 호출은 외부 인터페이스가
  까다로움. .cmd가 다음을 흡수
  - 위치 인자 → 환경변수 변환 (quoting 함정 회피)
  - `-NoProfile -ExecutionPolicy Bypass` 박아두기
  - `chcp 65001` UTF-8 코드페이지 강제
  - `exit /b %ERRORLEVEL%` 종료코드 전파
- **부수 효과**: 진입점이 짧고 안정적 → 자동승인 prefix 매칭 깔끔.
  호출 환경(Git Bash/cmd/PowerShell/Bash tool)에 무관하게 동일 명령으로 진입

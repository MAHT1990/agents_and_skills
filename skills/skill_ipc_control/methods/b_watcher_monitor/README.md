# Method B — Watcher + Monitor

A의 파일 채널 위에 **백그라운드 watcher**를 얹어, 받는 쪽이 가만히 있어도 메시지 도착을 인지하는 방식.
Claude Code의 `Monitor` 도구와 짝지어 사용.

## 동작 그림

```
[B 세션 시작 시점]
   ┌─────────────────────────────────────────────────────┐
   │ LLM: Bash(run_in_background:true,                   │
   │        command="start_watcher.cmd <ch> <as>")       │
   │  → 백그라운드 task id 반환                          │
   │ LLM: Monitor(task_id) 로 stdout 라인 구독           │
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
- LLM이 `Monitor` 도구로 그 백그라운드 task를 구독 → 새 라인이 notification으로 도착
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

| 작업 | 사용 도구 | 정확한 호출 형태 |
|---|---|---|
| watcher 가동 | **Monitor** | `Monitor(command="./skills/skill_ipc_control/methods/b_watcher_monitor/start_watcher.cmd <ch> <as>", persistent=true)` |
| 메시지 발신 | **Bash** | `./skills/skill_ipc_control/methods/b_watcher_monitor/send.cmd <ch> <from> <to> "<body>"` |
| watcher 종료 | **Bash** | `./skills/skill_ipc_control/methods/b_watcher_monitor/stop_watcher.cmd <ch> <as>` |
| (대안) watcher Bash 호출 | **Bash(run_in_background)** | `./skills/skill_ipc_control/methods/b_watcher_monitor/start_watcher.cmd <ch> <as>` |

### 매칭이 깨지는 패턴 (사용 금지)
- ❌ **PowerShell 도구로 호출** — `PowerShell(& ".\skills\...")` (prefix 미등록)
- ❌ **절대경로** — `C:\Users\kitor\.claude\skills\...` 또는 `/c/Users/kitor/.claude/skills/...`
- ❌ **백슬래시 경로** — `.\skills\skill_ipc_control\methods\...`
- ❌ **다른 cwd 기준 경로** — `cd skills/skill_ipc_control && ./methods/.../send.cmd` (prefix가 `./methods/`로 시작해 매칭 X)
- ❌ **명령 chain** — `... && echo done` (chain된 명령은 별도 prefix 매칭 필요)

### 등록된 prefix (settings.json 사본)
```
Bash(./skills/skill_ipc_control/methods/b_watcher_monitor/send.cmd:*)
Bash(./skills/skill_ipc_control/methods/b_watcher_monitor/start_watcher.cmd:*)
Bash(./skills/skill_ipc_control/methods/b_watcher_monitor/stop_watcher.cmd:*)
Monitor(./skills/skill_ipc_control/methods/b_watcher_monitor/start_watcher.cmd:*)
```

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
[1] watcher 띄우기 (LLM이 Bash run_in_background로)
    $ start_watcher.cmd ab session_b
    → task_id 반환

[2] Monitor 구독
    → 이후 새 라인이 system reminder 형태로 인입

[3] 메시지 보내기 (필요 시)
    $ send.cmd ab session_b session_a "hello back"

[4] 종료 시
    $ stop_watcher.cmd ab session_b
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
- 동일 세션이 같은 채널에 watcher를 두 번 띄우려 하면 거부 (PID 파일 충돌 방지)
- watcher 프로세스가 비정상 종료되면 `.watcher_<as>.pid`가 남음 → 다음 start 시 `ALREADY_RUNNING`처럼 보임
  - 회복: `stop_watcher.cmd` 한 번 호출 (stale 정리 후 재시작)
- 백엔드 한계(~2초 지연)가 거슬리면 향후 `.NET FileSystemWatcher` 로 교체 가능

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

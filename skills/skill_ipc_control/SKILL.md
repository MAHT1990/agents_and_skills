---
name: skill_ipc_control
description: 동일 디렉토리에서 동시 가동되는 복수 Claude Code 세션 간 IPC(프로세스간 통신)를 5가지 방식(A~E)으로 운용·실험하는 SKILL. methods/ 카탈로그 + channels/ 런타임 인스턴스 구조. MVP는 A(수동 폴링)·B(watcher + Monitor) 실구현, C/D/E는 학습 자료 README. 발동조건. case1. "ipc"·"세션간 통신"·"session 통신" 포함 요청. case2. "다중 세션 협업"·"세션 메시지" 관련 요청. case3. "/ipc" 슬래시 명령 또는 직접 호출.
---

# Goal
- 둘 이상의 Claude Code 세션 사이에서 메시지를 주고받는다
- 5가지 IPC 방식을 method 단위로 격납하여 실험·비교한다
- MVP는 A(manual polling)·B(watcher + Monitor)만 실구현, 나머지는 학습 자료

# Mandatory Behavior

> 본 SKILL 발동 모든 LLM 강제 적용. 메모리·다른 SKILL 규칙과 충돌 시 본 섹션 우선.

## 1. 송신 시 본문 echo
- `send.cmd` 호출 직전, 보낼 본문 전문을 console에 인용 박스로 출력
- 형식: `[송신 to=<to>] <본문 전문 그대로>`
- 요약·발췌·치환 금지
- 출력 후 즉시 send.cmd 호출
- console 출력 형식 세부는 `$$ref_console_pretty` 참조

## 2. 수신 시 본문 echo (자기 매칭에 한해)
- watcher 인입 메시지에 매칭 규칙 적용:
  - `to == self`
  - `to == "all"`
  - `to == "<a,b,c>"` 쉼표 split 후 self 포함
- 자기 매칭: `inbox.log` 마지막 라인 read → `[수신 from=<from>] <본문 전문>` 박스로 출력
- 자기 매칭 아님(to=다른 사람): 출력 X, `skip` 표기도 불필요, 다음 작업 진행
- console 출력 형식 세부는 `$$ref_console_pretty` 참조

## 3. `.cmd` 호출 prefix 강제
- `settings.json` `permissions.allow` 등록 prefix와 정확히 일치하는 형태로만 호출
- 허용:
  - `~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/send.cmd <args>`
  - `~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/start_watcher.cmd <args>`
  - `~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/stop_watcher.cmd <args>`
  - `Monitor(~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/start_watcher.cmd <args>)`
- 금지:
  - 절대경로 (`C:/Users/...`, `/c/Users/...`, `/home/...`)
  - 백슬래시 (`~\.claude\skills\...`)
  - cwd 상대경로 (`./skills/...`, `skills/...`)
  - PowerShell 도구로 호출
  - 명령 chain (`&& ...`, `; ...`, `| ...`)
- 호출 직전 self-check 1회 필수

# References

- $$ref_console_pretty = "./references/console_pretty_output.md"

# Variables
- $$method: 사용할 IPC 방식 식별자
  - `a_manual_polling` — 파일 + 사람 트리거
  - `b_watcher_monitor` — 파일 + 백그라운드 watcher
  - `c_hook_autoread` — settings.json hook (구현 예정)
  - `d_external_queue` — SQLite/Redis 큐 (구현 예정)
  - `e_mcp_server` — 커스텀 MCP 서버 (구현 예정)
- $$action: 수행 작업
  - `start` / `send` / `recv` / `status` / `stop`
- $$channel: 채널 이름 (자유 문자열, 예: `ab`, `dev`)
- $$as: 자기 세션 식별자 (예: `session_a`)
- $$to: 받는 세션 식별자 (`send` 시)
- $$message: 메시지 본문 (`send` 시)

# Concepts

## 디렉토리 구조

```
skill_ipc_control/
 ├─ SKILL.md
 ├─ methods/                 ← 정적 카탈로그 (구현·문서)
 │   ├─ a_manual_polling/
 │   ├─ b_watcher_monitor/
 │   ├─ c_hook_autoread/     (README only)
 │   ├─ d_external_queue/    (README only)
 │   └─ e_mcp_server/        (README only)
 └─ channels/                ← 런타임 인스턴스 (gitignore)
     └─ <channel>/
         ├─ inbox.log              (JSON Lines, 모든 메시지 누적)
         ├─ .read_<as>             (처리한 메시지 id 셋)
         └─ .watcher_<as>.pid      (watcher 띄웠을 때만 존재)
```

## 메시지 라인 포맷 (JSON Lines)
- 한 라인 = 한 메시지
- 필드: `id`, `ts`, `from`, `to`, `body`
- 예: `{"id":"msg_20260512143000123_a1b2c3","ts":"2026-05-12T14:30:00Z","from":"session_a","to":"session_b","body":"hello"}`

## 정책 요약
- channel 이름: 자유 문자열, 검증 없음
- 세션 등록: 명시적 없음. `.watcher_<as>.pid` 존재가 listening 신호
- 읽음 추적: A·B 통일. `.read_<as>` 파일에 처리 id 누적
- watcher: PID 파일 + 명시적 stop. 백엔드는 PowerShell `Get-Content -Wait`
- 자동성: 실행 보조만. 침습적 hook·자동 기동 X
- 플랫폼: Windows .cmd 진입점, 실제 로직은 PowerShell .ps1 위임

## broadcast / 그룹 라우팅 (to 필드 컨벤션)
- `to` 약속어
  - `<single>`  — 1:1 다이렉트 (예: `session_b`)
  - `all`       — 전원 broadcast (자기 자신 포함, 발신자도 자기 송신분 인입됨)
  - `<a,b,c>`   — 명시 그룹 (쉼표 구분, 양옆 공백 허용)
- 수신측 매칭 규칙 (의사코드)
  ```
  t = msg.to.strip()
  if t == self            → match
  if t == "all"           → match
  if "," in t             → match if self in [p.strip() for p in t.split(",")]
  else                    → skip
  ```
- 적용
  - method A: `recv.ps1`이 위 매칭을 `Test-IpcToMatch` 함수로 구현
  - method B: **stage 3(watcher stdout) → stage 5(LLM 매칭) 사이 전 단계에서 필터 X**
    - Monitor command = `start_watcher.cmd` 단독 호출만 허용 — 파이프(`|`)·후가공(grep/awk/sed 등) 일체 금지
    - watcher 스크립트도 모든 라인을 가공 없이 stdout으로 흘림
    - 매칭은 stage 5(수신측 LLM)에서만 수행 — 위 규칙을 LLM 컨벤션으로 적용
    - 이유: 투명성(silent drop 방지) / 정책 변경 비용(재기동 회피) / 세션 간 표준화 / `.read_<as>` 일관성 / transport-semantic 책임 분리

# Steps

## Step 1. method 안내 (선택지 제시)
- 사용자가 $$method를 명시하지 않은 경우, methods/ 카탈로그를 안내한다
- 구현 상태(MVP / 학습 자료)를 명시한다
- 사용자가 method를 고르면 해당 `methods/<method>/README.md`의 핵심을 발췌해 보여준다

## Step 2. action 디스패치

### a_manual_polling
- `send`: `methods/a_manual_polling/send.cmd <channel> <from> <to> <message>` 호출
- `recv`: `methods/a_manual_polling/recv.cmd <channel> <as>` 호출
- `start`/`stop`: 해당 없음 (watcher 없음 — manual)
- `status`: `channels/<channel>/` 디렉토리 조회로 대체

### b_watcher_monitor
- `start`:
  0. **사전 점검 (stale PID 검증)**
     - `channels/<channel>/.watcher_<as>.pid` 존재 여부 확인
     - 없음 → 1단계로 진행
     - 있음 → 파일에서 PID 읽어 `Get-Process -Id <pid> -ErrorAction SilentlyContinue`로 alive 검사
       - **alive** → 중복 기동 거부, status로 안내 후 종료 (Error Handling 참조)
       - **stale (프로세스 미존재)** → 사용자에게 PID·channel·as 보고 후 **동의 확인**, 동의 시 PID 파일 삭제 → 1단계로 진행
     - 자동 삭제 금지 — 사용자 동의 없이는 stale이라도 보존
  1. `Monitor` 도구로 직접 기동:
     - 호출: `Monitor(command="~/.claude/skills/skill_ipc_control/methods/b_watcher_monitor/start_watcher.cmd <channel> <as>", persistent=true)`
     - watcher stdout (JSON Lines, 한 줄 = 한 메시지) → 한 notification으로 인입
     - 세션 lifespan 동안 유지, 종료는 `stop_watcher.cmd`
     - 중간 필터 금지 (grep/awk/sed/`|`) — `# Mandatory Behavior 3` 및 `## broadcast / 그룹 라우팅` 정책과 일관
     - 안티패턴: `Bash(run_in_background: true)`로 띄우는 방식 — 완료 시 1회 알림이라 watcher의 무한 tail 특성과 불일치, 채택 금지
- `send`: `methods/b_watcher_monitor/send.cmd <channel> <from> <to> <message>` 호출
- `stop`: `methods/b_watcher_monitor/stop_watcher.cmd <channel> <as>` 호출 (PID 파일 기반)
- `status`: `channels/<channel>/.watcher_<as>.pid` 존재 + tasklist로 alive 확인

### c_hook_autoread / d_external_queue / e_mcp_server
- 구현 예정 안내
- 해당 README.md 핵심을 제시하여 학습 자료로 활용

## Step 3. 결과 보고

### send
- 호출 결과 stdout을 그대로 표시
- 핵심: 발급된 메시지 id, ts, channel, from, to

### recv
- 새로 받은 메시지 배열을 그대로 표시
- 항목: id, ts, from, body
- 없으면 `NO_NEW` 라인 그대로 표시

### start (b만)
- watcher PID, channel, as
- Monitor 구독 안내

### stop (b만)
- 종료된 PID

# Error Handling
- $$method 미지원/오타 → 지원 method 목록 출력 (`methods/` 디렉토리 스캔)
- methods/<method>/ 디렉토리 없음 → 경로 점검 안내, 종료
- channels/<channel>/ 미존재 시
  - `send` → 자동 생성 (send.cmd 안에서 처리)
  - `recv` → `NO_INBOX` 보고, 종료
- `.watcher_<as>.pid` 이미 존재 (B의 start)
  - **alive (Get-Process 성공)** → 중복 기동 거부, status로 안내 후 종료
  - **stale (Get-Process 실패, 프로세스 미존재)** → 사용자에게 PID·channel·as 보고, **동의 확인 후** PID 파일 삭제 → start 재시도
- start_watcher.ps1 last-resort 가드 (LLM 사전 점검을 우회한 경우)
  - alive 감지 → `WATCHER_ALREADY_RUNNING channel=<c> as=<a> pid=<p>` 출력 후 비정상 종료
  - stale 감지 → `WATCHER_STALE_PID_REMOVED channel=<c> as=<a> pid=<p>` 출력 후 PID 파일 삭제·진행
  - PID 파싱 실패 (빈 파일·비정수·잘림) → `WATCHER_STALE_PID_REMOVED channel=<c> as=<a> pid=<unreadable>` 출력 후 PID 파일 삭제·진행 (stale로 간주)
- PowerShell 실행 실패 (execution policy 등) → ExecutionPolicy Bypass 옵션 안내

# Method Index

| method | 상태 | 한 줄 설명 |
|---|---|---|
| a_manual_polling | MVP | 파일 + 사람 트리거, 가장 단순한 IPC 기초 |
| b_watcher_monitor | MVP | 파일 + 백그라운드 watcher → push에 근접 |
| c_hook_autoread | 학습 자료 | settings.json hook으로 매 턴 자동 inbox 주입 (침습적) |
| d_external_queue | 학습 자료 | SQLite/Redis 큐로 구조화·다중 세션 라우팅 |
| e_mcp_server | 학습 자료 | 커스텀 MCP 서버로 도구 추상화 |

# Output
- 사용자 요청 action별 결과를 stdout 그대로 + 한 줄 요약으로 보고
- 침습적 자동화 없음 (자동 hook X, 자동 기동 X)
- 모든 명령은 사용자 명시 트리거에서만 수행 (실행 보조 모드)

# Extension Notes
- bin/ 디렉토리 없음 (의도적). methods/<name>/*.cmd 직접 호출
- 손에 익은 후 공통 인터페이스가 보이면 추후 bin/ 디스패처 추가 가능
- 신규 method 추가 시 methods/<new>/ 디렉토리 + README + cmd 묶음 추가만으로 확장

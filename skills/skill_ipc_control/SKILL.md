---
name: skill_ipc_control
description: 동일 디렉토리에서 동시 가동되는 복수 Claude Code 세션 간 IPC(프로세스간 통신)를 5가지 방식(A~E)으로 운용·실험하는 SKILL. methods/ 카탈로그 + channels/ 런타임 인스턴스 구조. MVP는 A(수동 폴링)·B(watcher + Monitor) 실구현, C/D/E는 학습 자료 README. 발동조건. case1. "ipc"·"세션간 통신"·"session 통신" 포함 요청. case2. "다중 세션 협업"·"세션 메시지" 관련 요청. case3. "/ipc" 슬래시 명령 또는 직접 호출.
---

# Goal
- 둘 이상의 Claude Code 세션 사이에서 메시지를 주고받는다
- 5가지 IPC 방식을 method 단위로 격납하여 실험·비교한다
- MVP는 A(manual polling)·B(watcher + Monitor)만 실구현, 나머지는 학습 자료

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
  1. `Bash(run_in_background: true)`로 `methods/b_watcher_monitor/start_watcher.cmd <channel> <as>` 호출
  2. 반환된 background task id를 `Monitor` 도구로 구독
  3. 이후 새 라인이 도착하면 notification으로 자동 인입
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
- `.watcher_<as>.pid` 이미 존재 (B의 start) → status로 안내, 중복 기동 거부
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

# Method F — HTTP Relay (디바이스간 IPC)

외부 중계 서버의 URL을 공유 매체로 삼아, 서로 다른 네트워크·디바이스 사이에서 메시지를 주고받는 방식.
저장 단위는 봉투 `{id, ts, from, to, body}`, 읽음 추적은 `since` 커서(마지막 본 id).
watcher가 `/recv` 폴링을 내부에서 돌려, 수신 LLM은 Monitor stdout → 프롬프트 인입으로 메시지를 받는다(직접 recv 호출 없음).

> 입문 실습(서버 직접 띄우기·터널·검증)은 `RUNBOOK.md` 참조. 본 README는 메서드 카탈로그 개요.

## 동작 그림

```
[디바이스 A]                  [중계 서버 server.mjs :8787]            [디바이스 B]
 send.cmd                     ┌──────────────────────────┐
   └─ POST /send ───────────▶ │ msgs[] (봉투 배열)         │
      {from,to,body}          │  서버가 id·ts 부여         │
                              │                          │ ◀── GET /recv?since=<커서>
                              └──────────────────────────┘        │  watcher 프로세스(폴링)
                                                                   │   └─ 새 봉투 raw → stdout
                                                                   ▼
                                                            Monitor notification
                                                                   ▼
                                                            B 세션 LLM 다음 턴 자동 인입
```

## 핵심 메커니즘
- 공유 매체 = 채널별 중계 URL — `channels/<channel>/.relay_url`에 기록 (`set_url`로 1회 설정)
- 저장 단위 = 봉투 `{id, ts, from, to, body}`
- `id`는 **서버가 단조 부여** (`msg_000000`...) — 순서·유일성의 단일 소스
- 읽음 추적 = `channels/<channel>/.cursor_<as>` (마지막 본 id). watcher가 since로 쓰고 갱신, stop 후에도 보존
- watcher가 `/recv?since=<커서>` 폴링 → 새 봉투를 **가공 없이 stdout**으로 흘림 (필터 X)
- `/recv`가 모르는 id를 받으면 **전부 반환** → 서버 재시작 후 조용한 누락 방지
- 본문에 줄바꿈이 있어도 커서가 id 기준이라 셈이 틀어지지 않음
- **`to` 매칭은 SKILL.md "broadcast / 그룹 라우팅" 정책을 따름**
  - 매칭 layer: stage 3(watcher stdout) → stage 5(LLM 매칭) 사이 필터 X — Monitor command는 `start_watcher.cmd` 단독 호출만 허용
  - 매칭 수행은 stage 5(수신측 LLM)에서만:
    - `to == self` 매치
    - `to == "all"` 매치 (자기 송신분 포함)
    - `to == "a,b,c"` 쉼표 split 후 self 포함 시 매치
    - 그 외 skip

## 호출 규칙 (자동승인 매칭)

**이 형태로만 호출한다.** settings.json `permissions.allow`에 등록된 prefix와 정확히 일치해야 매번 승인 프롬프트 없이 동작한다.

> **왜 `~/.claude/...` 인가**: `~`은 Bash가 `$HOME`으로 expand하여 머신 독립적. Claude Code permission은 raw 문자열 prefix 매칭이라 모든 머신에서 동일 prefix가 매칭됨. cwd와도 무관.

| 작업 | 사용 도구 | 정확한 호출 형태 |
|---|---|---|
| URL 설정 (1회) | **Bash** | `~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/set_url.cmd <ch> <url>` |
| watcher 가동 | **Monitor** | `Monitor(command="~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/start_watcher.cmd <ch> <as>", persistent=true)` |
| 메시지 발신 | **Bash** | `~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/send.cmd <ch> <from> <to> "<body>"` |
| watcher 종료 | **Bash** | `~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/stop_watcher.cmd <ch> <as>` |

### 등록된 prefix (settings.json 사본)
```
Bash(~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/set_url.cmd:*)
Bash(~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/send.cmd:*)
Bash(~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/start_watcher.cmd:*)
Bash(~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/stop_watcher.cmd:*)
Monitor(~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/start_watcher.cmd:*)
```

### 사용 금지 패턴
- ❌ `Bash(run_in_background:true)`로 watcher 호출 — watcher는 무한 폴링이라 "완료 1회 알림" 모델과 불일치
- ❌ PowerShell 도구 직접 호출 / 머신 dependent 절대경로 / 백슬래시 경로 / cwd 상대경로 / 명령 chain(`&&`, `;`, `|`)

## 명령

### set_url.cmd
```
set_url.cmd <channel> <url>
```
- 동작: 채널의 중계 URL을 `channels/<channel>/.relay_url`에 기록 (끝 슬래시 제거)
- 결과: `RELAY_URL_SET channel=... url=...`
- send·watcher 이전에 1회 필요 (미설정 시 `RELAY_URL_NOT_SET`)

### send.cmd
```
send.cmd <channel> <from> <to> <message>
```
- 동작: `.relay_url`의 `/send`로 봉투 `{from,to,body}` POST (서버가 id·ts 부여)
- 본문은 UTF-8 바이트로 전송 (한글 mojibake 방지)
- 결과: `SENT id=... ts=... channel=... from=... to=...`

### start_watcher.cmd
```
start_watcher.cmd <channel> <as>
```
- 동작: PID 파일 기록 후 `/recv?since=<커서>`를 폴링(기본 2초, env `IPC_POLL_SEC`로 조정)하여 새 봉투를 stdout에 흘림
- 결과 첫 라인: `WATCHER_START channel=... as=... pid=... url=... since=...`
- 이후: 새 봉투 JSON 라인을 그대로 흘림 (필터 X — 수신측 LLM이 to 비교)
- 손상 라인은 `MALFORMED_LINE channel=... as=... raw=...`로 가시화
- 중복 기동 방지: alive PID 존재 시 `WATCHER_ALREADY_RUNNING`, stale이면 정리 후 진행

### stop_watcher.cmd
```
stop_watcher.cmd <channel> <as>
```
- 동작: PID 파일 읽어 `Stop-Process`, PID 파일 제거 (커서 `.cursor_<as>`는 보존)
- 결과: `WATCHER_STOPPED pid=...` 또는 `STALE_PID_CLEANED pid=...`

## MALFORMED_LINE 처리 컨벤션

watcher stdout 인입 라인이 `MALFORMED_LINE channel=... as=... raw=...` 형태이면 LLM은 아래를 강제 적용한다.

| 항목 | 동작 |
|---|---|
| 자기 매칭 | 시도하지 않음 (정상 메시지로 오인 금지) |
| 사용자 보고 | 즉시 보고 — raw 원본 그대로 + 송신/서버 점검 안내 |
| 커서 기록 | 정상 봉투만 (손상 라인은 커서 전진 X) |
| 다음 작업 | 보고 후 진행 |

## 사용 흐름 (수신 세션 측)

```
[0] 전제: 중계 서버 + 외부 도달 URL 가동 (사용자, RUNBOOK.md §3~4 참조)
    node server.mjs  /  cloudflared tunnel --url http://localhost:8787

[1] URL 설정 (1회)
    Bash: ~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/set_url.cmd ab https://xxx.trycloudflare.com

[2] watcher 가동 (Monitor 단일 호출)
    Monitor(command="~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/start_watcher.cmd ab session_b", persistent=true)
    → 첫 이벤트: WATCHER_START ...
    → 이후 새 봉투가 notification으로 인입

[3] 메시지 보내기 (필요 시)
    Bash: ~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/send.cmd ab session_b session_a "hello back"

[4] 종료 시
    Bash: ~/.claude/skills/skill_ipc_control/methods/f_http_relay/scripts/stop_watcher.cmd ab session_b
```

## 채널 인스턴스 파일

```
channels/<channel>/
 ├─ .relay_url          중계 URL (set_url로 기록)
 ├─ .cursor_<as>        마지막 본 봉투 id (stop 후에도 보존)
 └─ .watcher_<as>.pid   watcher 가동 중에만 존재
```

## 장단점

| | |
|---|---|
| 장 | 다른 네트워크·디바이스 간 통신 — 로컬 파일 한계 돌파 |
| 장 | 봉투+id 커서로 그룹 라우팅 지원, 본문 멀티라인 안전 |
| 장 | watcher가 폴링을 내부에서 처리 → 수신 LLM은 push로 받음 |
| 단 | 중계 서버·외부 도달(URL)을 사용자가 가동해야 함 |
| 단 | 폴링 기반(기본 2초) — 즉시 push 아님 (후속 R4) |
| 단 | 서버 메모리 저장 → 재시작 시 소실·id 충돌 가능 (후속 R2) |
| 단 | 인증 없음 — 개인 디바이스용 가정 (후속 R3) |

## 보강 라운드
- **R1 (적용)**: 봉투 + id 커서 — 멀티라인·라우팅 해결
- **R5 (적용)**: 운용 표면(set_url/send/start/stop) + 스킬 결선
- **R2~ (후속)**: 내구성(영속화) / 인증·도달안정 / 즉시 push(SSE)

## 구현 메모
- 2층 구조 `.cmd → .ps1`: 진입점 `.cmd`는 인자 정규화·`chcp 65001`·`-ExecutionPolicy Bypass`·종료코드 전파를 흡수, 도메인 로직은 `.ps1`
- watcher 본체가 PowerShell인 이유: HTTP 요청·JSON 파싱·PID 관리가 batch엔 부재
- 이 환경(PS5.1 한국어 로케일)에서 한글 포함 `.ps1`은 **UTF-8 BOM 필수** — 없으면 cp949로 오독되어 파싱 실패
```

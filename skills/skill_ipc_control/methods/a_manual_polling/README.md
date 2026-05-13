# Method A — Manual Polling

가장 raw한 IPC. 파일 1개를 두 세션이 append·read로 공유.
받는 쪽 깨우기는 **사람이 직접 트리거** (자동 알림 없음).

## 동작 그림

```
[세션 A]                  [디스크]                  [세션 B]
   │                         │                         │
   │ send.cmd ─────────────►│ inbox.log               │
   │  (append JSON 라인)     │ 누적                    │
   │                         │                         │
   │                         │  ◄── 사람 트리거         │
   │                         │     "확인해줘"          │
   │                         │                         │
   │                         │  ◄── recv.cmd ──────────│
   │                         │     (.read_<as>로 필터) │
```

## 핵심 메커니즘
- 모든 메시지는 `channels/<channel>/inbox.log`에 한 줄씩 append (JSON Lines)
- `.read_<as>` 파일에 처리한 메시지 id 누적 → 중복 처리 방지
- watcher 없음. recv가 호출될 때만 새 메시지 검사

## 메시지 라인 포맷

```json
{"id":"msg_<ts>_<rand>","ts":"2026-05-12T14:30:00Z","from":"session_a","to":"session_b","body":"hello"}
```

## 명령

### send.cmd
```
send.cmd <channel> <from> <to> <message>
```
- 동작: inbox.log에 JSON 라인 1개 append, 메시지 id 발급
- 결과: `SENT id=msg_... ts=... channel=... from=... to=...`
- channels/<channel>/ 디렉토리는 없으면 자동 생성

### recv.cmd
```
recv.cmd <channel> <as>
```
- 동작: inbox.log 라인 중 `to == <as>` 이면서 `.read_<as>`에 없는 것만 출력
- 결과: 새 메시지마다 id/ts/from/body 출력 + `.read_<as>`에 id 추가
- 새 메시지 없으면 `NO_NEW channel=... as=...`

## 장단점

| | |
|---|---|
| 장 | 의존성 0, 가장 단순, 학습 출발점으로 최적 |
| 장 | 메시지 누적이 그대로 로그·아카이브 |
| 단 | 자동 깨우기 없음 — 사람이 매번 "확인해줘" 트리거 |
| 단 | 멀티라인 본문 시 JSON escape에 PowerShell 의존 |

## 학습 포인트
- **IPC 두 문제(전달 채널 / 깨우기) 중 전달만 풀고 깨우기는 손 안 댐**
- B로 가면 깨우기 문제도 해결 → A와 비교가 즉시 됨
- D·E의 message id 개념이 이미 여기 등장 → 자연스러운 확장 경로

## 한계 체감 시나리오
- 시간 차이가 있는 두 세션 간 메모 — A로 충분
- 실시간 협업 — A는 부족 (B 필요)
- 멀티라인 코드 스니펫 — JSON으로 escape는 되지만 가독성 낮음
- 3개 이상 세션 라우팅 — 단일 inbox.log + to 필터로 동작은 하나 D가 더 정상

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
│   JSON Lines · 읽음 추적(.read_<as>) · 파일 IO   │
└──────────────────────────────────────────────────┘
```

- **본체가 PowerShell인 이유**: batch는 JSON 직렬화, ISO8601 UTC, GUID,
  UTF-8 안전 append가 모두 부재 — 흉내내려면 수십 줄 + escape 지옥
- **.cmd로 한 번 더 감싼 이유**: PowerShell 직접 호출은 외부 인터페이스가
  까다로움. .cmd가 다음을 흡수
  - 위치 인자 → 환경변수 변환 (quoting 함정 회피)
  - `-NoProfile -ExecutionPolicy Bypass` 박아두기
  - `chcp 65001` UTF-8 코드페이지 강제
  - `exit /b %ERRORLEVEL%` 종료코드 전파
- **부수 효과**: 진입점이 짧고 안정적 → 자동승인 prefix 매칭 깔끔.
  호출 환경(Git Bash/cmd/PowerShell/Bash tool)에 무관하게 동일 명령으로 진입

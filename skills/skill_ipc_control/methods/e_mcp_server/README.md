# Method E — Custom MCP Server (구현 예정)

메시지 송수신을 셸 명령이 아닌 **LLM 도구 호출**로 추상화.
가장 본격적인 IPC 형태. 단, MCP 단독으론 **push 불가** (별도 watcher 필요).

## 동작 그림

```
                ┌──────────────────────────────┐
                │  MCP Server (stdio)          │
                │                              │
                │  Tools:                      │
                │   ipc_send(channel, from,    │
                │            to, body)         │
                │   ipc_inbox(channel, as)     │
                │   ipc_sessions(channel)      │
                │                              │
                │  Storage: SQLite (D 재활용)  │
                └──────────────┬───────────────┘
                               │ stdio MCP
              ┌────────────────┴────────────────┐
              │                                 │
   ┌──────────┴───┐                  ┌──────────┴───┐
   │  세션 A      │                  │  세션 B      │
   │  ipc_send()  │                  │  ipc_inbox() │
   │  도구 호출   │                  │  도구 호출   │
   └──────────────┘                  └──────────────┘
```

## 핵심 메커니즘
- LLM이 직접 `ipc_send`, `ipc_inbox` 같은 **도구**를 호출
- 셸 인용·escape 사라짐 (JSON 인자로 안전 전달)
- 저장소는 D의 SQLite 재활용 가능
- MCP의 stdio 모드 → 각 Claude Code 세션이 클라이언트로 접속

## Push가 안 되는 이유

```
[MCP 표준 동작]

   LLM 결정:              MCP Server:
   "ipc_inbox() 호출" ──► 응답: ["msg1", "msg2"]
   ↑
   LLM이 호출 안 하면
   서버는 가만히 있음
```

MCP는 **JSON-RPC Request-Response** 모델. 서버가 "야 메시지 왔어!" 하고 클라이언트(LLM)를 깨우는 표준 메커니즘이 없음.

서버→클라이언트 notification 기능은 있으나, LLM 컨텍스트에 자동 주입되는 표준이 정의되어 있지 않음.

## Push가 필요하면 — 하이브리드

```
  MCP Server (저장·도구)   +   Background Watcher (push)
       │                              │
       │ SQLite                       │ tail watcher
       ▼                              ▼
   sqlite.db ◄────── watch ────── B의 백그라운드
                                      │
                                      ▼
                                 Monitor notification
                                      │
                                      ▼
                                  B LLM 깨움
```

즉 E는 **B의 watcher 패턴 + D의 저장소 + MCP의 도구 인터페이스** 결합.

## 예상 도구 인터페이스 (의사)

```
ipc_send(channel: str, from: str, to: str, body: str)
  → 메시지 id, ts 반환

ipc_inbox(channel: str, as: str, unread_only: bool = true)
  → 메시지 배열 반환 + 자동 read 표시

ipc_sessions(channel: str)
  → 현재 채널 참여 세션 목록 (watcher 상태 등)

ipc_register(channel: str, as: str)  (선택)
  → 세션 명시 등록
```

## 장단점

| | |
|---|---|
| 장 | 셸 escape·플랫폼 의존성 사라짐 |
| 장 | 도구 호출 추상화 — LLM 입장에서 자연스러움 |
| 장 | MCP 표준이라 다른 도구·SDK와 호환 |
| 장 | D의 저장 구조 그대로 재사용 |
| 단 | MCP 서버 직접 구축 부담 (Python/Node SDK 사용) |
| 단 | Push가 필요하면 watcher 별도 운영 (B의 메커니즘 병행) |
| 단 | 세션마다 MCP 서버 등록 필요 (`.mcp.json` 수정) |
| 단 | 메시지 라우팅 책임이 서버에 집중 — 단일 실패 지점 |

## MVP 제외 이유
A·B·D를 손에 익힌 후 도전하는 게 자연스러움. 구축 비용이 가장 크고, "도구 추상화의 가치"는 raw 한 방식들을 한 번 만져본 뒤에 체감할 수 있음.

## 학습 포인트
- **"셸 명령" → "도구 호출"의 추상화 이행**이 본질
- A: 사람이 명령, B: 백그라운드가 명령, E: LLM이 직접 도구 호출
- MCP의 본질은 **클라이언트가 호출하는 인터페이스 표준** — push 도구가 아님
- "MCP만으로 push가 안 된다"는 사실의 원인 = JSON-RPC Request-Response 모델
- 진짜 push는 항상 외부 보초(watcher) 필요 — 추상화 수준이 올라가도 이 사실은 안 변함

## 구현 시 고려사항 (장차)
- 런타임 선택: Python (`mcp` 공식 SDK 가장 성숙) vs Node.js (`@modelcontextprotocol/sdk`)
- 트랜스포트: stdio (단순, 기본) vs HTTP/SSE (멀티 클라이언트, 복잡)
- 저장소: D의 SQLite 재활용 vs MCP 서버 메모리 (휘발)
- 인증: 동일 호스트 가정이면 생략, 멀티 호스트면 토큰 등 필요
- 등록 방식: 각 세션의 `.mcp.json`에 서버 entry 추가 가이드 필요
- 본격 push: MCP 서버 + watcher의 책임 분리 어떻게?

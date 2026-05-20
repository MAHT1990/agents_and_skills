# 실행 가이드 — ipc-monitor-web

## 1. 환경 요구사항
- Node.js 18+ (Windows 10/11)
- `skill_ipc_control` 루트 디렉토리 접근 권한
- 추가 도구 불요 (의존 0 클라이언트, 빌드 단계 없음)

## 2. 빌드 방법
**빌드 불필요.** 클라이언트는 Vanilla ESM, 서버는 Node 직접 실행.

```cmd
cd C:\Users\kitor\.claude\skills\skill_ipc_control\tools\web_monitor
npm install
```

## 3. 실행 방법

### 3.1 mock 모드 (기본)
`.env` 없이도 동작. 채널 3개와 가짜 메시지가 3초마다 push.

```cmd
monitor_start.cmd
```

브라우저: <http://127.0.0.1:3030>

중단: `monitor_stop.cmd`

### 3.2 실데이터 모드 (skill_ipc_control 채널 직결)
`.env` 파일 생성 후 `IPC_ROOT` 지정:

```cmd
copy .env.example .env
```

`.env` 편집:
```
PORT=3030
HOST=127.0.0.1
IPC_ROOT=C:\Users\kitor\.claude\skills\skill_ipc_control\channels
LOG_LEVEL=info
```

다시 `monitor_start.cmd`로 기동.

### 3.3 수동 실행 (디버깅용)
```cmd
node server\index.mjs
```

종료: Ctrl+C

### 3.4 스모크 테스트
```powershell
powershell -NoProfile -File smoke_test.ps1
```

healthz·channels·index 세 엔드포인트를 확인하고 자동 종료.

## 4. 포트 및 설정 정보

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | 3030 | HTTP 포트 |
| `HOST` | 127.0.0.1 | 바인딩 주소 (로컬 전용) |
| `IPC_ROOT` | (빈 값) | 채널 디렉토리 절대경로. 빈 값이면 mock 모드 |
| `LOG_LEVEL` | info | pino 로그 레벨 (debug/info/warn/error) |

### 사용 엔드포인트
| Path | 설명 |
|---|---|
| `GET /` | SPA 진입 (index.html) |
| `GET /healthz` | liveness 확인 |
| `GET /api/v1/config` | 현재 설정 조회 |
| `GET /api/v1/channels` | 채널 목록 |
| `GET /api/v1/channels/:name/messages?limit=N` | 메시지 snapshot |
| `GET /api/v1/stream?channels=a,b` | SSE 실시간 push |

## 5. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `MONITOR_ALREADY_RUNNING` | `.monitor.pid` 잔존 + alive | `monitor_stop.cmd` 실행 |
| 포트 충돌 | 3030 사용 중 | `.env`에서 `PORT` 변경 |
| 채널 안 보임 | `IPC_ROOT` 미설정/오타 | `.env` 확인. mock 모드는 3개 표시되어야 정상 |
| SSE 끊김 빨간 배너 | 서버 미기동 | `monitor_start.cmd` 재실행 |
| Dashboard 빈 화면 | JS 콘솔 에러 | DevTools → Console 탭 확인 |

## 6. 디버깅
- 로그 레벨 상향: `.env`에 `LOG_LEVEL=debug`
- 서버 콘솔 직접 확인: `monitor_start.cmd` 대신 `node server\index.mjs`로 포그라운드 실행
- 클라이언트: 브라우저 DevTools → Network → EventStream 탭에서 SSE 프레임 확인
- 파일 tail 동작 확인: `IPC_ROOT/<channel>/inbox.log`에 직접 1줄 append 후 SSE에 도착하는지 확인

## 7. MVP 범위 / v2 예정
**구현 완료 (MVP)**
- FR-001 채널 목록 / FR-004 라이브 스트림 / FR-009 SSE 푸시 / FR-010 tail 워커 / FR-018 config

**미구현 (v2 예정)**
- FR-002 Watcher 헬스 (`.watcher_<as>.pid` liveness)
- FR-003 세션 진행률 (`.read_<as>`)
- FR-005 MALFORMED 별도 가시화 (현재는 라인만 push)
- FR-006~008 필터·배지·상세
- FR-011 watcher 폴링
- FR-013 rate 미니차트 (sparkline 스텁만)
- FR-016 metrics

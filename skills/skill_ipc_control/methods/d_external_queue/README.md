# Method D — External Queue (SQLite/Redis) (구현 예정)

파일 append 대신 **구조화된 큐(SQLite 테이블 또는 Redis pub/sub)**에 메시지를 저장.
트랜잭션·인덱스·읽음 표시·라우팅을 데이터스토어가 무료로 제공.

## 동작 그림

```
[세션 A]                                         [세션 B]
   │                                                │
   │ INSERT INTO messages                ┌────────────┐
   │  (id, from, to, body, ts, read)     │  SQLite    │
   │ ─────────────────────────────────►  │   .db      │  ◄── SELECT
   │                                      │            │       WHERE to='B'
   │                                      └────────────┘       AND read=0
   │
   │                                            ┌─ (옵션) watcher
   │                                            │   파일 변경 감지
   │                                            │   B 깨움
```

## 핵심 메커니즘
- **저장소**: SQLite 단일 파일 또는 Redis 인스턴스
- **스키마 예시**:
  ```sql
  CREATE TABLE messages (
    id        TEXT PRIMARY KEY,
    channel   TEXT NOT NULL,
    from_id   TEXT NOT NULL,
    to_id     TEXT NOT NULL,
    body      TEXT NOT NULL,
    ts        TEXT NOT NULL,
    read      INTEGER DEFAULT 0
  );
  CREATE INDEX idx_to_unread ON messages(to_id, read);
  ```
- 메시지 id, 읽음 표시, 타임스탬프가 무료로 따라옴
- A·B의 `.read_<as>` 셋이 `read` 컬럼으로 대체

## 깨우기 메커니즘
- Pure pull: B가 `SELECT WHERE to=... AND read=0` 폴링
- Push 추가: SQLite 파일 변경을 watcher가 감지 (B의 메커니즘 재활용)
- Redis 사용 시: pub/sub로 자연스럽게 push

## 예상 인터페이스 (의사)

```
init.cmd <channel>
  → channels/<channel>/messages.db 초기화 + 스키마 적용

send.cmd <channel> <from> <to> <message>
  → INSERT INTO messages ...

recv.cmd <channel> <as>
  → SELECT WHERE to_id=<as> AND read=0
  → 결과 출력 + UPDATE read=1

start_watcher.cmd <channel> <as>  (선택)
  → 파일 변경 watcher (B의 백엔드 재사용)
```

## 장단점

| | |
|---|---|
| 장 | 메시지 id·읽음 표시·인덱스 자동 |
| 장 | 동시성 안전 (트랜잭션) |
| 장 | 3개 이상 세션 라우팅이 자연 (`WHERE to_id IN (...)`) |
| 장 | 메시지 archive·통계 분석 자유 (SQL) |
| 단 | SQLite CLI 또는 PowerShell ADO 의존 |
| 단 | Redis 사용 시 외부 서버 기동 부담 |
| 단 | 파일 한 줄 append 대비 복잡도 ↑ |

## MVP 제외 이유
2개 세션 채팅용으로는 오버킬. A·B를 손에 익힌 후 "구조화의 가치"를 체감하면 자연스럽게 진입.

## 학습 포인트
- **파일 append → 큐 INSERT 로의 이행이 본질**
- A의 `.read_<as>` 셋 ↔ DB의 `read` 컬럼: 같은 개념, 다른 구현
- B의 watcher ↔ Redis pub/sub: 같은 개념(보초), 다른 구현
- 메시지 큐(MQ) 시스템의 미니어처 — RabbitMQ·Kafka 학습 발판
- "왜 production에선 파일 append 안 쓰나"에 대한 답이 여기서 만들어짐

## 구현 시 고려사항 (장차)
- SQLite 선택 시: PowerShell의 `System.Data.SQLite` 또는 CLI `sqlite3.exe` 어느 쪽?
- 동시 쓰기 시 WAL 모드 활용 (`PRAGMA journal_mode=WAL`)
- Redis 선택 시: Windows 환경에서 Redis 설치·기동 가이드 필요
- 메시지 만료(TTL)·archive 정책
- 인덱스 전략 (to·read 복합)

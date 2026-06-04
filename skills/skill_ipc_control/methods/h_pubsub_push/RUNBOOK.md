# Runbook H — ntfy.sh pub/sub push (디바이스간 IPC, 깨우기까지 공짜)

> 디바이스간 IPC의 세 번째 런북. F·G는 받는 쪽이 **폴링**해야 했다. 여기선 **서버가 밀어준다(push)**.
> 입문 수준 — 안전장치·견고한 구조는 의도적으로 배제하고 핵심 원리만 본다.

- 상태: 입문 런북
- 원리 계보: **method B (`watcher_monitor`, 로컬 파일 + watcher push)의 네트워크판** — "보초"를 외부 pub/sub 서버가 대신

> 📝 **학습자 노트 (남겨두는 아쉬움):**
> 이 런북은 `ntfy.sh` **공개 서버를 빌려쓴다** — 가입조차 없이 가장 빨리 "실시간 디바이스간"이 되지만,
> **보초·전달을 내 스크립트/코드로 직접 쥐어보고 싶은 아쉬움**이 남는다.
> 그 욕심을 푸는 *실행 가능한* "직접 구현" 경로를 **§12**에 코드 스케치까지 정리해 둔다.
> 요지: **런북 F의 내 relay에 push 엔드포인트를 얹으면 = 내가 만든 ntfy(H)가 된다.**

---

## 0. 한 줄 요약

F·G에서 깨우기는 늘 **폴링**이었다(2초마다 "새 거 있어?" 묻기). 폴링의 한계: 묻기 전엔 모른다.

이번엔 매체를 **공개 토픽(ntfy.sh)**으로 두고, 보내면 **구독자에게 서버가 즉시 밀어준다.**

```
[F·G: 폴링]   B ──"새 거 있어?"──▶ 매체      (2초마다 반복, 묻기 전엔 모름)
              B ◀──"응/아니"──────

[H: push]     A ──메시지──▶ ntfy.sh 토픽 ──즉시 밀어줌──▶ B (구독만 걸어두면 끝)
```

핵심 대비: **method B의 "보초(watcher)"를 내 디바이스의 백그라운드 프로세스가 아니라 ntfy.sh 서버가 맡는다.**

> `ntfy.sh`는 **내가 만드는 게 아니라 이미 인터넷에 떠 있는 공개 서비스**다(주소 자체가 서비스: `https://ntfy.sh`).
> 공용 게시판처럼 `curl`로 발행/구독만 한다. "내가 만드는 버전"은 §12.

---

## 1. 새로 생기는 문제 — 도달도, 깨우기도 이미 풀려 있다

```
도달(NAT 너머)   F: 터널로 직접 / G: Upstash가 공개      →  H: ntfy.sh가 공개
깨우기            F·G: 내가 폴링 루프 작성                →  H: 서버가 push (구독만)
서버 운영         F: 내가 / G: Upstash                    →  H: ntfy.sh (가입조차 불필요)
```

→ 디바이스간의 두 숙제(도달·깨우기)를 **둘 다 외주** 준 형태. 가장 적은 수고로 "실시간 디바이스간"이 된다.

대신 대가: **공개 토픽이라 토픽명을 아는 사람은 누구나 읽고 쓸 수 있다** (§3 주의).

---

## 2. 무엇을 쓰나 — 토픽 1개 = 채널 1개

ntfy.sh는 **토픽(topic)** 단위 pub/sub다. 토픽 이름이 곧 `channel`이다.

```
POST ntfy.sh/<topic>            본문을 토픽에 발행          → send / method B의 send
GET  ntfy.sh/<topic>/raw        토픽 구독 — 새 메시지를      → recv(push) / method B의
                                연결로 흘려보냄(블록)          Get-Content -Wait watcher
```

`/raw`는 **연결을 끊지 않고** 새 메시지가 올 때마다 본문 한 줄을 흘린다. 이 "끊기지 않는 연결"이 곧 push다.

---

## 3. 사전 준비

| 항목 | 방법 |
|---|---|
| 가입 | **불필요** (공개 토픽은 그냥 사용) |
| curl | Windows 10+ 내장(`curl.exe`), Git Bash 둘 다 가능 |
| 토픽 이름 정하기 | **추측 불가능하게** — 예: `ipc-claude-7h3k9x2m` |

> ⚠️ 공개 토픽은 이름만 알면 누구나 구독·발행 가능하다. 흔한 이름(`test`, `chat`)은 남이 끼어든다.
> 입문 단계에선 랜덤 접미사를 붙인 토픽으로 충분하고, 진짜 보호는 §6의 account 토픽 또는 §12의 self-host로.

---

## 4. 단계별 실행 (해피 패스)

토픽을 하나 정한다. 이 런북 예시: `ipc-claude-7h3k9x2m` (본인 것으로 바꿀 것)

### Step 1. 디바이스 B에서 구독 걸어두기 (먼저!)
Git Bash 또는 PowerShell:
```bash
curl -s -N ntfy.sh/ipc-claude-7h3k9x2m/raw
# 여기서 멈춰(블록) 있는 게 정상 — 새 메시지를 기다리는 중
# (-N = 버퍼링 끄기, 즉시 출력)
```
이 창은 켜둔 채로 둔다. **이게 method B의 watcher에 해당하는 "보초"다.**

### Step 2. 디바이스 A에서 발행
```bash
curl -d "안녕 B 여기는 A" ntfy.sh/ipc-claude-7h3k9x2m
```
PowerShell 변형:
```powershell
Invoke-RestMethod -Method Post -Uri "https://ntfy.sh/ipc-claude-7h3k9x2m" -Body "안녕 B 여기는 A"
```

### Step 3. 디바이스 B 화면 확인
Step 1의 구독 창에 **즉시** 뜬다:
```
안녕 B 여기는 A
```
**폴링 루프를 한 줄도 안 짰는데 실시간으로 도착했다 — push 성공.**
(`/raw`는 keepalive로 가끔 빈 줄을 흘린다. 정상이다.)

### Step 4. (핵심) 기존 skill의 Monitor와 그대로 결합
ntfy 구독 = 끊기지 않고 stdout으로 흘리는 명령 → **Claude Code의 `Monitor` 도구에 그대로 얹힌다.**
이건 method B(`watcher + Monitor`)를 **디바이스간으로 옮긴 것과 정확히 같다.**

```
Monitor(
  command="curl -s -N https://ntfy.sh/ipc-claude-7h3k9x2m/raw",
  description="ntfy IPC: ipc-claude-7h3k9x2m",
  persistent=true
)
```

```
[method B 로컬]              [런북 H 디바이스간]
 start_watcher.cmd            curl -s -N .../raw
   = Get-Content -Wait    →     = ntfy 스트림 구독
 새 라인 → Monitor          새 메시지 → Monitor
   → LLM 다음 턴 인입          → LLM 다음 턴 인입
 (보초 = 내 PowerShell)     (보초 = ntfy.sh 서버)
```

→ **send/recv 진입점만 ntfy로 바꾸면, 기존 method B의 운용 흐름(Monitor 구독·매칭·보고)이 통째로 재사용된다.**

---

## 5. 성공 검증 체크

- [ ] B의 `/raw` 구독 창이 블록(대기) 상태로 떠 있다
- [ ] A가 발행한 메시지가 B 구독 창에 **즉시**(폴링 없이) 뜬다
- [ ] **다른 네트워크**에서도 동일하게 즉시 도착한다 (도달 + push)
- [ ] (선택) `Monitor`로 구독 시 새 메시지가 notification으로 인입된다 (method B 재현)

---

## 6. 변형

| 하고 싶은 것 | 방법 |
|---|---|
| 메타데이터(제목·시각·id)도 보기 | `/raw` 대신 `/json` — 한 줄에 JSON 1개 |
| 놓친 과거 메시지 replay | `curl -s "ntfy.sh/<topic>/json?since=10m"` (최근 10분) |
| 한 번만 받고 끝(스트림 X) | `?poll=1` 붙이면 즉시 반환 후 종료 |
| 남이 못 끼어들게(인증) | ntfy account 생성 → access token 헤더 `Authorization: Bearer tk_...` + 토픽 ACL |
| 휴대폰으로도 받기 | ntfy 앱 설치 후 같은 토픽 구독 (디바이스간의 "디바이스"에 폰 포함) |
| **내 서버로 직접 운영** | **§12 — self-host 또는 F-relay에 push 얹기** |

---

## 7. 정리 (teardown)

- B의 구독 창: `Ctrl+C` (보초 종료)
- Monitor로 띄웠으면: TaskStop
- 서버측 정리 불필요 — ntfy.sh가 메시지를 짧게만 보관(기본 12h), 토픽은 비우면 사라짐

---

## 8. skill_ipc_control과의 연결

| 로컬 (method B) | 디바이스간 (이 런북) |
|---|---|
| `send.cmd` → `inbox.log` | `POST ntfy.sh/<topic>` |
| `start_watcher.cmd` (`Get-Content -Wait`) | `GET .../raw` 스트림 구독 |
| 보초 = 내 백그라운드 PowerShell | **보초 = ntfy.sh 서버** |
| `Monitor(start_watcher.cmd, persistent)` | `Monitor(curl .../raw, persistent)` |
| watcher stdout → notification | ntfy 스트림 → notification |

→ method B의 운용 모델을 **거의 그대로** 쓰면서 매체만 네트워크 토픽으로 바꾼 형태.

---

## 9. 장단점

| | |
|---|---|
| 장 | 도달·깨우기 둘 다 공짜 — 가장 적은 수고로 실시간 디바이스간 |
| 장 | 가입조차 불필요(공개 토픽) |
| 장 | `Monitor`와 그대로 결합 → 기존 method B 흐름 통째 재사용 |
| 장 | 폰 앱 포함 멀티 디바이스 구독 자연스러움 |
| 단 | 공개 토픽 = 토픽명 아는 사람 누구나 읽기/쓰기 (보호는 account 필요) |
| 단 | 메시지 보존 짧음(기본 12h) — 영구 로그 아님 |
| 단 | 읽음 추적(`.read`/`since`) 기본 제공 안 됨 — push는 "지금 듣는 사람"에게만 |
| 단 | 서버가 남의 것 — 보초·전달을 내가 통제 못 함 (§12에서 직접 구현으로 해소) |

---

## 10. 학습 포인트

- **진짜 push는 항상 "보초"가 필요하다.** method E README의 결론과 정확히 같다 — 추상화 수준이 올라가도 누군가는 연결을 붙들고 깨워야 한다. F·G에선 그 보초가 *내 폴링 루프*였고, H에선 *ntfy 서버*다. **§12에선 그 보초를 다시 내 코드로 되찾는다.**
- 폴링과 push의 본질 차이: 폴링은 **받는 쪽이 주기적으로 묻고**(method A·B의 watcher도 사실 ~2초 폴링), push는 **보내는 쪽 신호가 연결을 타고 즉시 흐른다**.
- "읽음 추적이 기본 없음"이 F·G와의 큰 차이 — **push는 흐름(stream)이라 '지금 듣는 사람'에게만 닿는다.** 보존·재읽기가 필요하면 G(큐)와 섞어야 함을 체감.
- 세 런북을 관통하는 결론: **매체(파일/서버/큐/토픽)와 깨우기(수동/폴링/push)는 독립 축**이고, 디바이스간이 되어도 이 2축 구조는 그대로다.

---

## 11. 세 런북 종합 (F·G·H 한눈에)

| | 매체 | 도달 해결 | 깨우기 | 보존 | 서버 주인 | 계보 |
|---|---|---|---|---|---|---|
| **F** mini relay | 내가 세운 서버(메모리) | 내가 터널 | 폴링 | 서버 살아있는 동안 | **나** | 신규 원리 |
| **G** Upstash | 클라우드 Redis 큐 | 이미 공개 | 폴링 | 클라우드 영구 | 남(Upstash) | method D |
| **H** ntfy | 공개 pub/sub 토픽 | 이미 공개 | **push** | 짧음(12h) | 남(ntfy) | method B |

```
수고 많음 ◀───────────────────────────────▶ 수고 적음
   F (다 내 손)        G (서버 외주)        H (서버+깨우기 외주)
   원리 가장 날것 ◀──────────────────────▶ 마법 같지만 통제 적음
   서버 주인 = 나 ◀──────────────────────▶ 서버 주인 = 남
```

→ 셋을 다 해보면 "무엇을 직접 쥐고 무엇을 빌릴지"의 **트레이드오프 감각**이 손에 잡힌다.

---

## 12. 직접 구현하고 싶다면 — "빌려쓰기"의 아쉬움 풀기

> 이 런북의 편함은 ntfy 서버를 **빌려쓴 대가**다. 보초·전달을 **내 코드로 되찾고 싶다면** 두 경로가 있다.
> (학습자 본인의 욕심을 여기에 실행 가능한 형태로 남겨둔다.)

### 경로 1 — 런북 F의 relay에 push를 얹기 ★추천: "내가 만든 H"

런북 F의 미니 relay는 **폴링**이었다. 거기에 **연결을 끊지 않는 구독 엔드포인트**를 추가하면,
ntfy 없이 **내 손으로 push를 구현**한 게 된다 = F + H의 합체.

```
[F 원본]   POST /send → 배열 append   /   GET /recv?since=N (폴링)
[+ push]   POST /send → append + "지금 듣고 있는 모든 구독자에게 즉시 write"
           GET /subscribe → 응답을 안 끝내고 들고 있기 (= 내가 만든 보초)

  A ──POST /send──▶ [내 relay] ──열린 연결로 즉시 흘림──▶ B (GET /subscribe 중)
                     └ ntfy.sh 서버가 하던 일을 내 코드가 함 ┘
```

`server.mjs`에 추가하는 최소 스케치 (SSE 형식):
```js
const subscribers = [];                          // 열려 있는 구독 응답들 = "보초 명부"

// 구독: 연결을 끊지 않고 보관한다 (이게 push의 핵심)
if (req.method === 'GET' && url.pathname === '/subscribe') {
  res.setHeader('content-type', 'text/event-stream');
  res.setHeader('cache-control', 'no-cache');
  subscribers.push(res);                          // res.end()를 호출하지 않음 = 연결 유지
  req.on('close', () => {                          // 구독자가 끊으면 명부에서 제거
    const i = subscribers.indexOf(res);
    if (i >= 0) subscribers.splice(i, 1);
  });
  return;
}

// 발행 시: 기존 POST /send 의 msgs.push(body) 바로 다음에 추가
for (const sub of subscribers) sub.write('data: ' + body + '\n\n');   // 모든 구독자에게 즉시 흘림
```
구독 클라이언트:
```bash
curl -s -N "$URL/subscribe"      # ntfy 의 /raw 와 같은 역할 — 블록되며 새 메시지 즉시 출력
```
→ **이제 보초(연결을 들고 깨우는 주체)가 ntfy 서버가 아니라 내 `server.mjs`다.** §10의 "보초를 내 코드로 되찾는다"가 이것.

### 경로 2 — ntfy 자체를 내 디바이스에 self-host

ntfy는 **오픈소스**다. 공개 `ntfy.sh` 대신 **내 서버에 직접 띄울** 수 있다.
```bash
docker run -p 80:80 binwiederhier/ntfy serve
```
- 클라이언트 흐름(curl 발행/구독)은 **그대로**, URL만 내 주소로 교체
- "빌려쓰기 → 내가 운영"으로 전환되지만 프로토콜·학습 흐름은 동일
- 도달이 필요하면 런북 F처럼 터널/공개호스트로 내 ntfy를 노출

> 두 경로 모두 "외부 서버를 두고 디바이스간"이라는 목표는 유지된다 — **다만 그 서버의 주인이 내가 된다.**
> 경로 1이 학습 밀도가 더 높다(프로토콜까지 내 손). 경로 2는 운영만 가져온다.

---

## 13. 다음 단계 (모두 비범위 — 포인터만)

| 키우고 싶은 것 | 방향 |
|---|---|
| 메시지 영구 보존 + push 동시에 | G(큐 저장) + H(push 알림) 병행 |
| 끼어들기 차단 | ntfy account 토큰 + 토픽 ACL, 또는 §12 self-host |
| 읽음 추적 | `/json`의 message id를 클라이언트가 `.read`처럼 기록 |
| 도구 추상화까지 | method E (커스텀 MCP 서버)로 send/recv를 LLM 도구화 |

# Runbook G — Upstash Redis REST 클라우드 큐 (디바이스간 IPC, 서버 안 세우기)

> 디바이스간 IPC의 두 번째 런북. 런북 F에서 **직접 세운 중계 서버**를, 여기선 **이미 떠 있는 클라우드 큐**로 대체한다.
> 입문 수준 — 안전장치·견고한 구조는 의도적으로 배제하고 핵심 원리만 본다.

- 상태: 입문 런북
- 원리 계보: **method D (`external_queue`, 로컬 SQLite/Redis 큐)의 클라우드 호스팅판**

---

## 0. 한 줄 요약

런북 F의 교훈: IPC = **공유 매체 + 깨우기**, 디바이스간이 추가하는 새 숙제는 **도달(URL이 양쪽에서 닿기)** 하나.

이번엔 그 공유 매체를 *내가 세운 서버* 대신 **클라우드에 이미 떠 있는 Redis 큐(Upstash)**로 둔다.

```
[런북 F]  디바이스A ─▶ [내가 세운 중계 서버] ◀─ 디바이스B
                       └ 서버도 내가 띄우고, 터널로 도달도 내가 뚫음 ┘

[런북 G]  디바이스A ─▶ [Upstash 클라우드 큐] ◀─ 디바이스B
                       └ 서버 코드 0 · 이미 공개 HTTPS라 도달 문제도 0 ┘
```

핵심 대비: **F는 "중계 서버를 누가 세우나"를 내가 직접 풀었고, G는 그걸 남(Upstash)이 대신 세워준 형태다.**

---

## 1. 새로 생기는 문제 — 이번엔 이미 풀려 있다

런북 F의 가장 큰 수고는 "URL을 양쪽에서 닿게 만들기"(서버 기동 + 터널)였다.
Upstash 큐는 **처음부터 공개 HTTPS endpoint**다. 그래서:

```
도달 문제      F: 직접 해결(node + cloudflared 두 창)   →  G: 해결 불필요 (이미 공개 URL)
서버 운영      F: 내가 켜둬야 함                        →  G: Upstash가 24h 운영
저장          F: 메모리(끄면 소실)                      →  G: 클라우드에 보존
대가          0원, 다 내 손                            →  계정 1개 + 토큰 관리
```

→ "도달"이라는 새 숙제를 **돈/계정으로 외주 준** 형태. 원리는 같고, 수고가 옮겨갔을 뿐이다.

---

## 2. 무엇을 쓰나 — Redis list 1개를 inbox로

Redis의 **list** 자료구조 하나가 곧 `inbox.log`다.

```
RPUSH inbox <메시지>          리스트 끝에 추가              → 파일의 append / F의 POST /send
LRANGE inbox <since> -1       since번째부터 끝까지 읽기     → recv?since=N / F의 since 커서
```

Upstash는 이 Redis 명령을 **HTTPS REST**로 부르게 해준다(= TCP Redis 프로토콜 대신 `curl`).
명령 하나 = JSON 배열 1개를 POST: `["RPUSH","inbox","안녕"]`.

`since`(읽기 커서) = 런북 F의 `since` = method D의 `read` 컬럼 = **"어디까지 읽었나"의 또 다른 구현.**

---

## 3. 사전 준비

| 항목 | 방법 |
|---|---|
| Upstash 계정 | <https://upstash.com> 무료 가입 |
| Redis DB 1개 | 콘솔에서 **Create Database** (Region 아무거나, 무료 티어) |
| REST URL | DB 상세 페이지의 `UPSTASH_REDIS_REST_URL` 복사 (예: `https://us1-xxx-12345.upstash.io`) |
| REST TOKEN | 같은 페이지의 `UPSTASH_REDIS_REST_TOKEN` 복사 |

> 두 값은 **양쪽 디바이스 모두**에 필요하다(같은 큐를 가리켜야 하므로). 토큰은 비밀번호처럼 다룬다.

---

## 4. 단계별 실행 (해피 패스 / PowerShell 기준)

### Step 1. 양쪽 디바이스에 접속 정보 세팅
```powershell
$URL = "https://us1-xxx-12345.upstash.io"     # 본인 값으로
$TOK = "AX...본인토큰..."
$H   = @{ Authorization = "Bearer $TOK" }
```

### Step 2. 디바이스 A에서 보내기 (RPUSH)
```powershell
Invoke-RestMethod -Method Post -Uri $URL -Headers $H -Body '["RPUSH","inbox","안녕 B 여기는 A"]'
# → result : 1     (큐 길이 = 방금 추가 후 1개)
```
curl(Git Bash) 변형:
```bash
curl -s -X POST "$URL" -H "Authorization: Bearer $TOK" -d '["RPUSH","inbox","안녕 B 여기는 A"]'
# → {"result":1}
```

### Step 3. 디바이스 B에서 받기 (LRANGE)
```powershell
$r = Invoke-RestMethod -Method Post -Uri $URL -Headers $H -Body '["LRANGE","inbox","0","-1"]'
$r.result
# → 안녕 B 여기는 A
```
**다른 네트워크의 B가 A의 메시지를 받으면 — 디바이스간 통신 성공.** (도달을 위해 한 일이 아무것도 없음에 주목.)

### Step 4. "깨우기" 붙이기 — 폴링 루프 + since 커서
Redis list는 스스로 깨워주지 않는다(그건 런북 H = pub/sub). F처럼 주기적으로 새 부분만 읽는다.
```powershell
$since = 0
while ($true) {
  $body = '["LRANGE","inbox","' + $since + '","-1"]'      # since부터 끝까지
  $r = Invoke-RestMethod -Method Post -Uri $URL -Headers $H -Body $body
  if ($r.result.Count -gt 0) {
    $r.result                       # 새 메시지 출력
    $since += $r.result.Count       # 받은 개수만큼 커서 전진
  }
  Start-Sleep -Seconds 2
}
```
이제 A가 언제 RPUSH해도 B는 2초 내 자동 출력. **`since` 커서 = method D의 `read` 표시의 클라이언트판.**

---

## 5. 성공 검증 체크

- [ ] Upstash 콘솔에서 DB가 **Active** 상태다
- [ ] A의 RPUSH가 `result`(큐 길이)를 돌려준다
- [ ] **다른 네트워크**의 B가 LRANGE로 그 메시지를 읽는다 (전달 + 도달, 추가 작업 0)
- [ ] B의 폴링 루프가 A의 새 메시지를 2초 내 자동 출력한다 (깨우기)
- [ ] (선택) Upstash 콘솔의 **Data Browser**에서 `inbox` 리스트가 실제로 쌓이는 게 보인다

---

## 6. 변형 — 소비형 큐 vs 커서형 읽기

| 방식 | 명령 | 성격 |
|---|---|---|
| **커서형(이 런북)** | `LRANGE inbox since -1` | 비파괴. 메시지 보존, 재읽기 가능. method D의 `read` 컬럼식 |
| **소비형(진짜 큐)** | `LPOP inbox` | 파괴적. 꺼내면 사라짐. RabbitMQ/작업큐의 본래 모습 |

소비형이 "큐"의 어원에 더 가깝다. 두 디바이스가 **작업을 나눠 처리**하는 상황이면 LPOP가 자연스럽다.
1:1 대화처럼 **기록이 남아야** 하면 커서형이 낫다. (런북은 F와 개념 일치를 위해 커서형 채택.)

---

## 7. 정리 (teardown)

```powershell
# 큐 비우기
Invoke-RestMethod -Method Post -Uri $URL -Headers $H -Body '["DEL","inbox"]'
```
- 클라우드 저장이라 그냥 둬도 무료 티어 한도 안에선 무방
- DB 자체 삭제는 Upstash 콘솔에서

---

## 8. skill_ipc_control과의 연결

| 로컬 (method A·B·D) | 디바이스간 (이 런북) |
|---|---|
| `inbox.log` append | `RPUSH inbox` |
| `recv.cmd` 새 라인 read | `LRANGE inbox since -1` |
| `.read_<as>` / method D `read` 컬럼 | 클라이언트 `since` 커서 |
| method D 로컬 SQLite/Redis | **Upstash 클라우드 Redis** |
| 폴링/`Get-Content -Wait` | 폴링 루프 (Step 4) |

→ method D README가 말한 "구조화된 큐의 가치"를, 로컬 설치 없이 **클라우드 호스팅으로** 그대로 체험한다.

---

## 9. 장단점

| | |
|---|---|
| 장 | 서버 코드 0 + 도달 문제 0 — 가장 빨리 "디바이스간 성공" |
| 장 | 클라우드 보존 — 디바이스 꺼도 메시지 유지 |
| 장 | 진짜 Redis 명령(RPUSH/LRANGE/LPOP)을 손에 익힘 → MQ 학습 발판 |
| 장 | 콘솔 Data Browser로 큐 상태 눈으로 확인 |
| 단 | 외부 계정·토큰 의존 (F의 "다 내 손"과 대비) |
| 단 | 폴링 기반(2초) — 즉시 push 아님 (그건 런북 H) |
| 단 | 무료 티어 요청 한도 — 폴링 주기 너무 짧으면 소진 |
| 단 | 안전장치 전무 — 토큰 1개가 곧 전권 (의도적 배제) |

---

## 10. 학습 포인트

- **저장소가 파일→메모리서버→클라우드큐로 바뀌어도 `since`(읽음 추적) 개념은 보존된다.** 세 런북에 같은 커서가 반복 등장하는 게 그 증거.
- 디바이스간의 새 숙제 "도달"은 *원리적으로 사라진 게 아니라* Upstash가 대신 진 것 — 공짜처럼 보여도 계정·토큰·한도라는 형태로 비용이 옮겨갔다.
- method D가 "왜 production은 파일 append를 안 쓰나"의 답이었다면, G는 "그 큐를 내가 설치도 안 하고 빌려쓸 수 있다"의 답이다.
- 커서형(LRANGE) ↔ 소비형(LPOP)의 선택이 곧 **"대화 로그냐 작업 큐냐"**의 설계 분기임을 체감.

---

## 11. 다음 단계 (모두 비범위 — 포인터만)

| 키우고 싶은 것 | 방향 |
|---|---|
| 즉시 push (폴링 제거) | 런북 H (ntfy.sh) / 또는 Upstash의 `SUBSCRIBE`는 REST 미지원 → pub/sub는 H로 |
| 직접 서버를 손에 쥐고 싶다 | 런북 F (미니 HTTP relay) |
| 토큰 노출 줄이기 | 읽기 전용 토큰 분리(Upstash REST token 권한) |
| 메시지 만료 | `LTRIM`으로 길이 제한, 또는 메시지에 TTL 키 분리 |

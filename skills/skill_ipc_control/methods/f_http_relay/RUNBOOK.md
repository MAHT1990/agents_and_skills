# Runbook F — Mini HTTP Relay (디바이스간 IPC, 직접 만든 중계 서버)

> 로컬 파일 기반 IPC(method A·B)를 **외부 서버를 경유한 디바이스간 통신**으로 끌어올리는 첫 런북.
> 입문 수준 — **안전장치·견고한 구조는 의도적으로 배제**하고 핵심 원리만 손으로 체득한다.

- 상태: 입문 런북 (직접 따라 하며 동작시키는 용도) · **라운드1 보강 적용** (봉투+id 커서)
- 원리 계보: 기존 method 어디에도 없는 **신규 원리** — "중계 서버를 누가 세우나"
- 라운드 로그:
  - R1 (적용): 저장 단위 raw text → 봉투 `{id,ts,from,to,body}`, 커서 줄수 → id. 멀티라인·라우팅 해결
  - R2~ (후속): 내구성(영속화) / 인증·도달안정 / 즉시 push / `send.cmd`·`recv.cmd` 결선

---

## 0. 한 줄 요약

로컬 IPC가 작동하는 유일한 이유는 **양쪽이 닿을 수 있는 공유 매체**가 있어서다.
지금까지 그 매체는 *같은 디스크의 `inbox.log` 파일*이었다.
디바이스간으로 가려면 그 매체를 **네트워크로 닿는 URL**로 바꾸면 된다. 그게 전부다.

```
[로컬 IPC: method A·B]
  세션A ─append─▶ inbox.log (파일) ◀─read─ 세션B
                 └ 공유 매체 = 같은 디스크 경로 ┘

[디바이스간 IPC: 이 런북]
  디바이스A ─POST /send─▶ [중계 서버의 메모리 inbox] ◀─GET /recv─ 디바이스B
                        └ 공유 매체 = 네트워크 URL ┘
```

`send`/`recv`의 골격(**append / read-since**)은 그대로다. 파일이 URL로 바뀔 뿐이다.

---

## 1. 새로 생기는 단 하나의 문제 — "도달(reachability)"

파일은 같은 디스크에 있으니 양쪽이 그냥 열면 됐다.
URL은 **두 디바이스가 서로 다른 네트워크(집/회사/LTE)에 있어도 똑같이 닿아야** 한다.
방화벽·공유기(NAT) 너머로 닿게 만드는 것 — 이게 디바이스간 통신이 추가하는 유일한 새 숙제다.

```
디바이스A (집 와이파이)              디바이스B (회사/LTE)
      │                                    │
      └──────────▶  공개 URL  ◀────────────┘
                 (양쪽 모두 닿아야 함)
                 = "외부에 떠 있는 서버"가 필요한 이유
```

해결 경로는 §3에서 가장 쉬운 것(터널) 하나로 못박는다.

---

## 2. 무엇을 만드나 — 중계 서버 ~30줄

메모리에 **봉투(envelope) 배열** 하나를 들고, 두 개의 입출구만 연다.
각 원소는 `{ id, ts, from, to, body }` — method A·B의 `inbox.log` 라인과 같은 모양이다.

```
POST /send  body(JSON {from,to,body})  서버가 id·ts 부여 → append  → 파일의 send.cmd
GET  /recv?since=<id>  그 id 이후 봉투만 JSON Lines로 반환          → recv.cmd + .read 추적
```

`since`(읽기 커서)가 곧 method A·B의 `.read_<as>`에 해당한다 — 다만 "몇 줄 읽었나(숫자)"가 아니라 **"마지막에 본 봉투 id"**를 기억한다. 본문에 줄바꿈이 들어가도 셈이 틀어지지 않고, 서버를 재시작해 모르는 id를 들고 오면 서버가 "처음부터 전부"로 응답해 영영 못 받는 사태를 막는다.

### server.mjs (의존성 0, Node 18+)

```js
// server.mjs — 디바이스간 IPC 미니 중계 서버 (라운드1: 봉투 + id 커서)
import http from 'node:http';

const msgs = [];        // 메모리 inbox: { id, ts, from, to, body } (서버 끄면 사라짐)
let seq = 0;            // id 발급용 단조 카운터 (서버가 단일 소스로 부여)

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');   // 경로+쿼리 파싱용 더미 base

  // 보내기: POST /send  (본문 = JSON {from,to,body}) — 서버가 id·ts 부여
  if (req.method === 'POST' && url.pathname === '/send') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      let env;
      try { env = JSON.parse(body || '{}'); }
      catch { res.statusCode = 400; res.end('bad json'); return; }
      const msg = {
        id: `msg_${String(seq).padStart(6, '0')}`,  // 서버 부여, 생존중 유일
        ts: new Date().toISOString(),
        from: env.from ?? 'unknown',
        to: env.to ?? 'all',                         // <single> | all | <a,b,c>
        body: env.body ?? '',
      };
      seq += 1;
      msgs.push(msg);
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ id: msg.id, ts: msg.ts }));   // 발급 id 회신
    });
    return;
  }

  // 받기: GET /recv?since=<id>  (그 id 이후만 JSON Lines로)
  if (req.method === 'GET' && url.pathname === '/recv') {
    const since = url.searchParams.get('since');
    let start = 0;
    if (since) {
      const idx = msgs.findIndex(m => m.id === since);
      start = idx === -1 ? 0 : idx + 1;   // 모르는 id → 0부터 전부 (재시작 안전)
    }
    res.setHeader('content-type', 'text/plain; charset=utf-8');   // NDJSON
    res.end(msgs.slice(start).map(m => JSON.stringify(m)).join('\n'));
    return;
  }

  res.statusCode = 404;
  res.end('no');
}).listen(8787, () => console.log('relay on :8787 (모든 인터페이스, 봉투+id 커서)'));
```

> `.listen(8787)`은 기본적으로 **모든 네트워크 인터페이스**에 바인딩한다(localhost 전용이 아님).
> 디바이스간으로 닿아야 하므로 일부러 그렇게 둔다. (로컬 전용이면 `.listen(8787, '127.0.0.1')`였을 것.)

---

## 3. 사전 준비

| 항목 | 확인 |
|---|---|
| Node 18+ | `node -v` |
| cloudflared (터널) | `winget install Cloudflare.cloudflared` 후 `cloudflared --version` |
| 서버를 띄울 디바이스 1대 | 둘 중 아무 거나. 이 디바이스가 "중계 서버" 역할 |

> 터널 대신 **같은 공유기(LAN)**라면 cloudflared 없이도 된다 — §6 참고.

---

## 4. 단계별 실행 (해피 패스)

### Step 1. 서버 코드 저장 + 기동 (서버 디바이스)
```bash
# server.mjs 를 빈 폴더에 저장한 뒤
node server.mjs
# → relay on :8787 (모든 인터페이스)
```
이 창은 켜둔 채로 둔다(서버가 살아있어야 함).

### Step 2. 외부 도달 URL 확보 (서버 디바이스, 새 터미널)
```bash
cloudflared tunnel --url http://localhost:8787
```
출력 중 이런 줄을 찾는다:
```
+----------------------------------------------------------+
|  https://random-words-1234.trycloudflare.com             |
+----------------------------------------------------------+
```
이 `https://....trycloudflare.com` 가 **두 디바이스가 공유할 URL**이다. 계정·로그인 불필요.
(이 창도 켜둔다. 끄면 URL이 죽는다.)

### Step 3. 디바이스 A에서 보내기
이제 본문 텍스트가 아니라 **JSON 봉투**(`from`/`to`/`body`)를 보낸다. `to`는 약속어 `<단일> | all | <a,b,c>`.

PowerShell:
```powershell
$URL = "https://random-words-1234.trycloudflare.com"
$msg = @{ from = "laptop"; to = "phone"; body = "안녕 B, 여기는 A" } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri "$URL/send" -Body $msg -ContentType "application/json"
# → id   ts
#    ---  --
#    msg_000000  2026-06-15T...Z
```
또는 curl(Git Bash):
```bash
URL="https://random-words-1234.trycloudflare.com"
curl -s -X POST "$URL/send" -H "content-type: application/json" \
  -d '{"from":"laptop","to":"phone","body":"안녕 B, 여기는 A"}'
# → {"id":"msg_000000","ts":"2026-06-15T...Z"}
```

### Step 4. 디바이스 B에서 받기
```powershell
$URL = "https://random-words-1234.trycloudflare.com"
(Invoke-RestMethod -Uri "$URL/recv") -split "`n" | ForEach-Object { $_ | ConvertFrom-Json }
# → from=laptop to=phone body="안녕 B, 여기는 A" id=msg_000000 ...
```
`since`를 안 주면 전부 반환된다. 한 번 받은 뒤에는 **마지막 봉투의 `id`**를 `?since=<id>`로 넘겨 그 이후만 받는다.
**여기서 다른 네트워크의 디바이스 B가 A의 봉투를 받으면 — 디바이스간 통신 성공이다.**

### Step 5. "깨우기" 붙이기 — 폴링 루프 (method A → B 로의 이행)
지금까진 B가 직접 `recv`를 쳐야 했다(method A = 수동). 주기적으로 자동 확인하게 만든다(method B의 폴링판).
커서는 **줄 수가 아니라 마지막 봉투의 `id`**다. 받은 줄을 JSON으로 파싱해 `to`가 나(`SELF`)·`all`·내가 든 그룹일 때만 출력한다(매칭은 수신측 책임 — 서버는 안 거름).

> 폴링 루프 2원칙: **(1) `SELF`를 반드시 먼저 설정**(안 하면 매칭이 다 false). **(2) 한 줄 파싱 실패가 루프를 죽이면 안 된다** — 깨진/부분 줄은 건너뛰고 계속 폴링. 커서는 *정상 파싱된* 줄의 id로만 전진시킨다.

bash (jq 필요):
```bash
URL="https://random-words-1234.trycloudflare.com"
SELF="phone"; since=""
while true; do
  out=$(curl -s "$URL/recv${since:+?since=$since}")
  if [ -n "$out" ]; then
    # fromjson? 의 '?' = 깨진 줄은 에러 없이 건너뜀 / 커서는 마지막 정상 id로
    new=$(printf '%s\n' "$out" | jq -rR 'fromjson? | .id' | tail -n1)
    [ -n "$new" ] && since="$new"
    printf '%s\n' "$out" | jq -rR --arg self "$SELF" '
      fromjson?
      | select(.to==$self or .to=="all"
               or (.to|split(",")|map(gsub("^\\s+|\\s+$";""))|index($self)))
      | "[\(.from) → \(.to)] \(.body)"'
  fi
  sleep 2
done
```
PowerShell:
```powershell
$URL  = "https://random-words-1234.trycloudflare.com"
$SELF = "phone"          # ← 반드시 설정
$since = ""
while ($true) {
  try {
    $uri = if ($since) { "$URL/recv?since=$since" } else { "$URL/recv" }
    $raw = (Invoke-WebRequest -Uri $uri -UseBasicParsing).Content   # .Content = raw 문자열 보장
  } catch { Start-Sleep 2; continue }                               # 네트워크 흔들림 → 다음 폴링
  foreach ($line in ($raw -split "`n")) {
    $line = $line.Trim()
    if (-not $line) { continue }
    try { $m = $line | ConvertFrom-Json } catch { continue }        # 깨진 줄은 건너뜀(루프 생존)
    $since = $m.id                                                   # 정상 줄만 커서 전진
    $to = $m.to -split '\s*,\s*'                                     # 그룹이면 분해
    if (($m.to -eq "all") -or ($to -contains $SELF)) {              # self/all/그룹 매칭
      "[$($m.from) → $($m.to)] $($m.body)"
    }
  }
  Start-Sleep -Seconds 2
}
```
이제 A가 언제 보내도 B는 2초 안에 자동으로 본다. **`since`(마지막 본 id) = `.read_<as>`의 네트워크판.**

---

## 5. 성공 검증 체크

- [ ] 서버 디바이스에서 `node server.mjs` 가 `relay on :8787` 출력하고 살아있다
- [ ] cloudflared가 `https://...trycloudflare.com` URL을 출력했다
- [ ] **다른 네트워크**의 디바이스에서 그 URL의 `/recv`가 응답한다 (도달 성공)
- [ ] A의 `/send` 직후 B의 `/recv`에 그 봉투(`from`/`to`/`body`)가 보인다 (전달 성공)
- [ ] B의 폴링 루프가 `to=B`·`all`인 봉투만 출력한다 (매칭 성공)
- [ ] 본문에 줄바꿈이 있어도 다음 봉투를 건너뛰지 않는다 (id 커서 검증)
- [ ] B의 폴링 루프가 A의 새 봉투를 2초 내 자동 출력한다 (깨우기 성공)

---

## 6. 변형 — 같은 LAN이면 터널 없이

두 디바이스가 **같은 공유기**에 붙어 있으면 cloudflared 없이 사설 IP로 직결할 수 있다.

```bash
# 서버 디바이스에서 사설 IP 확인 (Windows)
ipconfig    # "IPv4 주소  192.168.x.x" 찾기
```
- URL을 `http://192.168.x.x:8787` 로 사용
- 단, 서버 디바이스의 **방화벽 인바운드**에서 포트 8787(또는 node)을 허용해야 한다
- 장점: 외부 의존 0 / 단점: 같은 네트워크에서만 (진짜 cross-network는 §4 터널)

---

## 7. 정리 (teardown)

1. B의 폴링 루프: `Ctrl+C`
2. cloudflared 창: `Ctrl+C` (URL 소멸)
3. `node server.mjs` 창: `Ctrl+C` (메모리 inbox 함께 소멸)

메모리 저장이라 서버를 끄면 메시지가 전부 사라진다 — 입문용의 의도된 한계.

---

## 8. skill_ipc_control과의 연결

이 relay의 두 입출구는 기존 `send.cmd`/`recv.cmd`의 **네트워크 쌍둥이**다.

| 로컬 (method A·B) | 디바이스간 (이 런북) |
|---|---|
| `inbox.log` 라인 `{id,ts,from,to,body}` | `POST /send` → 같은 봉투를 배열에 append |
| `recv.cmd` → 새 라인 read | `GET /recv?since=<id>` → 그 id 이후 JSON Lines |
| `.read_<as>` (읽음 추적, id 셋) | 클라이언트의 `since`=마지막 본 id |
| `to` 매칭 (`<단일>`/`all`/`<a,b,c>`) | 수신 클라가 동일 규칙으로 매칭 (서버는 안 거름) |
| `Get-Content -Wait` watcher (B) | 폴링 루프 (Step 5) |

→ 원리적으로 `send.ps1`/`recv.ps1`의 **파일 IO 부분만 `curl`/`Invoke-RestMethod` 호출로 교체**하면, 기존 method가 그대로 디바이스간으로 확장된다. (이 교체는 비범위 — 원리 확인이 목표.)

---

## 9. 장단점

| | |
|---|---|
| 장 | 중계 원리를 **내 손으로** 세움 — IPC 본질을 가장 날것으로 체험 |
| 장 | 서버가 ~50줄, 의존성 0 — 통째로 머릿속에 들어옴 |
| 장 | 봉투(`from`/`to`)로 다중 라우팅(`<단일>`/`all`/그룹) — A·B와 동일 모델 |
| 장 | 커서(`since`)=마지막 본 id = `.read`의 재등장. 본문 멀티라인에도 안전 |
| 단 | 메모리 저장 → 서버 재시작 시 전체 소실 |
| 단 | 재시작하면 id가 `msg_000000`부터 재발급 → 옛 커서와 충돌 가능. "모르는 id면 전부"로 *조용한 죽음*은 막지만 일부 재출력/중복은 남음 (완전 해결은 '내구성' 라운드) |
| 단 | 폴링 기반(2초) — 즉시 push 아님 (그건 런북 H = ntfy) |
| 단 | 인증·검증·동시성·재시도 없음 (개인 디바이스용으로 의도적 배제) |
| 단 | 터널 URL이 매번 바뀜 (quick tunnel 특성) |

---

## 10. 학습 포인트

- **IPC = 공유 매체 + 깨우기**, 두 문제로 분해된다. 매체를 "파일 → URL"로 바꿔도 이 구조는 안 변한다.
- 디바이스간이 추가하는 새 문제는 오직 **도달(NAT 너머)** 하나다. 터널은 그 한 문제만 푼다.
- `since` 커서가 `.read_<as>`와 같은 역할인 걸 보면, **저장소가 바뀌어도 읽음 추적 개념은 보존**됨을 알 수 있다.
- "중계 서버를 누가 세우나"의 답을 직접 세워봄 — 런북 G(Upstash)·H(ntfy)는 *이 서버를 남이 대신 세워준* 형태임을 곧 체감하게 된다.

---

## 11. 다음 단계 (모두 비범위 — 포인터만)

| 키우고 싶은 것 | 방향 |
|---|---|
| 즉시 push (폴링 제거) | 런북 H (ntfy.sh pub/sub) / 또는 이 서버에 SSE 추가 |
| 서버 직접 안 세우고 싶다 | 런북 G (Upstash Redis REST) — 호스티드 큐 |
| 재시작해도 메시지 보존 | 메모리 배열 → 파일 append 또는 SQLite |
| 아무나 못 보내게 | 헤더 토큰 1개 검사 추가 |
| URL 고정 | cloudflared named tunnel(계정) 또는 무료 PaaS 배포 |

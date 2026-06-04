# Runbook F — Mini HTTP Relay (디바이스간 IPC, 직접 만든 중계 서버)

> 로컬 파일 기반 IPC(method A·B)를 **외부 서버를 경유한 디바이스간 통신**으로 끌어올리는 첫 런북.
> 입문 수준 — **안전장치·견고한 구조는 의도적으로 배제**하고 핵심 원리만 손으로 체득한다.

- 상태: 입문 런북 (직접 따라 하며 동작시키는 용도)
- 원리 계보: 기존 method 어디에도 없는 **신규 원리** — "중계 서버를 누가 세우나"

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

메모리에 메시지 배열 하나를 들고, 두 개의 입출구만 연다.

```
POST /send        body(텍스트)를 배열에 append          → 파일의 send.cmd
GET  /recv?since=N  N번째 이후 메시지만 텍스트로 반환     → 파일의 recv.cmd + .read 추적
```

`since`(읽기 커서)가 곧 method A·B의 `.read_<as>`에 해당한다 — "어디까지 읽었나"를 클라이언트가 숫자로 기억한다.

### server.mjs (의존성 0, Node 18+)

```js
// server.mjs — 디바이스간 IPC 미니 중계 서버 (입문용 / 안전장치 없음)
import http from 'node:http';

const msgs = [];                       // 메모리 inbox (서버 끄면 사라짐 — 입문용)

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');   // 경로+쿼리 파싱용 더미 base

  // 보내기: POST /send  (본문 = 메시지 텍스트)
  if (req.method === 'POST' && url.pathname === '/send') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      msgs.push(body);                  // 그냥 배열 끝에 추가 = append
      res.end('ok ' + (msgs.length - 1)); // 방금 메시지의 인덱스 회신
    });
    return;
  }

  // 받기: GET /recv?since=N  (N 이후만 한 줄에 하나씩)
  if (req.method === 'GET' && url.pathname === '/recv') {
    const since = Number(url.searchParams.get('since') || 0);
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(msgs.slice(since).join('\n'));   // 새 메시지 없으면 빈 문자열
    return;
  }

  res.statusCode = 404;
  res.end('no');
}).listen(8787, () => console.log('relay on :8787 (모든 인터페이스)'));
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
PowerShell:
```powershell
$URL = "https://random-words-1234.trycloudflare.com"
Invoke-RestMethod -Method Post -Uri "$URL/send" -Body "안녕 B, 여기는 A"
# → ok 0
```
또는 curl(Git Bash):
```bash
URL="https://random-words-1234.trycloudflare.com"
curl -X POST "$URL/send" -d "안녕 B, 여기는 A"
# → ok 0
```

### Step 4. 디바이스 B에서 받기
```powershell
$URL = "https://random-words-1234.trycloudflare.com"
Invoke-RestMethod -Uri "$URL/recv?since=0"
# → 안녕 B, 여기는 A
```
**여기서 다른 네트워크의 디바이스 B가 A의 메시지를 받으면 — 디바이스간 통신 성공이다.**

### Step 5. "깨우기" 붙이기 — 폴링 루프 (method A → B 로의 이행)
지금까진 B가 직접 `recv`를 쳐야 했다(method A = 수동). 주기적으로 자동 확인하게 만든다(method B의 폴링판).

bash:
```bash
URL="https://random-words-1234.trycloudflare.com"
since=0
while true; do
  out=$(curl -s "$URL/recv?since=$since")
  if [ -n "$out" ]; then
    echo "$out"
    since=$(( since + $(printf '%s\n' "$out" | wc -l) ))   # 받은 줄 수만큼 커서 전진
  fi
  sleep 2
done
```
PowerShell:
```powershell
$URL = "https://random-words-1234.trycloudflare.com"
$since = 0
while ($true) {
  $out = Invoke-RestMethod -Uri "$URL/recv?since=$since"
  if ($out) {
    $out
    $since += @($out -split "`n").Count           # 받은 줄 수만큼 커서 전진
  }
  Start-Sleep -Seconds 2
}
```
이제 A가 언제 보내도 B는 2초 안에 자동으로 본다. **`since` 커서 = `.read_<as>`의 네트워크판.**

---

## 5. 성공 검증 체크

- [ ] 서버 디바이스에서 `node server.mjs` 가 `relay on :8787` 출력하고 살아있다
- [ ] cloudflared가 `https://...trycloudflare.com` URL을 출력했다
- [ ] **다른 네트워크**의 디바이스에서 그 URL의 `/recv`가 응답한다 (도달 성공)
- [ ] A의 `/send` 직후 B의 `/recv`에 그 메시지가 보인다 (전달 성공)
- [ ] B의 폴링 루프가 A의 새 메시지를 2초 내 자동 출력한다 (깨우기 성공)

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
| `send.cmd` → `inbox.log` append | `POST /send` → 배열 append |
| `recv.cmd` → 새 라인 read | `GET /recv?since=N` |
| `.read_<as>` (읽음 추적) | 클라이언트의 `since` 커서 |
| `Get-Content -Wait` watcher (B) | 폴링 루프 (Step 5) |

→ 원리적으로 `send.ps1`/`recv.ps1`의 **파일 IO 부분만 `curl`/`Invoke-RestMethod` 호출로 교체**하면, 기존 method가 그대로 디바이스간으로 확장된다. (이 교체는 비범위 — 원리 확인이 목표.)

---

## 9. 장단점

| | |
|---|---|
| 장 | 중계 원리를 **내 손으로** 세움 — IPC 본질을 가장 날것으로 체험 |
| 장 | 서버가 30줄, 의존성 0 — 통째로 머릿속에 들어옴 |
| 장 | 커서(`since`) = `.read`라는 동일 개념의 재등장 |
| 단 | 메모리 저장 → 서버 재시작 시 전체 소실 |
| 단 | 폴링 기반(2초) — 즉시 push 아님 (그건 런북 H = ntfy) |
| 단 | 안전장치 전무 — 인증·검증·동시성·재시도 없음 (의도적 배제) |
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

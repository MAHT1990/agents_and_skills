# BLUEPRINT — 터미널 자기증식(self-spawn) 기반 IPC 자동화

> 실험일: 2026-06-15
> 맥락: method F(HTTP relay)로 control 세션 운용 중, "현재 터미널에서 새 터미널을
> 띄워 원격으로 명령을 실행시킬 수 있는가"를 검증. 결과를 본 skill의 자동화
> 설계 근거로 격납한다.

---

## 1. 핵심 발견 (검증 완료)

```
[발견 1] 터미널은 명령줄로 또 다른 터미널을 띄울 수 있다.
[발견 2] 띄울 때 시작 커맨드를 넘겨 그 터미널에서 실행시킬 수 있다.
[발견 3] 이를 이용해 method F 서버 구동·작업 전 설정을 자동화할 수 있다.
```

세 발견을 묶으면: **하나의 세션이 명령 한 줄로 독립된 작업 환경(서버·watcher·
또 다른 Claude 세션)을 부팅시킬 수 있다.** = 셋업 마찰 제거의 토대.

---

## 2. 검증 수단 (실제로 돌려본 것)

### 2-1. 새 창 띄우기 (발견 1·2)

```
Start-Process powershell -ArgumentList '-NoExit','-NoProfile','-Command','<명령>'
```

| 토큰 | 역할 |
|---|---|
| `Start-Process powershell` | 새 powershell.exe를 **독립 창**으로 생성 |
| `-NoExit` | 명령 실행 후 창 유지 (결과 확인용) |
| `-Command '<명령>'` | 새 창이 시작 시 실행할 명령 본문 |
| `-File <path>` | (대안) 인용 충돌 회피해 스크립트 파일 실행 |
| `-WorkingDirectory` | (옵션) 새 창의 작업 디렉토리 고정 |

검증 시퀀스:
```
[1] hello/PID 출력 창          → 새 창이 독립 PID로 뜸 (발견 1 OK)
[2] Hello -> 5초 -> Bye 창     → 시작 커맨드가 새 창에서 실행됨 (발견 2 OK)
[3] claude 인라인 인사         → 새 창에서 claude -p 기동 + 응답
[4] claude 대화형              → 새 창에서 claude 인터랙티브 진입
[5] claude + IPC 자동시작      → 첫 메시지로 skill_ipc_control 발동 → watcher 기동
[6] 2창(a/b) 상호 인사         → a=control, b=control-gitter, method B로 교신
```

### 2-2. 결과 회수 — 리더 루프 (양방향 증명)

새 창의 stdout은 부모로 자동 회귀하지 않는다. 공유 매체(파일)를 거쳐야 회수된다.

```
        (1) 명령 쓰기                 공유 파일                (2) 폴링·감지
  부모 세션                       tmp_reader_cmd.txt          리더 창(새 창)
   Add-Content ───────────────▶  Get-Date                ──▶ Invoke-Expression
                                 (Get-ChildItem).Count        │
   Get-Content  ◀───────────────  tmp_reader_out.txt  ◀───────┘ 결과 append
        (4) 결과 회수                                    (3) 결과 쓰기
```

- 처리 커서 = "처리한 줄 수" → 새 줄만 실행 (method F의 id 커서와 동형)
- 종료어 `EXIT`로 루프 정지
- 결론: **원격 실행 + 결과 회수**가 로컬 파일만으로 성립 = method B/F의 축소판

---

## 3. 자동화 적용 (발견 3 — 본 skill에의 결선)

### 3-1. method F 서버 원샷 부트스트랩

지금: 사용자가 server.mjs + cloudflared + set_url 3스텝을 수동 수행.
목표: 명령 한 줄로 별도 창에서 서버·터널을 띄우고 URL을 채널에 자동 등록.

```
현재 (수동 3스텝)
  창1: node server.mjs
  창2: cloudflared tunnel --url http://localhost:8787   (URL을 눈으로 복사)
  본세션: set_url.cmd <ch> <복사한 URL>

목표 (serve.cmd 한 줄)
  serve.cmd <ch>
     │
     ├─ Start-Process: [서버 창]  node server.mjs
     ├─ Start-Process: [터널 창]  cloudflared ... (URL을 파일로 흘림)
     └─ URL 파일 polling → set_url.cmd <ch> <자동획득 URL>
                                  ▼
                          채널 .relay_url 기록 완료
```

핵심 메커니즘 = 2-2 리더 루프와 동일: 터널 창이 URL을 **공유 파일**에 쓰고,
부모가 그 파일을 읽어 set_url에 투입.

### 3-2. 작업 전 설정 자동화 (pre-work bootstrap)

```
부트스트랩 한 줄
   │
   ├─ [창 A] claude + "IPC 시작 (F, control, control)"
   ├─ [창 B] claude + "IPC 시작 (F, control, worker-1)"
   └─ [창 C] claude + "IPC 시작 (F, control, worker-2)"
              ▼
        팀 구성 완료 — 사람이 각 창을 손으로 세팅할 필요 없음
```

검증 [5][6]에서 이미 입증: claude는 시작 커맨드로 IPC 스킬을 자동 발동하고
watcher까지 띄운다. 즉 "세션 팀"을 명령으로 일괄 부팅 가능.

---

## 4. 실험 중 드러난 함정 (설계 시 반드시 반영)

### 함정 1 — method B·F의 PID 파일 충돌 (실측: F watcher exit 127)

```
channels/control/
   .watcher_control.pid   ◀── method B와 method F가 "같은 이름"으로 공유!

[사건] 같은 channel=control, as=control 로
       F watcher(이 세션) 가동 중 → 새 창에서 B watcher(as=control) 기동
       → .watcher_control.pid 를 두 method가 서로 건드림
       → F watcher Monitor 태스크 exit 127 사망
```

- 원인: PID 파일 네임스페이스가 method를 구분하지 않음 (`.watcher_<as>.pid`)
- 교훈: **동일 channel에서 method가 달라도 동일 as면 자원이 겹친다.**
- 개선안: PID 파일에 method 접두 — `.watcher_<method>_<as>.pid`
  또는 method별 채널 하위 디렉토리 분리.

### 함정 2 — method B watcher의 tail 타이밍

```
B watcher = Get-Content -Wait (tail) → "시작 이후 새 라인"만 본다.
  송신(a) ──▶ inbox.log     ← 이 시점 b의 watcher 미기동이면
                  ▲             b는 그 인사를 영영 못 봄 (tail은 과거 라인 skip)
  (늦게) b watcher 시작 ──┘
```

- 교훈: 수신측 watcher가 먼저 떠 있어야 한다 → 부트스트랩은 **수신자 우선 기동**.
- F는 id 커서(`since`)로 과거분 재요청이 되어 이 문제에서 자유로움 → 자동화는 F가 유리.

### 함정 3 — 새 창 stdout은 회귀하지 않음 (fire-and-forget)

```
부모 ──spawn──▶ 새 창 (독립 프로세스)
                  stdout 은 새 창 콘솔에만 표시, 부모 파이프와 무관
회수하려면 → 공유 매체(파일/HTTP) 경유 필수 (2-2 리더 루프)
```

### 함정 4 — 셸 인용·인코딩

```
- Bash 경유로 powershell 호출 시 $f, $PID 등 $변수를 Bash가 먼저 치환 → \$ 이스케이프 필요
- 인라인 -Command 한글 프롬프트는 인코딩 깨짐 위험 → -File + UTF-8(BOM) 권장
- .ps1에 한글 주석/문자열 → UTF-8 BOM 없으면 cp949 오독 (PS5.1 한국어 로케일)
- .cmd 주석/echo 는 ASCII 영문만
```

---

## 5. 설계 결론

```
self-spawn 능력  +  공유 매체(파일/HTTP)  =  완전 자동 IPC 부트스트랩
       │                    │
       │                    └─ 결과 회수·세션간 교신 (B=파일 / F=relay)
       └─ 서버·터널·세션을 명령 한 줄로 기동

권장 진화 순서
  1) serve.cmd        — F 서버+터널+set_url 원샷 (함정1·2 회피 위해 F 기반)
  2) PID 네임스페이스  — .watcher_<method>_<as>.pid 로 충돌 제거 (함정1)
  3) team bootstrap   — 수신자 우선으로 다중 claude 세션 일괄 기동 (함정2)
```

자동화는 **method F를 기반**으로 한다 — id 커서 덕에 tail 타이밍 함정(함정2)이
없고, 서버 1점만 띄우면 디바이스 경계까지 한 번에 덮기 때문.

---

## 6. 미해결 / 후속

- [ ] 함정1 PID 충돌: method 접두 네임스페이스 적용 (B·F 공통 수정)
- [ ] serve.cmd: 터널 URL 파일 회수 → set_url 자동 투입 파이프 구현
- [ ] 죽은 F watcher 복구 절차 표준화 (exit 127 후 재기동 런북)
- [ ] 새 창에 "원격 입력" 주입: SendKeys(취약) vs 리더 루프(견고) 중 채택 결정
- [ ] team bootstrap 스크립트: 수신자 우선 기동 순서 보장 로직

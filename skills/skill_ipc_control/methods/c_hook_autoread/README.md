# Method C — settings.json Hook Auto-read (구현 예정)

매 사용자 입력 직전에 hook이 자동으로 inbox를 읽어 LLM 컨텍스트에 주입하는 방식.
B의 "보초" 역할을 Claude Code의 hook 시스템이 대신.

## 동작 그림

```
[B 세션]
  사용자 입력 직전
       │
       ▼
  ┌──────────────────────────────────────────┐
  │ settings.json 의 UserPromptSubmit hook   │
  │  → recv.cmd 자동 실행                    │
  │  → stdout 으로 새 메시지 JSON 출력       │
  │  → 그 stdout 이 system context 에 주입   │
  └──────────────────────────────────────────┘
       │
       ▼
  LLM 은 매 턴 시작 시 새 메시지를 본 상태
```

## 핵심 메커니즘
- Claude Code의 hook 시스템 사용 (`UserPromptSubmit` 등)
- 채널·세션별로 hook이 등록되어 매 턴마다 inbox 점검
- A·B의 `.read_<as>` 셋 그대로 재사용 (중복 처리 방지)
- 받는 행위 자체가 LLM 입장에서 사라짐

## 예상 인터페이스 (의사)

```
register.cmd <channel> <as>
  → settings.json 에 hook entry 자동 추가/병합
  → "이 세션은 <channel> 에서 <as> 로 listening" 등록

unregister.cmd <channel> <as>
  → 해당 hook entry 제거
```

## 장단점

| | |
|---|---|
| 장 | 사용자가 명령 안 쳐도 자동으로 메시지 인지 |
| 장 | LLM 측에선 가장 매끄러운 UX |
| 단 | **침습적 자동화** — 사용자 settings.json 수정 필요 |
| 단 | 매 턴마다 inbox 스캔 → 토큰 낭비 가능 |
| 단 | hook 오작동 시 세션 전체 영향 (단발 명령보다 폭발 반경 큼) |
| 단 | hook 설정의 영향 범위가 IPC를 넘어 전역적 |

## MVP 제외 이유
사용자 메모리 룰 "침습적 자동화 회피"와 충돌. 학습용으로는 의미 있으나 일상 운용에는 부적합. 본 skill의 자동성 정책("실행 보조")과도 결이 다름.

## 학습 포인트
- **hook = "받는 쪽 LLM 자체를 보초로 만드는" 접근**
- B의 watcher는 외부 프로세스가 보초였다면, C는 LLM 호스트 자체가 보초
- 강력하지만 그만큼 영향 범위가 큼 → 운영 정책과 강하게 결합
- 자동화의 침습성과 실용성 사이의 트레이드오프 사례로 가치 있음

## 구현 시 고려사항 (장차)
- hook은 `settings.json` 또는 `settings.local.json` 의 어느 쪽에 두는지 선택
- 채널별 독립 hook vs 단일 dispatcher hook
- hook 실행 실패 시 fallback (silent failure vs LLM 경고)
- 미등록 채널의 메시지가 도착했을 때의 처리

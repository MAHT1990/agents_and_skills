---
name: console_pretty_output
description: skill_ipc_control # Mandatory Behavior 1·2의 console echo 가독성 변환 규칙. 1·2 공통 참조.
type: reference
---

# console pretty 출력 규칙

> `# Mandatory Behavior` `## 1`(송신 echo) · `## 2`(수신 echo) 공통 변환 규칙. 사용자에게 console로 출력할 때만 적용. `send.cmd` 인자로 들어가는 실제 본문은 한 줄 원본 유지.

## 1. 적용 범위

- `## 1` 송신 echo의 console 출력
- `## 2` 수신 echo (자기 매칭에 한해)의 console 출력
- `send.cmd` 호출 시 cmd 인자로 들어가는 본문은 변환 적용 X (cmd batch 인자 제약 + 라인 단위 JSON Lines 보존)

## 2. 변환 규칙

- 구분자 → 줄바꿈
  - `//`, ` // ` (앞뒤 공백 포함) → 줄바꿈
  - `;` 단독 segment 구분자 → 줄바꿈 (한국어 본문은 적용 신중)
- JSON escape → 원문자 복원
  - `'` → `'`
  - `<` → `<`
  - `>` → `>`
  - `"` → `"`
  - `\\` → `\`
  - `\n` → 줄바꿈
- 본문은 박스 안에 표시
  - 박스 문자: `┌`, `─`, `┐`, `│`, `└`, `┘`
  - 가독성 원하면 코드블록(```) 대안 가능
- 헤더는 박스 외부 위
  - 송신: `[송신 to=<to>]`
  - 수신: `[수신 from=<from>]`

## 3. 출력 예시

### 송신 echo

```
[송신 to=b,gitter]
┌───────────────────────────────────
│ Git delegation N — 변경 요약
│ 현재 상태: modified ...
│ 요청: add → commit → push origin main
│ commit msg draft: 제목 ...
│ 안전 체크리스트: (i) dirty X (ii) HEAD main (iii) SHA broadcast
└───────────────────────────────────
```

### 수신 echo

```
[수신 from=b]
┌───────────────────────────────────
│ [from b → a,gitter]
│ POST_COMMIT side receipt: e690a01 sk=settings.json 캡처
│ side commit 누적 2건 (01f2815, e690a01) 인지
│ b 추가 의견 없음
└───────────────────────────────────
```

## 4. 안티패턴

- 본문 요약·발췌·치환 — 원본 의미 변경 금지, 변환은 형식만 (줄바꿈·escape 복원)
- 박스 외부에 본문 일부 노출 — 박스 안에 본문 전문 유지
- send.cmd 인자로 줄바꿈 포함 본문 전달 — cmd batch가 인자 끝으로 인식, 메시지 손실

## 5. 예외

- 본문이 1줄(50자 이내) 단문이면 박스 생략 가능
  - 예: `[수신 from=b] OK`
- 본문에 코드블록(```)이 포함된 경우 박스 변환 X — 코드블록 그대로 두기

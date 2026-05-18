---
name: rule_command_execution_explanation
description: 쉘/명령 도구(Bash, PowerShell, Monitor 등) 호출 직전, 의도·명령 전문·토큰별 의미·사이드 이펙트를 함께 제시. 명령의 핵심부와 옵션을 분해해 사용자가 명령 자체를 이해·검증·재사용할 수 있도록 한다.
paths:
  - "**/*"
---

# 명령 실행 설명 규칙

명령 도구를 호출하기 직전, 어떤 명령을 왜 실행하는지와 옵션 하나하나의 의미를 함께 제시한다. 명령을 던지고 결과만 보여주는 방식 대신, 명령 자체를 사용자가 읽고 검증·재사용할 수 있게 한다.

## 적용 컨텍스트
- `Bash` / `PowerShell` / `Monitor` 도구 호출 직전
- 외부 명령 실행 도구를 통해 시스템 상태를 변경하거나 외부 자원에 접근하는 호출 직전
- 한 메시지에 다중 명령 도구 호출을 묶을 때 각 호출별로 동일 적용

## 스킵 컨텍스트
- 단일 자명 read-only 1회 호출 (`ls`, `pwd`, `git status`, `tail -n 1 <file>` 등) — 의도가 자명하고 옵션 풀이 가치가 낮은 경우
- 메모리·prompt 메타 파일 grep/read 같은 SKILL 내부 운영 호출
- 사용자가 명시적으로 설명 생략 요청 ("조용히", "설명 생략", "no comment" 등)
- 직전 호출과 동일 의도로 묶인 연쇄 호출 → 첫 1회만 풀양식, 후속은 1줄 의도만
- 본 RULE이 정의된 메타 영역(`skills/skill_prompt_manager/**`, `rules/**`) 내부의 자체 운영 호출

## 규칙

### 발동 시점
- 도구 호출 **직전** 별도 텍스트 라인으로 출력
- 호출 결과(stdout/요약)는 별개 라인 — 양식 블록에 통합 금지
- 결과를 본 뒤 다시 다음 명령으로 이어질 때마다 양식 재발동

### 양식 (단일)
- 한 호출당 1개 양식 블록
- 구성:
  - **의도 1줄**: 무엇을 위해 실행하는지 자연 문장으로 (제목/헤더 역할)
  - **명령 전문**: 실제 호출할 명령 한 줄 그대로 (가공·요약 금지)
  - **토큰 분해**: 명령 핵심부 + 옵션을 개조식 bullet으로 1개씩 풀어 설명
    - 각 bullet 형식: `- {토큰}: {의미}` (디폴트와의 차이가 있으면 함께 명시)
    - 옵션 값이 식별자·경로일 경우 그 의미·근거 함께 기재
  - **사이드 이펙트**: 호출 후 파일/디렉토리/PATH/상태/환경 변경 사항 1줄
    - 변경이 없으면 생략 가능

### 다중 호출 처리
- 같은 메시지 안의 **병렬 다중 호출** → 각 호출별 양식 블록을 분리해 모두 작성
- **연속 호출이 동일 의도로 묶이면** 첫 호출에서 풀양식 1회, 후속 호출은 의도 1줄 + 명령 전문만
- **연속 호출이 다른 의도** → 각 호출 직전마다 풀양식 재발동

### 톤·형식
- 개조식 우선
- 도입어 ("이 명령은…", "여기서는…") 생략
- 옵션 의미는 "공식 문서가 그렇다"식 인용보다, 해당 호출 맥락에서 왜 그 옵션이 켜졌는지 중심으로 기술
- 사용자 메모리(`feedback_*`)의 간결성·자율성 선호 존중 — 자명한 토큰까지 군더더기 풀이 금지

## 형식

### 풀양식 예시
```
GitHub CLI 설치
winget install --id GitHub.cli --silent --accept-source-agreements --accept-package-agreements
- winget install: Windows Package Manager로 패키지 설치
- --id GitHub.cli: 공식 패키지 ID 지정 (이름 중복 회피)
- --silent: 설치 마법사 UI 없이 백그라운드 진행
- --accept-source-agreements: msstore/winget 소스 약관 자동 동의 (없으면 첫 사용 시 prompt)
- --accept-package-agreements: 패키지 자체 EULA 자동 동의
사이드 이펙트: C:\Program Files\GitHub CLI\ 디렉토리 생성, PATH에 추가됨.
```

```
hwp-mcp dist/server.js의 main 가드 패치 적용 여부 확인
grep -n "pathToFileURL\|import.meta.url" ~/AppData/Local/npm-cache/_npx/d39f3ba0d76e555f/node_modules/hwp-mcp/dist/server.js
- grep: 정규식 기반 텍스트 검색
- -n: 매칭 라인 번호 함께 출력 (패치 위치 식별용)
- "pathToFileURL\|import.meta.url": 패치 키워드 OR 매칭 — 둘 다 잡혀야 정상
- 경로: User scope hwp-mcp가 실행하는 실제 캐시 디렉토리
사이드 이펙트: 없음 (read-only).
```

### 단축형 예시 (스킵 컨텍스트 경계 — 자명 read-only)
```
PID 파일 잔존 여부 확인을 위해 `ls channels/claude_config/` 실행.
```

### 연속 호출 (동일 의도 묶음) 예시
```
[첫 호출 — 풀양식]
IPC channel inbox tail 동작 검증
tail -n 1 ~/.claude/skills/skill_ipc_control/channels/claude_config/inbox.log
- tail: 파일 끝부분 출력
- -n 1: 마지막 1줄만 (가장 최근 메시지)
- 경로: 검증 대상 채널의 inbox.log
사이드 이펙트: 없음 (read-only).

[후속 호출 — 의도 + 명령만]
같은 채널의 read 마커 확인.
cat ~/.claude/skills/skill_ipc_control/channels/claude_config/.read_gitter
```

### 병렬 다중 호출 예시
```
[호출 1]
channel 디렉토리에 PID 파일 잔존 여부 확인
ls ~/.claude/skills/skill_ipc_control/channels/claude_config/
- ls: 디렉토리 항목 나열
- 경로: 검증 대상 channel 인스턴스 디렉토리
사이드 이펙트: 없음 (read-only).

[호출 2]
AskUserQuestion 도구 스키마 로드 (현재 deferred 상태)
ToolSearch select:AskUserQuestion
- ToolSearch: deferred 도구 스키마 페치
- select:<name>: 정확 이름 매칭 모드
사이드 이펙트: 다음 턴부터 AskUserQuestion 호출 가능.
```

## 예외
- 본 RULE이 정의된 메타 영역(`skills/skill_prompt_manager/**`, `rules/**`) 내부 작업은 skill_prompt_manager 보고 형식 우선
- SKILL·AGENT 정의에서 별도 명령 실행 보고 정책을 명시한 경우 해당 정책 우선
- `rule_code_change_explanation` 발동 직후 같은 의도로 이어지는 명령(예: 코드 패치 후 즉시 빌드/테스트 1회) → 코드 변경 설명 블록에 통합 가능
- IPC `send.cmd` 호출은 본 RULE 양식 위에 `# Mandatory Behavior 1` (송신 본문 echo)이 추가 적용된다 — 양식 블록과 echo 블록을 모두 출력

---
name: agent_structure
description: AGENT.md 파일 골격 및 섹션 컨벤션. skill_prompt_manager가 AGENT CREATE/UPDATE 시 자동 로드.
type: reference
---

# AGENT.md 골격 가이드

> AGENT는 단일 책임 전문가다. SKILL 오케스트레이터의 위임을 받아 특정 도메인 작업을 수행하고 부모 Context로 결과를 반환한다.

## 1. 필수/선택 섹션

| 섹션 | 필수 | 역할 |
|---|---|---|
| frontmatter | 필수 | name, description, model, tools, color, skills |
| `# Variables` | 필수 | 입력 변수 정의 |
| `# Rules` / `## Rules` | 필수 | 작업 규칙·제약 |
| `## Errors/Exception Handling` | 필수 | 에러·예외 처리 |
| `## Human-In-the-Loop` | 선택 | Human 통신 필요 조건 |
| `# Prblm` / `# Roles` | 선택 | 문제 정의·역할 명시 |
| `# Action` | 필수 | Step 흐름 |
| `## Step N` | 필수 | 세부 실행 단계 |
| `## Constraints` | 선택 | 제약 조건 |
| `# Quality Assurance` | 선택 | 완료 체크리스트 |
| `# Addition Action/Questions to Human` | 선택 | Human 질의 항목 |

## 2. frontmatter

```yaml
---
name: {domain}_{role}
description: {역할 1줄}, 부모 Context로 {산출물} 반환한다.
model: sonnet | opus | haiku
tools: Bash, Glob, Grep, Read, Edit, Write, ...
color: red | blue | green | yellow | orange | purple | pink
skills:
  - skill_xxx
---
```

### 2-1. name
- `{도메인_접두사}_{역할}` snake_case
- 예: `plan_requirement_analyzer`, `ml_modeler`, `idea_value_challenger`

### 2-2. description
- "~~한다", "~~ 반환한다" 형식
- 부모 Context 반환 명시
- 자연어 트리거 매칭용

### 2-3. model 선택 기준
| model | 적합 작업 |
|---|---|
| `opus` | 깊은 추론·창의·전략적 판단 (planning, idea critique, value challenge) |
| `sonnet` | 균형형, 대부분의 분석·생성·작성 작업 |
| `haiku` | 단순 변환·반복·정형 출력 |

### 2-4. tools
- 필요 최소 권한 원칙
- read-only AGENT: `Bash, Glob, Grep, Read` 만
- 코드 생성 AGENT: `Bash, Glob, Grep, Read, Edit, Write`
- 외부 조사: `Bash, Read, WebSearch, WebFetch`

### 2-5. color (도메인 그룹별 일관)
| 도메인 | 색상 (예시) |
|---|---|
| `idea_*` | red (도전·비판) |
| `plan_*` | blue (분석·기획) |
| `ml_*` | green (데이터·모델) |
| `sangmin_*` | purple (학습·토론) |
| `test_scenario_*` | yellow (검증) |

### 2-6. skills
- 이 AGENT를 위임 호출하는 SKILL 목록
- 1개 이상 필수 (어디서 호출되는지 명시)

## 3. Variables 섹션

- `$$variable` 형식 (대문자 또는 lower_snake_case 일관)
- 입력 변수와 출력 변수 모두 명시
- 형식:
  ```markdown
  # Variables
  - $$INPUT_VAR = {설명}
  - $$OUTPUT_TARGET = {산출물 경로}
  ```

## 4. Rules 섹션

- 표준 문구 포함:
  - `$$variable 형식으로 변수 참조`
  - `각 Step 완료 후 다음 Step 진행 전 결과를 명시적으로 서술`
- 도메인 고유 제약:
  - 민감 정보 저장 금지
  - Read-Only 원본 보존
  - 특정 라이브러리·환경 제약

## 5. Errors/Exception Handling

- 2가지 분리 권장:
  - `### Errors`: 복구 불가·조치 필요 오류
  - `### Exception`: 예외 상황 (계속 진행 가능)
- 각 항목: `조건 → 액션 (보고/스킵/중단)` 형식

## 6. Human-In-the-Loop (선택)

- AGENT가 Human과 직접 통신해야 하는 경우 명시
- 일반적으로 SKILL 오케스트레이터가 통신을 담당하므로 AGENT의 직접 통신은 예외적
- 명시 예: 민감 정보 입력, 계획 확정 전 최종 승인

## 7. Action / Step 섹션

### 7-1. Step 구성
- `## Step N. 단계명`
- 1줄 문장식 도입 (선택) + 개조식 본문
- AGENT는 단일 책임이므로 위임이 아닌 직접 수행

### 7-2. 모드 분기 패턴 (선택)
- 일부 AGENT는 mode별 분기를 가진다
  - 예: `idea_*` AGENT의 "질문 생성" / "응답 평가" / "심화 질문" 모드
- `## {모드명}` 헤더 + 하위 Step 구조

### 7-3. 부모 Context 반환 Step
- 마지막 Step은 부모 Context로 결과 반환
- 반환 형식을 코드블록 마크다운으로 명시 (인터페이스 계약)

## 8. Output 형식 명시

- AGENT는 SKILL 오케스트레이터에 결과를 반환하므로 반환 형식이 곧 인터페이스
- 코드블록 안에 마크다운 템플릿을 명시:
  ````markdown
  ```
  ## {산출물 제목}

  ### {섹션 1}
  - ...

  ### 요약
  - ...
  ```
  ````

## 9. Quality Assurance (선택)

- 복잡한 작업 AGENT는 자체 완료 체크리스트 권장
- 형식:
  ```markdown
  # Quality Assurance
  ## Completeness Checklist
  - [ ] 검증 항목 1
  - [ ] 검증 항목 2
  ```

## 10. 안티패턴

- 부모 Context 반환 형식 미명시
- tools에 불필요한 권한 포함 (최소 권한 원칙 위반)
- model 미지정 (자동 상속되지만 명시 권장)
- 호출되는 SKILL인데 `skills:` 미명시
- AGENT가 직접 다른 AGENT를 호출 (오케스트레이션은 SKILL만)
- SKILL이 담당할 Step 0 회의·요구사항 확인을 AGENT에 중복 구현

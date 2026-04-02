---
name: skill_prompt_manager
description: prompt 관리 요청을 받아, 요청된 prompt의 구조와 내용을 분석하여, prompt 관리에 필요한 세부사항을 도출하는 SKILL.
---
# Goal
> prompt 관리 요청이 들어오면, 요청된 prompt의 이름, 설명, 사용할 Agents 목록과 관리 모드를 분석하여, prompt 관리를 수행할 것.
# Variables
- $$TYPE: "AGENT", "SKILL", "RULE", "ALL" 중 하나로, 관리할 대상의 유형
- $$NAME: 관리할 대상의 이름
- $$DESCRIPTION: 관리할 대상의 설명
- $$AGENTS: 관리할 SKILL에서 사용할 Agents 목록 ($$TYPE이 "SKILL"인 경우)
- $$MODE: "CREATE", "UPDATE", "DELETE" 중 하나로, 수행할 관리 작업의 유형

# Actions
> prompt 관리 요청이 들어오면, 요청된 prompt의 이름, 설명, 사용할 Agents 목록과 관리 모드를 분석하여, prompt 관리에 필요한 세부사항을 도출할 것.
## Rules
- $$TYPE이 "SKILL"인 경우, skills 디렉토리 내에 SKILL.md 파일이 존재하는 경우, SKILL.md 내용들을 분석하여, SKILL 구조 분석.
- $$TYPE이 "AGENT"인 경우, agents 디렉토리 내에 AGENT.md 파일이 존재하는 경우, {agent}.md 내용들을 분석하여, AGENT 구조 분석.
- $$TYPE이 "RULE"인 경우, rules 디렉토리 내에 {$$NAME}.md 파일이 존재하는 경우, 해당 파일 내용을 분석하여, RULE 구조 분석.
- 공통 실행 규칙은 `~/.claude/rules/` 디렉토리의 아래 파일들이 자동 적용된다:
  | Rule 파일 | 커버 범위 |
  |---|---|
  | `rule_skill_execution_protocol.md` | Quick Help 출력, Step 결과 보고, 진행/수정/중단 제어 |
  | `rule_feedback_loop.md` | 피드백 수집 -> 영향 범위 분석 -> 선택적 재실행 -> 반복 판정 |
  | `rule_error_handling_common.md` | 필수 변수 미제공, subagent 실패, 병렬 실패 처리 |
  | `rule_output_mode.md` | $$output_mode(console/file/notion) 분기 처리 |
  | `rule_variable_collection.md` | Step 0 필수/선택 변수 수집 프로토콜 |
  | `rule_verification_checklist.md` | 산출물 검증 체크리스트 출력 및 미충족 항목 재실행 |
  | `rule_follow_up_recommendation.md` | Skill 완료 후 후속 Skill 추천 프로토콜 |
- **CREATE 모드에서 신규 SKILL 생성 시**, 위 rules가 자동 적용되므로 SKILL.md에 공통 규칙을 인라인으로 작성하지 않는다. SKILL 고유의 로직(Variables, Steps, Error Handling, Output)만 작성한다.
- **UPDATE 모드에서 기존 SKILL 수정 시**, 기존 SKILL에 인라인된 공통 규칙은 그대로 유지한다 (하위호환).
## Step 0. 요구사항 회의 (Human-in-the-Loop)

### 0-1. 변수 수집
아래 정보를 모두 확보할 때까지 회의 단계로 진행하지 않는다.
- $$TYPE: 관리 대상 유형 -- AGENT / SKILL / RULE / ALL (필수)
- $$NAME: 관리할 대상의 이름 (필수)
- $$MODE: 관리 작업 유형 -- CREATE / UPDATE / DELETE (필수)
- $$DESCRIPTION: 대상의 설명 (CREATE 모드 시 필수)
- $$AGENTS: 사용할 Agents 목록 (TYPE이 SKILL인 경우)

### 0-2. 요구사항 구체화 회의
수집된 변수를 바탕으로 Human과 회의하여 아래 사항을 구체화한다.
Human이 최종 승인할 때까지 회의를 반복한다.
- 관리 작업의 목적과 배경
- (CREATE) 생성할 SKILL/AGENT/RULE의 역할, 사용 시나리오, subagent 구성
- (UPDATE) 변경 범위와 의도
- (DELETE) 삭제 영향 범위 및 대체 방안

### 0-3. 최종 승인
확정된 요구사항을 요구사항 확인서 형식으로 Human에게 제시하고 **최종 승인**을 받는다.
승인 없이 다음 Step으로 진행하지 않는다.
"수정" 시, 0-2(회의)로 돌아가 재논의 후 다시 승인을 요청한다.

## Steps
> $$TYPE, $$MODE에 따라, 관리 작업 수행
### Step 1. $$target_file 확정
- $$TYPE에 따라 해당 디렉토리 내 파일이 존재하는지 확인.
  - $$TYPE이 "AGENT"인 경우, agents 디렉토리내 {$$NAME}.md 확인.
  - $$TYPE이 "SKILL"인 경우, skills 디렉토리내 {$$NAME}/SKILL.md 확인.
  - $$TYPE이 "RULE"인 경우, rules 디렉토리내 {$$NAME}.md 확인.
### Step 2. (UPDATE, DELETE 모드인 경우)
- $$target_file 이 존재하는 경우, 해당 파일의 내용 분석
- 파일 구조와 내용을 파악하여, 관리 작업에 필요한 세부사항 도출.
- UPDATE 모드인 경우,
  - 사용자 문답
    - 변경할 내용에 대한 세부사항 확인
    - 요청 내용 수행
- DELETE 모드인 경우,
  - 사용자 문답
    - 삭제할 $$target_file에 대한 세부사항 확인
    - 삭제 수행
### Step 3. (CREATE 모드인 경우)
- $$target_file 이 존재하지 않는 경우, 새로운 파일 생성
- 사용자 문답
  - 설명에 대한 세부사항 확인
  - (SKILL) 사용할 Agents 목록에 대한 세부사항 확인
  - (RULE) 적용 대상 paths, 규칙 항목에 대한 세부사항 확인
- $$target_file의 $$TYPE 구조에 맞게 내용 작성
- **SKILL 타입 신규 생성 시 작성 범위**:
  - 작성할 것: frontmatter(name, description), Variables, Steps, SKILL 고유 Error Handling, Output
  - 작성하지 않을 것 (rules에서 자동 적용):
    - Quick Help 출력 블록
    - Step 결과 보고 형식
    - 진행/수정/중단 제어 규칙
    - 피드백 루프(N-1~N-4) 일반 구조
    - $$output_mode 공통 분기 로직
    - 변수 수집 일반 규칙
    - 산출물 검증 일반 체크리스트
  - 단, SKILL 고유의 검증 항목이나 피드백 항목이 있으면 해당 부분만 명시한다.
- **RULE 타입 신규 생성 시 작성 범위**:
  - 작성할 것: frontmatter(name, description, paths), 규칙, 형식(해당 시), 예외(해당 시)
  - Rule 공통 구조:
    ```markdown
    ---
    name: rule 식별명
    description: 한 줄 설명
    paths:
      - "skills/**/*.md"
      - "skills/**/SKILL.md"
    ---
    # {Rule 제목}
    {적용 대상/시점을 1~2문장으로 기술}
    ## 규칙
    {핵심 규칙 항목들}
    ## 형식
    {출력 포맷이 있는 rule만 -- 선택}
    ## 예외
    {SKILL.md 개별 정의가 우선하는 경우 등 -- 선택}
    ```
# Error Handling
- $$TYPE, $$NAME, $$MODE 미제공 -> Human에게 재요청
- $$target_file이 존재하지 않는데 UPDATE/DELETE 요청 -> Human에게 보고, 경로 재확인
- $$target_file이 이미 존재하는데 CREATE 요청 -> Human에게 보고, UPDATE 전환 여부 확인
- 파일 생성/수정/삭제 실패 -> 원인을 Human에게 보고

## Step 4. 산출물 검증
작업 완료 후 아래 항목을 자체 검증한다:

### CREATE 모드 검증
- 생성된 파일이 $$TYPE 구조(frontmatter, 필수 섹션)에 부합하는가
- SKILL 타입: frontmatter(name, description), Variables, Steps, Error Handling, Output 섹션 존재 여부
- SKILL 타입: rules에서 커버하는 공통 규칙이 인라인으로 중복 작성되지 않았는가
- AGENT 타입: frontmatter(name, description), 역할 정의 존재 여부
- RULE 타입: frontmatter(name, description, paths), 규칙 섹션 존재 여부
- RULE 타입: 공통 구조(규칙/형식/예외)에 부합하는가

### UPDATE 모드 검증
- 변경 전/후 diff를 Human에게 제시
- 변경이 의도한 범위 내에서만 이루어졌는가
- 파일 구조가 훼손되지 않았는가

### DELETE 모드 검증
- 대상 파일/디렉토리가 정상 삭제되었는가
- 다른 SKILL/AGENT/RULE에서 삭제 대상을 참조하고 있지는 않은가 (참조 존재 시 Human에게 경고)

검증 결과를 체크리스트 형태로 Human에게 출력한다.

## Step 5. 피드백 루프

### 5-1. 피드백 수집
- Human에게 아래 항목별 피드백을 요청한다:
  - 생성/수정된 prompt 내용이 의도에 부합하는가
  - 구조나 세부 항목에서 수정이 필요한 부분이 있는가
  - (DELETE 모드) 추가로 정리해야 할 관련 파일이 있는가

### 5-2. 영향 범위 분석
- 피드백 내용을 분석하여 수정 범위를 판정한다:
  - 내용 보완 -> $$target_file만 수정
  - 구조 변경 -> $$target_file 재생성
  - 연관 파일 영향 -> 관련 SKILL/AGENT/RULE 파일도 함께 수정
- 수정 계획을 Human에게 제시하고 확인받는다.

### 5-3. 선택적 재실행
- 확인된 수정 계획에 따라 해당 파일만 수정/재생성한다.
- 수정 시 이전 내용과의 변경점(diff)을 명시한다.

### 5-4. 반복 판정
- 수정 결과를 Human에게 제시한다.
- Human이 승인하면 최종 결과를 확정하고 종료한다.
- 추가 피드백이 있으면 Step 5-1로 복귀하여 루프를 반복한다.
- 최대 반복 횟수: 3회 (초과 시 Human에게 알리고 현재 결과로 확정)

# Output
- Step별 전체 작업 요약
  - Step 0. 수집 정보 및 회의 결과 (TYPE, NAME, DESCRIPTION, AGENTS, MODE)
  - Step 1. 대상 파일 확정 결과
  - Step 2~3. 관리 작업 수행 내역
  - Step 4. 검증 체크리스트 결과
  - Step 5. 피드백 루프 결과 (피드백 횟수, 수정 파일, 최종 승인 여부)

---
name: skill_prompt_manager
description: prompt 관리 요청을 받아, 요청된 prompt의 구조와 내용을 분석하여, prompt 관리에 필요한 세부사항을 도출하는 SKILL.
---
# Goal
> prompt 관리 요청이 들어오면, 요청된 prompt의 이름, 설명, 사용할 Agents 목록과 관리 모드를 분석하여, prompt 관리를 수행할 것.
# Variables
- $$TYPE: "AGENT", "SKILL", "ALL" 중 하나로, 관리할 대상의 유형
- $$NAME: 관리할 SKILL의 이름
- $$DESCRIPTION: 관리할 SKILL의 설명
- $$AGENTS: 관리할 SKILL에서 사용할 Agents 목록 ($$TYPE이 "SKILL"인 경우)
- $$MODE: "CREATE", "UPDATE", "DELETE" 중 하나로, 수행할 관리 작업의 유형

# Actions
> prompt 관리 요청이 들어오면, 요청된 prompt의 이름, 설명, 사용할 Agents 목록과 관리 모드를 분석하여, prompt 관리에 필요한 세부사항을 도출할 것.
## Rules
- $$TYPE이 "SKILL"인 경우, skills 디렉토리 내에 SKILL.md 파일이 존재하는 경우, SKILL.md 내용들을 분석하여, SKILL 구조 분석.
- $$TYPE이 "AGENT"인 경우, agents 디렉토리 내에 AGENT.md 파일이 존재하는 경우, {agent}.md 내용들을 분석하여, AGENT 구조 분석.
- 각 Step 완료 시, 해당 Step의 결과를 아래 형식으로 요약하여 Human에게 제시한다:
  ```
  --- Step N 결과 요약 ---
  • 수행 내용: {이번 Step에서 수행한 작업 요약}
  • 산출물: {생성/수집/분석된 결과물}
  • 특이사항: {이슈, 경고, 참고 사항}
  --- 다음 Step: {Step N+1 제목} ---
  ```
- Human의 확인("진행", "수정", "중단")을 받은 후에만 다음 Step으로 진행한다.
- "수정" 요청 시, 해당 Step 내에서 수정을 완료한 후 재요약하여 확인받는다.
- "중단" 요청 시, 현재까지의 결과를 Output 형식으로 정리하여 종료한다.
## Steps
> $$TYPE, $$MODE에 따라, SKILL 관리 작업 수행
### Step 1.
- 문답: $$TYPE, $$NAME, $$DESCRIPTION, $$AGENTS, $$MODE에 대한 세부내용 확인.
### Step 2. $$target_file 확정
- $$TYPE에 따라 해당 디렉토리 내 파일이 존재하는지 확인.
  - $$TYPE이 "AGENT"인 경우, agents 디렉토리내 {$$NAME}.md 확인.
  - $$TYPE이 "SKILL"인 경우, skills 디렉토리내 {$$NAME}/SKILL.md 확인.
### Step 3. (UPDATE, DELETE 모드인 경우) 
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
### Step 4. (CREATE 모드인 경우)
- $$target_file 이 존재하지 않는 경우, 새로운 파일 생성
- 사용자 문답
  - 설명에 대한 세부사항 확인
  - 사용할 Agents 목록에 대한 세부사항 확인
- $$target_file의 $$TYPE 구조에 맞게 내용 작성
# Error Handling
- $$TYPE, $$NAME, $$MODE 미제공 → Human에게 재요청
- $$target_file이 존재하지 않는데 UPDATE/DELETE 요청 → Human에게 보고, 경로 재확인
- $$target_file이 이미 존재하는데 CREATE 요청 → Human에게 보고, UPDATE 전환 여부 확인
- 파일 생성/수정/삭제 실패 → 원인을 Human에게 보고

## Step 5. 산출물 검증
작업 완료 후 아래 항목을 자체 검증한다:

### CREATE 모드 검증
- 생성된 파일이 $$TYPE 구조(frontmatter, 필수 섹션)에 부합하는가
- SKILL 타입: frontmatter(name, description), Variable, Actions, Output 섹션 존재 여부
- AGENT 타입: frontmatter(name, description), 역할 정의 존재 여부

### UPDATE 모드 검증
- 변경 전/후 diff를 Human에게 제시
- 변경이 의도한 범위 내에서만 이루어졌는가
- 파일 구조가 훼손되지 않았는가

### DELETE 모드 검증
- 대상 파일/디렉토리가 정상 삭제되었는가
- 다른 SKILL/AGENT에서 삭제 대상을 참조하고 있지는 않은가 (참조 존재 시 Human에게 경고)

검증 결과를 체크리스트 형태로 Human에게 출력한다.

## Step 6. 피드백 루프

### 6-1. 피드백 수집
- Human에게 아래 항목별 피드백을 요청한다:
  - 생성/수정된 prompt 내용이 의도에 부합하는가
  - 구조나 세부 항목에서 수정이 필요한 부분이 있는가
  - (DELETE 모드) 추가로 정리해야 할 관련 파일이 있는가

### 6-2. 영향 범위 분석
- 피드백 내용을 분석하여 수정 범위를 판정한다:
  - 내용 보완 → $$target_file만 수정
  - 구조 변경 → $$target_file 재생성
  - 연관 파일 영향 → 관련 SKILL/AGENT 파일도 함께 수정
- 수정 계획을 Human에게 제시하고 확인받는다.

### 6-3. 선택적 재실행
- 확인된 수정 계획에 따라 해당 파일만 수정/재생성한다.
- 수정 시 이전 내용과의 변경점(diff)을 명시한다.

### 6-4. 반복 판정
- 수정 결과를 Human에게 제시한다.
- Human이 승인하면 최종 결과를 확정하고 종료한다.
- 추가 피드백이 있으면 Step 6-1로 복귀하여 루프를 반복한다.
- 최대 반복 횟수: 3회 (초과 시 Human에게 알리고 현재 결과로 확정)

# Output
- Step별 전체 작업 요약
  - Step 1. 수집 정보 (TYPE, NAME, DESCRIPTION, AGENTS, MODE)
  - Step 2. 대상 파일 확정 결과
  - Step 3~4. 관리 작업 수행 내역
  - Step 5. 검증 체크리스트 결과
  - Step 6. 피드백 루프 결과 (피드백 횟수, 수정 파일, 최종 승인 여부)
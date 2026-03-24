---
name: skill_code_analyze
description: 도메인과 도메인에 대한 요청 세부내용, 분석범위를 입력받아, 담당 subagent를 통해 주어진 소스코드 기반 요청 파이프라인을 분석해주는 SKILL. -발동조건1. 특정 리소스에 대한 요청 분석을 요청받은 경우.
---
# Agents
- code_analyzer_front
- code_analyzer_electron
- code_analyzer_back
# Variable
- $$SRC_FRONT: user input
- $$SRC_BACK: user input
- $$SRC_ELECTRON: user input
- $$GUIDE_FRONT: $$SRC_FRONT에 대한 guide docs (user input, 필수, default: $$SRC_FRONT/docs/guide/INDEX.md)
- $$GUIDE_BACK: $$SRC_BACK에 대한 guide docs (user input, 필수, default: $$SRC_BACK/docs/guide/INDEX.md)
- $$GUIDE_ELECTRON: $$SRC_ELECTRON에 대한 guide docs (user input, 필수, default: $$SRC_ELECTRON/docs/guide/INDEX.md)
- $$Domain: 관련 도메인
- $$Request: $$Domain과 관련된 요청의 세부내용.
- $$Scope: 분석 범위
  - 프론트엔드: "FRONT", "front", "프론트", "프론트엔드"
  - 백엔드: "BACK", "back", "백", "백엔드"
  - 데스크탑: "DESK", "DESKTOP", "ELECTRON",
# Error Handling
- $$Domain 또는 $$Request 미제공 → Human에게 재요청
- $$Scope 불일치 → Human에게 보고 후 재입력 요청
- subagent 실패 → 해당 Scope 스킵, Human에게 보고 후 나머지 계속 진행

# Actions
## Rules
- 직접 처리하지말고, 반드시 subagent를 통해 수행할 것.(Context 분리를 위해)
- **skill 발동 즉시, 이 파일의 frontmatter(name, description), Variables, Steps 섹션을 파싱하여 아래 Quick Help 형식으로 Human에게 출력한 후 첫 Step부터 진행한다.**
  ```
  {name} — {description 첫 문장}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ▶ 입력값
    {Variables 섹션의 각 $$변수를 "$$변수명 : 설명 (필수/선택, 기본: 값)" 형태로 나열}

  ▶ 진행 단계
    {Steps 섹션의 각 Step을 "Step N. 제목" 형태로 나열}

  💡 각 Step 완료 후 "진행" / "수정" / "중단"으로 응답하세요.
  ```
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
### Step1.
$$Scope에 따라, $$Domain, $$Request를 적절한 subagent에게 위임.
### Step2.
subagent의 결과 수합.
### Step3. 결과 검증
subagent 반환 결과에 대해 아래 항목을 자체 검증한다:
- 요청된 $$Domain에 대한 분석이 누락 없이 포함되어 있는가
- $$Request의 세부내용이 모두 반영되었는가
- 분석 흐름(요청 → 처리 → 응답)이 논리적으로 완결되는가
- 검증 결과를 체크리스트 형태로 Human에게 출력한다.

### Step4. 결과 출력
검증을 통과한 분석 결과를 구조화하여 Human에게 출력한다.

### Step5. 피드백 루프

#### 5-1. 피드백 수집
- Human에게 아래 항목별 피드백을 요청한다:
  - 분석 결과에서 누락된 파이프라인 구간이 있는가
  - 추가로 분석이 필요한 영역(다른 Scope 포함)이 있는가
  - 분석 깊이가 충분한가 (더 상세한 분석 필요 여부)

#### 5-2. 영향 범위 분석
- 피드백 내용을 분석하여 재실행 범위를 판정한다:
  - 동일 Scope 내 보완 → 해당 subagent만 추가 분석 위임
  - 다른 Scope 추가 요청 → 해당 Scope의 subagent 신규 실행
  - 분석 관점 변경 → Step 1부터 재실행
- 재실행 계획을 Human에게 제시하고 확인받는다.

#### 5-3. 선택적 재실행
- 확인된 재실행 계획에 따라 해당 subagent만 재실행한다.
- 재실행 시 이전 결과와의 변경점(diff)을 명시한다.

#### 5-4. 반복 판정
- 재실행 결과를 Human에게 제시한다.
- Human이 승인하면 최종 결과를 확정하고 종료한다.
- 추가 피드백이 있으면 Step 5-1로 복귀하여 루프를 반복한다.
- 최대 반복 횟수: 3회 (초과 시 Human에게 알리고 현재 결과로 확정)

# Output
- Step별 전체 작업 요약
  - Step 1. subagent 위임 내역 (Scope, Domain, Request)
  - Step 2. 결과 수합 요약
  - Step 3. 검증 체크리스트 결과
  - Step 4. 최종 분석 결과
  - Step 5. 피드백 루프 결과 (피드백 횟수, 재실행 Scope, 최종 승인 여부)

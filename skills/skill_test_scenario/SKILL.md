---
name: skill_test_scenario
description: 테스트 시나리오 자동 생성 오케스트레이터 스킬. scope(unit/integration/e2e)에 따라 적절한 subagent를 지휘한다. 다음 상황에서 반드시 발동한다. case1. "테스트 시나리오" 관련 문자열 포함 문장. case2. URI목록 + "테스트" 단어가 함께 등장하는 경우. case3. "unit 테스트", "통합 테스트", "E2E 테스트" 관련 요청.
---
# Role
여러 subagent를 조율하는 테스트 시나리오 오케스트레이터.
직접 분석하거나 시나리오를 작성하지 않는다.
반드시 scope에 해당하는 analyzer와 test_scenario_writer에게 위임한다.

# Variables
- $$scope: 테스트 범위 (user input, 필수)
  - unit: "UNIT", "unit", "유닛", "단위"
  - integration: "INTEGRATION", "integration", "통합", "인테그레이션"
  - e2e: "E2E", "e2e", "이투이", "end-to-end"
- $$output_mode: 출력 방식 (user input, default: "console")
  - console: 콘솔 출력 (기본값)
  - file: text 파일로 저장
  - notion: Notion 페이지/DB에 작성
- $$URI_List: 테스트할 URI 목록 (e2e scope 전용)
- $$ACCOUNT: 로그인 계정 정보 (e2e scope 전용, ID/PW)
- $$src_path: 소스코드 경로 (unit/integration scope 전용)
- $$unit_scope: unit 테스트 분석 범위 (unit scope 전용)
  - diff: 현재 변경사항 기반 (git diff)
  - full: 전체 소스코드 기반

# References
- $$unit-test = "./references/unit-test.md"
- $$integration-test = "./references/integration-test.md"
- $$e2e-test = "./references/e2e-test.md"

## Subagents
| Name | Scope | Role | Description |
|---|---|---|---|
| test_scenario_unit_analyzer | unit | 코드 분석가 | 소스코드를 분석하여 단위 테스트 시나리오를 도출하는 subagent |
| test_scenario_integration_analyzer | integration | 연동 분석가 | 모듈 간 연동 지점을 분석하여 통합 테스트 시나리오를 도출하는 subagent |
| test_scenario_e2e_analyzer | e2e | 페이지 분석가 | 각 페이지별로 E2E 테스트 시나리오를 도출하는 subagent |
| test_scenario_writer | 공통 | 시나리오 작성가 | 분석 결과를 바탕으로 테스트 시나리오를 출력하는 subagent |

### Constraints for Subagents
- subagent는 서로의 컨텍스트를 공유하지 않는다.
- subagent간 데이터 전달은 반드시 오케스트레이터를 통해 이루어진다.
- 오케스트레이터는 subagent의 결과를 수집하여 다음 단계로 전달하는 역할만 수행한다.

# Error Handling
- $$scope 미제공 → Human에게 재요청, Step 0로 복귀
- analyzer 실패 → 해당 대상 스킵, Human에게 보고 후 나머지 계속 진행
- test_scenario_writer 실패 → Human에게 보고 후 재시도 여부 확인

---
# Action
## Rules
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

## Step 0. Collect Required Info (Human-in-the-Loop)
아래 정보를 모두 확보할 때까지 다음 Step 진행 금지.
- $$scope: 테스트 범위
- $$output_mode: 출력 방식
- scope별 추가 정보:
  - unit: $$src_path, $$unit_scope (diff/full)
  - integration: $$src_path
  - e2e: $$URI_List, $$ACCOUNT.ID, $$ACCOUNT.PW
- 테스트 제외 기능 여부

## Step 1. Make Plan (Human Confirm Required)
수집한 정보를 바탕으로 아래 계획을 수립하고 Human에게 확인받는다.
- scope에 따른 reference 문서 참조
- 분석 대상 목록 및 총 수
- analyzer 실행 계획 (병렬 실행 수)
- 예상 시나리오 총 수
- 출력 방식 확인

## Step 2. 분석 & 시나리오 도출
### scope에 따라 적절한 analyzer subagent를 실행.

### unit scope
- unit_test_analyzer에게 위임
- 전달 정보: $$src_path, $$unit_scope
- $$unit-test reference 참조

### integration scope
- integration_test_analyzer에게 위임
- 전달 정보: $$src_path
- $$integration-test reference 참조

### e2e scope
- $$URI_List의 각 URI에 대하여 e2e_test_page_analyzer를 병렬 실행
- 전달 정보: $$URI, $$ACCOUNT.ID, $$ACCOUNT.PW
- $$e2e-test reference 참조

## Step 3. 결과 수집 & 검증
모든 analyzer의 반환값을 수집하고 아래를 검증한다:
- 각 분석 대상에 대한 결과가 누락 없이 존재하는가
- 시나리오 형식이 올바른가 (TC 형식 준수 여부)
- 누락 또는 형식 오류 발생 시 해당 analyzer만 재실행

## Step 4. Scenario 작성
### test_scenario_writer를 실행시켜 테스트 시나리오 출력.
전달 정보:
```
$$ScenarioList = { analyzer로부터 받은 시나리오 목록 }
$$output_mode = { 출력 방식 }
$$output_target = { 출력 대상 정보 - file path 또는 Notion URL 등 }
```

## Step 5. 재확인 & 보완
- 모든 분석 대상이 처리되었는지 확인.
- 수정사항 발생시, 수정

# Output
- Step별 전체 작업 요약
  - Step0. 수집 정보 요약 (scope, output_mode, 분석 대상 등)
  - Step1. 수립된 계획 요약
  - Step2. analyzer 실행 결과 (scope별 분석 대상 수, 도출 시나리오 수)
  - Step3. 검증 결과 (누락/오류 여부)
  - Step4. 작성 결과 (출력 방식, 출력 위치, 시나리오 총 수)
  - Step5. 보완 사항 (수정 여부, 최종 시나리오 수)
